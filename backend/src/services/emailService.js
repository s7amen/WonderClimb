import { getSettings } from './settingsService.js';
import logger from '../middleware/logging.js';
import { config } from '../config/env.js';

/**
 * Email Service Abstraction
 * Supports multiple email providers (nodemailer, sendgrid, mailgun, etc.)
 * Configuration is stored in Settings model
 */

/**
 * Replace template variables in email content
 */
const replaceTemplateVariables = (template, variables) => {
  let result = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  return result;
};

/**
 * Get email provider implementation
 */
const getEmailProvider = async () => {
  const settings = await getSettings();
  const provider = settings.emailProvider || 'nodemailer';
  const emailConfig = settings.emailConfig || {};

  switch (provider) {
    case 'nodemailer':
      return await getNodemailerProvider(emailConfig);
    case 'sendgrid':
      return await getSendgridProvider(emailConfig);
    case 'mailgun':
      return await getMailgunProvider(emailConfig);
    case 'ses':
      return await getSESProvider(emailConfig);
    default:
      throw new Error(`Unsupported email provider: ${provider}`);
  }
};

/**
 * Nodemailer provider implementation
 */
const getNodemailerProvider = async (emailConfig) => {
  // Dynamic import to avoid requiring nodemailer if not used
  let nodemailer;
  try {
    nodemailer = await import('nodemailer');
  } catch (error) {
    throw new Error('nodemailer package is not installed. Run: npm install nodemailer');
  }

  // Development mode: Use Ethereal Email for testing (auto-generates test account)
  if (config.nodeEnv === 'development' && !emailConfig.host && !process.env.SMTP_HOST) {
    logger.info('Development mode: Creating test email account with Ethereal Email');
    const testAccount = await nodemailer.default.createTestAccount();
    
    const transporter = nodemailer.default.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    return {
      send: async (mailOptions) => {
        const info = await transporter.sendMail(mailOptions);
        const previewUrl = nodemailer.default.getTestMessageUrl(info);
        
        // Log the preview URL so developer can see the email
        logger.info({ 
          previewUrl,
          to: mailOptions.to,
          subject: mailOptions.subject 
        }, '📧 Email sent (Ethereal Email - check preview URL in logs)');
        
        console.log('\n📧 ============================================');
        console.log('📧 EMAIL SENT (Development Mode)');
        console.log('📧 ============================================');
        console.log(`📧 To: ${mailOptions.to}`);
        console.log(`📧 Subject: ${mailOptions.subject}`);
        console.log(`📧 Preview URL: ${previewUrl}`);
        console.log('📧 ============================================\n');
        
        return info;
      },
    };
  }

  const transporter = nodemailer.default.createTransport({
    host: emailConfig.host || process.env.SMTP_HOST,
    port: emailConfig.port || process.env.SMTP_PORT || 587,
    secure: emailConfig.secure || false,
    auth: {
      user: emailConfig.user || process.env.SMTP_USER,
      pass: emailConfig.password || process.env.SMTP_PASSWORD,
    },
    ...emailConfig.options,
  });

  return {
    send: async (mailOptions) => {
      return await transporter.sendMail(mailOptions);
    },
  };
};

/**
 * SendGrid provider implementation
 */
const getSendgridProvider = async (emailConfig) => {
  let sgMail;
  try {
    sgMail = await import('@sendgrid/mail');
  } catch (error) {
    throw new Error('@sendgrid/mail package is not installed. Run: npm install @sendgrid/mail');
  }

  const apiKey = emailConfig.apiKey || process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SendGrid API key is required');
  }

  sgMail.default.setApiKey(apiKey);

  return {
    send: async (mailOptions) => {
      return await sgMail.default.send({
        to: mailOptions.to,
        from: mailOptions.from,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html,
      });
    },
  };
};

/**
 * Mailgun provider implementation
 */
const getMailgunProvider = async (emailConfig) => {
  let formData;
  let Mailgun;
  try {
    formData = await import('form-data');
    Mailgun = await import('mailgun.js');
  } catch (error) {
    throw new Error('mailgun.js and form-data packages are not installed. Run: npm install mailgun.js form-data');
  }

  const apiKey = emailConfig.apiKey || process.env.MAILGUN_API_KEY;
  const domain = emailConfig.domain || process.env.MAILGUN_DOMAIN;

  if (!apiKey || !domain) {
    throw new Error('Mailgun API key and domain are required');
  }

  const mg = new Mailgun.default(formData.default);
  const client = mg.client({
    username: 'api',
    key: apiKey,
  });

  return {
    send: async (mailOptions) => {
      const messageData = {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html,
      };

      return await client.messages.create(domain, messageData);
    },
  };
};

/**
 * AWS SES provider implementation
 */
const getSESProvider = async (emailConfig) => {
  let AWS;
  try {
    AWS = await import('aws-sdk');
  } catch (error) {
    throw new Error('aws-sdk package is not installed. Run: npm install aws-sdk');
  }

  const ses = new AWS.SES({
    region: emailConfig.region || process.env.AWS_REGION || 'us-east-1',
    accessKeyId: emailConfig.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: emailConfig.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
  });

  return {
    send: async (mailOptions) => {
      const params = {
        Source: mailOptions.from,
        Destination: {
          ToAddresses: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
        },
        Message: {
          Subject: {
            Data: mailOptions.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: mailOptions.html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: mailOptions.text,
              Charset: 'UTF-8',
            },
          },
        },
      };

      return await ses.sendEmail(params).promise();
    },
  };
};

/**
 * Send email using configured provider
 */
export const sendEmail = async (to, subject, html, text = null) => {
  try {
    const settings = await getSettings();
    const fromName = settings.emailFromName || 'WonderClimb';
    const fromAddress = settings.emailFromAddress || process.env.EMAIL_FROM || 'noreply@wonderclimb.com';
    const from = fromAddress.includes('@') ? `${fromName} <${fromAddress}>` : fromAddress;

    const provider = await getEmailProvider();

    const mailOptions = {
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
    };

    const result = await provider.send(mailOptions);
    logger.info({ to, subject, provider: settings.emailProvider }, 'Email sent successfully');
    return result;
  } catch (error) {
    logger.error({ error: error.message, to, subject }, 'Failed to send email');
    throw error;
  }
};

/**
 * Send activation email
 */
export const sendActivationEmail = async (user, activationToken) => {
  try {
    const settings = await getSettings();

    if (!settings.sendActivationEmail) {
      logger.info({ userId: user._id }, 'Activation email sending is disabled in settings');
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const activationLink = `${frontendUrl}/activate?token=${activationToken.token}`;
    const appName = settings.emailFromName || 'WonderClimb';
    const expiryHours = settings.activationTokenExpiryHours || 48;

    const variables = {
      firstName: user.firstName,
      lastName: user.lastName,
      activationLink,
      appName,
      expiryHours: expiryHours.toString(),
    };

    const subject = replaceTemplateVariables(
      settings.activationEmailSubject || 'Активиране на акаунт - {appName}',
      variables
    );

    const html = replaceTemplateVariables(
      settings.activationEmailTemplate || '',
      variables
    );

    // In development mode, also log the activation link to console
    if (config.nodeEnv === 'development') {
      console.log('\n🔗 ============================================');
      console.log('🔗 ACTIVATION LINK (Development Mode)');
      console.log('🔗 ============================================');
      console.log(`🔗 User: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`🔗 Activation Link: ${activationLink}`);
      console.log(`🔗 Token expires in: ${expiryHours} hours`);
      console.log('🔗 ============================================\n');
    }

    await sendEmail(user.email, subject, html);
    logger.info({ userId: user._id, email: user.email, activationLink }, 'Activation email sent');
  } catch (error) {
    logger.error({ error: error.message, userId: user._id }, 'Failed to send activation email');
    
    // In development, still log the activation link even if email fails
    if (config.nodeEnv === 'development') {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const activationLink = `${frontendUrl}/activate?token=${activationToken.token}`;
      console.log('\n⚠️  Email sending failed, but here is the activation link:');
      console.log(`🔗 ${activationLink}\n`);
    }
    
    throw error;
  }
};

