import { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import Input from '../../components/UI/Input';
import Checkbox from '../../components/UI/Checkbox';
import { useToast } from '../../components/UI/Toast';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.jsx';

// Simple UUID generator for frontend content
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const TrainingSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'filters'

  const [settings, setSettings] = useState({
    bookingHorizonHours: 720,
    cancellationWindowHours: 4,
    // Dynamic settings
    trainingLabels: {
      targetGroups: [], // { id, slug, label, color }
      ageGroups: [],    // { id, label, from, to }
      visibility: {
        targetGroups: true,
        ageGroups: true,
        days: true,
        times: true,
        titles: true,
        reservations: true
      },
    }
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
        trainingLabels: {
          targetGroups: loadedSettings.trainingLabels?.targetGroups || [],
          ageGroups: loadedSettings.trainingLabels?.ageGroups || [],
          visibility: {
            targetGroups: loadedSettings.trainingLabels?.visibility?.targetGroups ?? true,
            ageGroups: loadedSettings.trainingLabels?.visibility?.ageGroups ?? true,
            days: loadedSettings.trainingLabels?.visibility?.days ?? true,
            times: loadedSettings.trainingLabels?.visibility?.times ?? true,
            titles: loadedSettings.trainingLabels?.visibility?.titles ?? true,
            reservations: loadedSettings.trainingLabels?.visibility?.reservations ?? true,
          }
        }
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

  // Filter Management Functions
  const addTargetGroup = () => {
    setSettings(prev => ({
      ...prev,
      trainingLabels: {
        ...prev.trainingLabels,
        targetGroups: [
          ...prev.trainingLabels.targetGroups,
          { id: generateId(), slug: '', label: '', color: '#3b82f6' }
        ]
      }
    }));
  };

  const updateTargetGroup = (index, field, value) => {
    setSettings(prev => {
      const newGroups = [...prev.trainingLabels.targetGroups];
      newGroups[index] = { ...newGroups[index], [field]: value };
      return {
        ...prev,
        trainingLabels: {
          ...prev.trainingLabels,
          targetGroups: newGroups
        }
      };
    });
  };

  const removeTargetGroup = (index) => {
    setSettings(prev => {
      const newGroups = [...prev.trainingLabels.targetGroups];
      newGroups.splice(index, 1);
      return {
        ...prev,
        trainingLabels: {
          ...prev.trainingLabels,
          targetGroups: newGroups
        }
      };
    });
  };

  const addAgeGroup = () => {
    setSettings(prev => ({
      ...prev,
      trainingLabels: {
        ...prev.trainingLabels,
        ageGroups: [
          ...prev.trainingLabels.ageGroups,
          { id: generateId(), from: '', to: '' }
        ]
      }
    }));
  };

  const updateAgeGroup = (index, field, value) => {
    setSettings(prev => {
      const newGroups = [...prev.trainingLabels.ageGroups];
      const newGroup = { ...newGroups[index], [field]: value };

      // Auto-generate label if both from and to are numbers
      if (field === 'from' || field === 'to') {
        const from = field === 'from' ? value : newGroup.from;
        const to = field === 'to' ? value : newGroup.to;
        if (from && to) {
          newGroup.label = `${from}-${to}`;
        } else if (from) {
          newGroup.label = `${from}+`;
        }
      }

      newGroups[index] = newGroup;

      return {
        ...prev,
        trainingLabels: {
          ...prev.trainingLabels,
          ageGroups: newGroups
        }
      };
    });
  };

  const removeAgeGroup = (index) => {
    setSettings(prev => {
      const newGroups = [...prev.trainingLabels.ageGroups];
      newGroups.splice(index, 1);
      return {
        ...prev,
        trainingLabels: {
          ...prev.trainingLabels,
          ageGroups: newGroups
        }
      };
    });
  };

  const updateVisibility = (field, value) => {
    setSettings(prev => ({
      ...prev,
      trainingLabels: {
        ...prev.trainingLabels,
        visibility: {
          ...prev.trainingLabels.visibility,
          [field]: value
        }
      }
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

      // Validate duplicate slugs
      const slugs = settings.trainingLabels.targetGroups.map(g => g.slug).filter(Boolean);
      if (new Set(slugs).size !== slugs.length) {
        showToast('Имате повтарящи се кодове (slugs) за нивата', 'error');
        return;
      }

      await settingsAPI.updateSettings(settings);
      setInitialSettings(JSON.stringify(settings)); // Update initial state after save
      
      // Invalidate training labels cache so other pages fetch fresh data
      localStorage.removeItem('wonderclimb-training-labels');
      
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
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'general'
                ? 'border-orange-brand text-orange-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Общи
          </button>
          <button
            onClick={() => setActiveTab('filters')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'filters'
                ? 'border-orange-brand text-orange-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Филтри
          </button>
        </nav>
      </div>

      {activeTab === 'general' && (
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
      )}

      {activeTab === 'filters' && (
        <Card title="Настройки на филтри и етикети">
          <div className="space-y-8">
            {/* Visibility Settings */}
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">Видимост на филтрите</h3>
                <p className="text-sm text-gray-500">Изберете кои филтри да се показват в страницата с графика.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Checkbox
                  checked={settings.trainingLabels.visibility?.days ?? true}
                  onChange={(e) => updateVisibility('days', e.target.checked)}
                  label="Ден"
                />
                <Checkbox
                  checked={settings.trainingLabels.visibility?.times ?? true}
                  onChange={(e) => updateVisibility('times', e.target.checked)}
                  label="Час"
                />
                <Checkbox
                  checked={settings.trainingLabels.visibility?.titles ?? true}
                  onChange={(e) => updateVisibility('titles', e.target.checked)}
                  label="Тренировка"
                />
                <Checkbox
                  checked={settings.trainingLabels.visibility?.reservations ?? true}
                  onChange={(e) => updateVisibility('reservations', e.target.checked)}
                  label="Тренировка за (Резервация)"
                />
                <Checkbox
                  checked={settings.trainingLabels.visibility?.targetGroups ?? true}
                  onChange={(e) => updateVisibility('targetGroups', e.target.checked)}
                  label="Подходящо за"
                />
                <Checkbox
                  checked={settings.trainingLabels.visibility?.ageGroups ?? true}
                  onChange={(e) => updateVisibility('ageGroups', e.target.checked)}
                  label="Възрастови групи"
                />
              </div>
            </div>

            <hr />

            {/* Suitable For Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Подходящо за</h3>
                  <p className="text-sm text-gray-500">Настройте нивата на трудност или групите, за които са подходящи тренировките.</p>
                </div>
                <Button onClick={addTargetGroup} variant="secondary" size="sm">
                  + Добави ниво
                </Button>
              </div>

              <div className="space-y-3">
                {settings.trainingLabels.targetGroups.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Няма добавени нива.</p>
                ) : (
                  settings.trainingLabels.targetGroups.map((group, index) => (
                    <div key={group.id || index} className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Етикет (БГ)</label>
                        <Input
                          value={group.label}
                          onChange={(e) => updateTargetGroup(index, 'label', e.target.value)}
                          placeholder="Напр. Начинаещи"
                          className="bg-white"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Slug (ID - Английски)</label>
                        <Input
                          value={group.slug}
                          onChange={(e) => updateTargetGroup(index, 'slug', e.target.value)}
                          placeholder="Напр. beginner"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Цвят</label>
                        <div className="h-[42px] flex items-center gap-2">
                          <input
                            type="color"
                            value={group.color || '#3b82f6'}
                            onChange={(e) => updateTargetGroup(index, 'color', e.target.value)}
                            className="h-10 w-12 p-1 bg-white border border-gray-300 rounded cursor-pointer"
                          />
                          <Input
                            value={group.color || '#3b82f6'}
                            onChange={(e) => updateTargetGroup(index, 'color', e.target.value)}
                            placeholder="#000000"
                            className="bg-white w-24"
                          />
                        </div>
                      </div>
                      <div className="pb-1">
                        <button
                          onClick={() => removeTargetGroup(index)}
                          className="text-red-600 hover:text-red-800 p-2"
                          title="Изтрий"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <hr />

            {/* Age Groups Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Възрастови групи</h3>
                  <p className="text-sm text-gray-500">Настройте диапазоните години за филтриране.</p>
                </div>
                <Button onClick={addAgeGroup} variant="secondary" size="sm">
                  + Добави група
                </Button>
              </div>

              <div className="space-y-3">
                {settings.trainingLabels.ageGroups.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Няма добавени възрастови групи.</p>
                ) : (
                  settings.trainingLabels.ageGroups.map((group, index) => (
                    <div key={group.id || index} className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="w-24">
                        <label className="block text-xs font-medium text-gray-700 mb-1">От (г.)</label>
                        <Input
                          type="number"
                          value={group.from}
                          onChange={(e) => updateAgeGroup(index, 'from', e.target.value)}
                          className="bg-white"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-medium text-gray-700 mb-1">До (г.)</label>
                        <Input
                          type="number"
                          value={group.to}
                          onChange={(e) => updateAgeGroup(index, 'to', e.target.value)}
                          className="bg-white"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Етикет (автоматичен)</label>
                        <Input
                          value={group.label}
                          readOnly
                          className="bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                      <div className="pb-1">
                        <button
                          onClick={() => removeAgeGroup(index)}
                          className="text-red-600 hover:text-red-800 p-2"
                          title="Изтрий"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

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
