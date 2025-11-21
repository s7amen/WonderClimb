import { useState, useEffect } from 'react';
import { parentClimbersAPI } from '../../services/api';
import { format } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';

const Children = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const { showToast, ToastComponent } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    notes: '',
  });

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await parentClimbersAPI.getAll();
      setChildren(response.data.climbers || []);
    } catch (error) {
      showToast('Грешка при зареждане на деца', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const childData = {
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
        notes: formData.notes,
      };

      if (editingChild) {
        await parentClimbersAPI.update(editingChild._id, childData);
        showToast('Детето е обновено успешно', 'success');
      } else {
        await parentClimbersAPI.create(childData);
        showToast('Детето е добавено успешно', 'success');
      }

      resetForm();
      fetchChildren();
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Грешка при запазване на дете', 'error');
    }
  };

  const handleEdit = (child) => {
    setFormData({
      firstName: child.firstName,
      middleName: child.middleName || '',
      lastName: child.lastName,
      dateOfBirth: child.dateOfBirth ? format(new Date(child.dateOfBirth), 'yyyy-MM-dd') : '',
      notes: child.notes || '',
    });
    setEditingChild(child);
    setShowForm(true);
  };

  const handleDelete = async (childId) => {
    if (!window.confirm('Сигурни ли сте, че искате да изтриете това дете? Това действие не може да бъде отменено.')) {
      return;
    }

    try {
      await parentClimbersAPI.deactivate(childId);
      showToast('Детето е изтрито успешно', 'success');
      fetchChildren();
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Грешка при изтриване на дете';
      showToast(errorMessage, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      notes: '',
    });
    setEditingChild(null);
    setShowForm(false);
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return <Loading text="Зареждане на деца..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Моите деца</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Отказ' : 'Добави дете'}
        </Button>
      </div>

      <ToastComponent />

      {showForm && (
        <Card title={editingChild ? 'Редактирай дете' : 'Добави ново дете'}>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-4 gap-4">
              <Input
                label="Име"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
              <Input
                label="Презиме"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              />
              <Input
                label="Фамилия"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
              <Input
                label="Дата на раждане"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Бележки
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Специални бележки или информация за детето ви..."
              />
            </div>

            <div className="flex gap-2 mt-4">
              <Button type="submit" variant="primary">
                {editingChild ? 'Обнови' : 'Добави дете'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Отказ
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {children.length === 0 ? (
          <Card>
            <p className="text-gray-500 text-center py-8">Все още няма добавени деца</p>
          </Card>
        ) : (
          children.map((child) => {
            const age = calculateAge(child.dateOfBirth);
            
            return (
              <Card key={child._id}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {[child.firstName, child.middleName, child.lastName].filter(Boolean).join(' ')}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      {child.dateOfBirth && (
                        <p>
                          📅 Дата на раждане: {format(new Date(child.dateOfBirth), 'dd.MM.yyyy')}
                          {age !== null && ` (${age} години)`}
                        </p>
                      )}
                      {child.notes && <p>📝 {child.notes}</p>}
                    </div>
                    {child.status === 'active' && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                        Активно
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => handleEdit(child)}>
                      Редактирай
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(child._id)}>
                      Изтрий
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Children;

