import { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.jsx';

const MessageSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
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

  // Group messages by category
  const messageCategories = {
    'Отмяна на резервации': [
      { key: 'cancellationPeriodExpired', label: 'cancellationPeriodExpired' },
      { key: 'bookingAlreadyCancelled', label: 'bookingAlreadyCancelled' },
      { key: 'cannotCancelOwnBookings', label: 'cannotCancelOwnBookings' },
    ],
    'Резервации': [
      { key: 'bookingNotFound', label: 'bookingNotFound' },
      { key: 'alreadyRegistered', label: 'alreadyRegistered' },
    ],
    'Сесии': [
      { key: 'sessionNotFound', label: 'sessionNotFound' },
      { key: 'sessionNotActive', label: 'sessionNotActive' },
      { key: 'sessionFull', label: 'sessionFull' },
      { key: 'sessionOutsideBookingHorizon', label: 'sessionOutsideBookingHorizon' },
      { key: 'cannotBookPastSessions', label: 'cannotBookPastSessions' },
      { key: 'cannotReduceCapacity', label: 'cannotReduceCapacity' },
      { key: 'atLeastOneDayRequired', label: 'atLeastOneDayRequired' },
      { key: 'noValidSessions', label: 'noValidSessions' },
      { key: 'invalidPayoutStatus', label: 'invalidPayoutStatus' },
    ],
    'Катерачи': [
      { key: 'climberNotFound', label: 'climberNotFound' },
      { key: 'climberCanOnlyBookForSelf', label: 'climberCanOnlyBookForSelf' },
      { key: 'userMustHaveClimberRole', label: 'userMustHaveClimberRole' },
    ],
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getSettings();
      const loadedSettings = response.data.settings || {};
      setSettings(loadedSettings);
      setInitialSettings(JSON.stringify(loadedSettings));
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

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateSettings(settings);
      setInitialSettings(JSON.stringify(settings)); // Update initial state after save
      showToast('Настройките са запазени успешно', 'success');
    } catch (error) {
      showToast('Грешка при запазване на настройки', 'error');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading text="Зареждане на настройки..." />;
  }

  return (
    <div className="space-y-6"><div className="space-y-6">
        {Object.entries(messageCategories).map(([category, messages]) => (
          <Card key={category} title={category}>
            <div className="space-y-4">
              {messages.map(({ key, label }) => (
                <div key={key} className="mb-4">
                  <label className="block text-sm font-medium text-neutral-950 mb-2">
                    {key}
                  </label>
                  <input
                    type="text"
                    value={settings[key] || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={settings[key] || `Enter message for ${key}`}
                    className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 placeholder:text-[#99a1af]"
                  />
                  {key === 'cannotReduceCapacity' && (
                    <p className="mt-1 text-xs text-gray-500">
                      Използвайте {'{count}'} като placeholder за броя резервации
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
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

export default MessageSettings;

