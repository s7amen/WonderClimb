import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sessionsAPI, adminUsersAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Loading from '../../components/UI/Loading';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import { useToast } from '../../components/UI/Toast';

const InstructorDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [coaches, setCoaches] = useState([]);
  const { showToast, ToastComponent } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    durationMinutes: 60,
    capacity: 10,
    coachIds: [],
  });

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    try {
      const response = await adminUsersAPI.getCoaches();
      setCoaches(response.data.users || []);
    } catch (error) {
      console.error('Error loading coaches:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.date || !formData.time) {
      showToast('Моля, попълнете всички задължителни полета', 'error');
      return;
    }

    try {
      setLoading(true);
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      
      const sessionData = {
        title: formData.title,
        description: formData.description || '',
        date: dateTime.toISOString(),
        durationMinutes: parseInt(formData.durationMinutes),
        capacity: parseInt(formData.capacity),
        coachIds: formData.coachIds,
      };

      await sessionsAPI.create(sessionData);
      showToast('Тренировката е създадена успешно', 'success');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        durationMinutes: 60,
        capacity: 10,
        coachIds: [],
      });
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Грешка при създаване на тренировка', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleCoach = (coachId) => {
    setFormData({
      ...formData,
      coachIds: formData.coachIds.includes(coachId)
        ? formData.coachIds.filter(id => id !== coachId)
        : [...formData.coachIds, coachId],
    });
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-950">Табло за инструктор</h1>
      </div>

      <ToastComponent />

      {/* Create New Training Form */}
      <Card>
        <div className="border-b border-gray-200 px-6 py-6">
          <h2 className="text-base font-medium text-neutral-950 mb-1">Нова тренировка</h2>
          <p className="text-sm" style={{ color: '#4a5565' }}>Създайте нова тренировъчна сесия</p>
        </div>
        <div className="px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Заглавие"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Напр. Ранна сутрешна тренировка"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Дата"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                min={getTodayDate()}
              />
              <Input
                label="Час"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Продължителност (минути)"
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                required
                min="1"
              />
              <Input
                label="Капацитет"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание (опционално)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500"
                rows={3}
                placeholder="Описание на тренировката..."
              />
            </div>

            {coaches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Треньори (опционално)
                </label>
                <div className="space-y-2">
                  {coaches.map((coach) => (
                    <label key={coach._id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.coachIds.includes(coach._id)}
                        onChange={() => toggleCoach(coach._id)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">
                        {coach.firstName} {coach.lastName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Създаване...' : 'Създай тренировка'}
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/admin/climbers">
          <Card>
            <div className="p-6 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="bg-[#ea7a24] rounded-[10px] w-12 h-12 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-950 mb-1">
                  Катерачи
                </h3>
                <p className="text-xs text-[#4a5565]">
                  Преглед и управление на катерачи
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/my-sessions">
          <Card>
            <div className="p-6 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="bg-[#35383d] rounded-[10px] w-12 h-12 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-950 mb-1">
                  Моят график
                </h3>
                <p className="text-xs text-[#4a5565]">
                  Преглед на моите резервации
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default InstructorDashboard;
