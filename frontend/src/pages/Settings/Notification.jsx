import { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.jsx';

const NotificationSettings = () => {
  const [activeTab, setActiveTab] = useState('provider'); // 'provider' or 'activation'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    sendActivationEmail: false,
    activationEmailTemplate: '',
    activationEmailSubject: '',
    activationTokenExpiryHours: 48,
    emailProvider: 'nodemailer',
    emailConfig: {},
    emailFromName: 'WonderClimb',
    emailFromAddress: '',
  });
  const [initialSettings, setInitialSettings] = useState(null);
  const { showToast } = useToast();

  // Unsaved changes warning
  const hasChanges = () => {
    if (!initialSettings) return false;
    return JSON.stringify(settings) !== initialSettings;
  };

  const { UnsavedChangesModal } = useUnsavedChangesWarning({
    hasChanges,
    message: "Имате незапазени промени в настройките. Сигурни ли сте, че искате да напуснете без да ги запазите?"
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getSettings();
      const loadedSettings = response.data.settings || {};
      setSettings({
        sendActivationEmail: loadedSettings.sendActivationEmail || false,
        activationEmailTemplate: loadedSettings.activationEmailTemplate || '',
        activationEmailSubject: loadedSettings.activationEmailSubject || 'Активиране на акаунт - {appName}',
        activationTokenExpiryHours: loadedSettings.activationTokenExpiryHours || 48,
        emailProvider: loadedSettings.emailProvider || 'nodemailer',
        emailConfig: loadedSettings.emailConfig || {},
        emailFromName: loadedSettings.emailFromName || 'WonderClimb',
        emailFromAddress: loadedSettings.emailFromAddress || '',
      });
      setInitialSettings(JSON.stringify({
        sendActivationEmail: loadedSettings.sendActivationEmail || false,
        activationEmailTemplate: loadedSettings.activationEmailTemplate || '',
        activationEmailSubject: loadedSettings.activationEmailSubject || 'Активиране на акаунт - {appName}',
        activationTokenExpiryHours: loadedSettings.activationTokenExpiryHours || 48,
        emailProvider: loadedSettings.emailProvider || 'nodemailer',
        emailConfig: loadedSettings.emailConfig || {},
        emailFromName: loadedSettings.emailFromName || 'WonderClimb',
        emailFromAddress: loadedSettings.emailFromAddress || '',
      }));
    } catch (error) {
      showToast('Грешка при зареждане на настройки', 'error');
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleEmailConfigChange = (configKey, value) => {
    setSettings(prev => ({
      ...prev,
      emailConfig: {
        ...prev.emailConfig,
        [configKey]: value,
      },
    }));
  };

  const getEmailProviderConfigFields = () => {
    const provider = settings.emailProvider || 'nodemailer';
    
    switch (provider) {
      case 'nodemailer':
        return [
          { key: 'host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
          { key: 'port', label: 'SMTP Port', type: 'number', placeholder: '587' },
          { key: 'secure', label: 'Secure (TLS)', type: 'checkbox' },
          { key: 'user', label: 'SMTP User', type: 'text', placeholder: 'your-email@gmail.com' },
          { key: 'password', label: 'SMTP Password', type: 'password', placeholder: 'Your app password' },
        ];
      case 'sendgrid':
        return [
          { key: 'apiKey', label: 'SendGrid API Key', type: 'text', placeholder: 'SG.xxxxxxxxxxxxx' },
        ];
      case 'mailgun':
        return [
          { key: 'apiKey', label: 'Mailgun API Key', type: 'text', placeholder: 'key-xxxxxxxxxxxxx' },
          { key: 'domain', label: 'Mailgun Domain', type: 'text', placeholder: 'mg.yourdomain.com' },
        ];
      case 'ses':
        return [
          { key: 'region', label: 'AWS Region', type: 'text', placeholder: 'us-east-1' },
          { key: 'accessKeyId', label: 'AWS Access Key ID', type: 'text', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
          { key: 'secretAccessKey', label: 'AWS Secret Access Key', type: 'password', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
        ];
      default:
        return [];
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateSettings(settings);
      setInitialSettings(JSON.stringify(settings));
      showToast('Настройките са запазени успешно', 'success');
    } catch (error) {
      showToast('Грешка при запазване на настройки', 'error');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const previewTemplate = () => {
    const template = settings.activationEmailTemplate || '';
    return template
      .replace(/{firstName}/g, 'Иван')
      .replace(/{lastName}/g, 'Петров')
      .replace(/{activationLink}/g, 'https://example.com/activate?token=example123')
      .replace(/{appName}/g, 'WonderClimb')
      .replace(/{expiryHours}/g, settings.activationTokenExpiryHours?.toString() || '48');
  };

  if (loading) {
    return <Loading text="Зареждане на настройки..." />;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('provider')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'provider'
                ? 'border-[#ea7a24] text-[#ea7a24]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Email Provider Settings
          </button>
          <button
            onClick={() => setActiveTab('activation')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'activation'
                ? 'border-[#ea7a24] text-[#ea7a24]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Activation Email
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'provider' && (
          <Card title="Email Provider настройки">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-950 mb-2">
                  Email Provider
                </label>
                <select
                  value={settings.emailProvider}
                  onChange={(e) => handleChange('emailProvider', e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                >
                  <option value="nodemailer">Nodemailer (SMTP)</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="mailgun">Mailgun</option>
                  <option value="ses">AWS SES</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Изберете email провайдър. Можете да променяте провайдъра по всяко време.
                </p>
              </div>

              {/* Provider-specific config fields */}
              {getEmailProviderConfigFields().map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-neutral-950 mb-2">
                    {field.label}
                  </label>
                  {field.type === 'checkbox' ? (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.emailConfig[field.key] || false}
                        onChange={(e) => handleEmailConfigChange(field.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ea7a24]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ea7a24]"></div>
                    </label>
                  ) : (
                    <input
                      type={field.type}
                      value={settings.emailConfig[field.key] || ''}
                      onChange={(e) => handleEmailConfigChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 placeholder:text-[#99a1af]"
                    />
                  )}
                </div>
              ))}

              {/* From Name and Address */}
              <div>
                <label className="block text-sm font-medium text-neutral-950 mb-2">
                  От име (From Name)
                </label>
                <input
                  type="text"
                  value={settings.emailFromName}
                  onChange={(e) => handleChange('emailFromName', e.target.value)}
                  placeholder="WonderClimb"
                  className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 placeholder:text-[#99a1af]"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Името, което ще се показва като изпращач на имейлите
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-950 mb-2">
                  От адрес (From Address)
                </label>
                <input
                  type="email"
                  value={settings.emailFromAddress}
                  onChange={(e) => handleChange('emailFromAddress', e.target.value)}
                  placeholder="noreply@wonderclimb.com"
                  className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 placeholder:text-[#99a1af]"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Имейл адресът, от който ще се изпращат имейлите
                </p>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'activation' && (
          <Card title="Настройки за activation email">
        <div className="space-y-6">
          {/* Toggle for send activation email */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-neutral-950 mb-1">
                Изпращане на activation email
              </label>
              <p className="text-sm text-gray-500">
                Когато е активирано, новите потребители ще получат имейл за активиране на акаунта си
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sendActivationEmail}
                onChange={(e) => handleChange('sendActivationEmail', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ea7a24]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ea7a24]"></div>
            </label>
          </div>

          {/* Token expiry hours */}
          <div>
            <label className="block text-sm font-medium text-neutral-950 mb-2">
              Валидност на activation token (часове)
            </label>
            <input
              type="number"
              min="1"
              value={settings.activationTokenExpiryHours}
              onChange={(e) => handleChange('activationTokenExpiryHours', parseInt(e.target.value) || 48)}
              className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
            />
            <p className="mt-1 text-xs text-gray-500">
              Броят часове, за които activation token ще остане валиден
            </p>
          </div>

          {/* Email subject */}
          <div>
            <label className="block text-sm font-medium text-neutral-950 mb-2">
              Тема на имейла
            </label>
            <input
              type="text"
              value={settings.activationEmailSubject}
              onChange={(e) => handleChange('activationEmailSubject', e.target.value)}
              placeholder="Активиране на акаунт - {appName}"
              className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 placeholder:text-[#99a1af]"
            />
            <p className="mt-1 text-xs text-gray-500">
              Използвайте {'{appName}'} като placeholder за името на приложението
            </p>
          </div>

          {/* Email template */}
          <div>
            <label className="block text-sm font-medium text-neutral-950 mb-2">
              Email темплейт (HTML)
            </label>
            <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-[10px]">
              <p className="text-xs font-medium text-blue-900 mb-1">Налични променливи:</p>
              <div className="text-xs text-blue-700 space-y-1">
                <div><code className="bg-blue-100 px-1 rounded">{'{firstName}'}</code> - Първо име</div>
                <div><code className="bg-blue-100 px-1 rounded">{'{lastName}'}</code> - Фамилия</div>
                <div><code className="bg-blue-100 px-1 rounded">{'{activationLink}'}</code> - Линк за активиране</div>
                <div><code className="bg-blue-100 px-1 rounded">{'{appName}'}</code> - Име на приложението</div>
                <div><code className="bg-blue-100 px-1 rounded">{'{expiryHours}'}</code> - Часове до изтичане</div>
              </div>
            </div>
            <textarea
              value={settings.activationEmailTemplate}
              onChange={(e) => handleChange('activationEmailTemplate', e.target.value)}
              rows={15}
              className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 font-mono"
              placeholder="Въведете HTML темплейт за activation email..."
            />
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-neutral-950 mb-2">
              Преглед на темплейта
            </label>
            <div className="border border-[#d1d5dc] rounded-[10px] p-4 bg-white">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewTemplate() }}
              />
            </div>
          </div>
        </div>
      </Card>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} variant="primary">
          {saving ? 'Запазване...' : 'Запази промените'}
        </Button>
      </div>

      <UnsavedChangesModal />
    </div>
  );
};

export default NotificationSettings;

