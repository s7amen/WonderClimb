import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  instructorOpenRate: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  instructorAssistantOpenRate: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  gymInitialBalance: {
    type: Number,
    default: 0,
  },
  trainingInitialBalance: {
    type: Number,
    default: 0,
  },
  // Message fields for user-facing error messages
  sessionNotFound: {
    type: String,
    default: 'Тренировката не е намерена',
  },
  sessionNotActive: {
    type: String,
    default: 'Тренировката не е активна',
  },
  sessionOutsideBookingHorizon: {
    type: String,
    default: 'Не можете да се запишете за тренировка, която започва след по-малко от минималния период',
  },
  cannotBookPastSessions: {
    type: String,
    default: 'Не можете да се запишете за минали тренировки',
  },
  climberNotFound: {
    type: String,
    default: 'Катерачът не е намерен',
  },
  climberCanOnlyBookForSelf: {
    type: String,
    default: 'Можете да правите записвания само за себе си и свързаните деца',
  },
  userMustHaveClimberRole: {
    type: String,
    default: 'Потребителят трябва да има роля "катерач"',
  },
  alreadyRegistered: {
    type: String,
    default: 'Вече сте записани за тази тренировка',
  },
  sessionFull: {
    type: String,
    default: 'Тренировката е пълна',
  },
  bookingNotFound: {
    type: String,
    default: 'Записването не е намерено',
  },
  bookingAlreadyCancelled: {
    type: String,
    default: 'Записването вече е отменено',
  },
  cannotCancelOwnBookings: {
    type: String,
    default: 'Можете да отменяте само собствени записвания',
  },
  cancellationPeriodExpired: {
    type: String,
    default: 'Периодът за отмяна е изтекъл',
  },
  // Physical card messages
  physicalCardAlreadyLinkedSameUser: {
    type: String,
    default: 'Картата {cardCode} е заета от същия клиент до {validUntil}. Можете да я добавите в опашка.',
  },
  physicalCardAlreadyLinkedDifferentUser: {
    type: String,
    default: 'Картата {cardCode} е заета от {clientName} до {validUntil}. Не може да се използва за друг клиент.',
  },
  // Training booking configuration
  bookingHorizonHours: {
    type: Number,
    required: true,
    min: 0,
    default: 720, // 30 days * 24 hours = 720 hours (default)
  },
  cancellationWindowHours: {
    type: Number,
    required: true,
    min: 0,
    default: 4,
  },
  // Email configuration
  emailProvider: {
    type: String,
    enum: ['nodemailer', 'sendgrid', 'mailgun', 'ses', 'other'],
    default: 'nodemailer',
  },
  emailConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  sendActivationEmail: {
    type: Boolean,
    default: false,
  },
  activationEmailTemplate: {
    type: String,
    default: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Активиране на акаунт</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #ea7a24;">Активиране на акаунт</h1>
    <p>Здравейте {firstName} {lastName},</p>
    <p>Благодарим ви за регистрацията в {appName}!</p>
    <p>Моля, кликнете на линка по-долу, за да активирате акаунта си:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{activationLink}" style="background-color: #ea7a24; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Активирай акаунт</a>
    </p>
    <p>Този линк ще остане валиден за {expiryHours} часа.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <h3 style="color: #666;">Как да предотвратим спам филтъра?</h3>
    <p>За да гарантираме, че получавате нашите имейли:</p>
    <ul>
      <li>Добавете нашия имейл адрес в контактите си</li>
      <li>Маркирайте този имейл като "Не е спам"</li>
      <li>Проверете настройките за SPF/DKIM на вашия имейл провайдър</li>
    </ul>
    <p style="text-align: center; margin-top: 30px;">
      <a href="{activationLink}?markSafe=true" style="color: #ea7a24; text-decoration: none;">Маркирай като безопасен</a>
    </p>
    <p style="margin-top: 30px; font-size: 12px; color: #999;">
      Ако не сте се регистрирали, моля игнорирайте този имейл.
    </p>
  </div>
</body>
</html>`,
  },
  activationEmailSubject: {
    type: String,
    default: 'Активиране на акаунт - {appName}',
  },
  activationTokenExpiryHours: {
    type: Number,
    required: true,
    min: 1,
    default: 48,
  },
  emailFromName: {
    type: String,
    default: 'WonderClimb',
  },
  emailFromAddress: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

export const Settings = mongoose.model('Settings', settingsSchema);








