import { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.jsx';

const TrainingSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    bookingHorizonHours: 720,
    cancellationWindowHours: 4,
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
      
      // Set defaults if not present
      const trainingSettings = {
        bookingHorizonHours: loadedSettings.bookingHorizonHours ?? 720,
        cancellationWindowHours: loadedSettings.cancellationWindowHours ?? 4,
      };
      
      setSettings(trainingSettings);
      setInitialSettings(JSON.stringify(trainingSettings));
    } catch (error) {
      showToast('Грешка при зареждане на настройки', 'error');
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      return; // Don't update if invalid
    }
    
    setSettings(prev => ({
      ...prev,
      [key]: numValue,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate values
      if (settings.bookingHorizonHours < 0) {
        showToast('Периодът за резервация не може да е отрицателен', 'error');
        return;
      }
      
      if (settings.cancellationWindowHours < 0) {
        showToast('Периодът за отмяна не може да е отрицателен', 'error');
        return;
      }
      
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
    <div className="space-y-6">
      <Card title="Настройки за резервации на тренировки">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-950 mb-2">
              Минимален период преди резервация (часове)
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Колко часа преди началото на тренировката не може да се прави резервация.
              Например, ако е зададено 4 часа, потребителите не могат да се записват за тренировки, които започват след по-малко от 4 часа. Тренировки, които започват след 4 или повече часа, могат да бъдат резервирани.
            </p>
            <input
              type="number"
              min="0"
              value={settings.bookingHorizonHours || ''}
              onChange={(e) => handleChange('bookingHorizonHours', e.target.value)}
              className="w-full max-w-xs px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
            />
            <p className="mt-2 text-xs text-gray-500">
              Минимална стойност: 0 часа (резервация до последния момент)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-950 mb-2">
              Период за отмяна (часове)
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Колко часа преди началото на тренировката може да се отменя резервация.
              Например, ако е зададено 4 часа, потребителите могат да отменят резервация до 4 часа преди началото на тренировката.
            </p>
            <input
              type="number"
              min="0"
              value={settings.cancellationWindowHours || ''}
              onChange={(e) => handleChange('cancellationWindowHours', e.target.value)}
              className="w-full max-w-xs px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
            />
            <p className="mt-2 text-xs text-gray-500">
              Минимална стойност: 0 часа (отмяна до последния момент)
            </p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} variant="primary">
          {saving ? 'Запазване...' : 'Запази промените'}
        </Button>
      </div>

      <UnsavedChangesModal />
    </div>
  );
};

export default TrainingSettings;

