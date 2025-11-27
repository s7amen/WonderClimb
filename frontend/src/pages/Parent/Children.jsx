import { useState, useEffect } from 'react';
import { parentClimbersAPI } from '../../services/api';
import { format } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import { formatDate, formatDateForInput } from '../../utils/dateUtils';

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
        const response = await parentClimbersAPI.update(editingChild._id, childData);
        const updatedChild = response.data.climber;
        
        // Обновяваме само редактираното дете в масива
        setChildren(prev => prev.map(c => c._id === editingChild._id ? updatedChild : c));
        
        showToast('Детето е обновено успешно', 'success');
        resetForm();
        
        // Скролваме до редактираното дете
        scrollToElement(`child-${editingChild._id}`);
      } else {
        const response = await parentClimbersAPI.create(childData);
        const newChild = response.data.climber;
        
        // Добавяме новото дете в масива
        setChildren(prev => [...prev, newChild]);
        
        resetForm();
        
        // Скролваме до новото дете
        scrollToElement(`child-${newChild._id}`);
      }
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Грешка при запазване на дете', 'error');
    }
  };

  const handleEdit = (child) => {
    setFormData({
      firstName: child.firstName,
      middleName: child.middleName || '',
      lastName: child.lastName,
      dateOfBirth: child.dateOfBirth ? formatDateForInput(child.dateOfBirth) : '',
      notes: child.notes || '',
    });
    setEditingChild(child);
    setShowForm(true);
  };

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteChildId, setDeleteChildId] = useState(null);

  const handleDelete = (childId) => {
    setDeleteChildId(childId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteChildId) return;

    try {
      await parentClimbersAPI.deactivate(deleteChildId);
      
      // Премахваме детето от масива
      setChildren(prev => prev.filter(c => c._id !== deleteChildId));
      
      setShowDeleteDialog(false);
      setDeleteChildId(null);
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Грешка при изтриване на дете';
      showToast(errorMessage, 'error');
      setShowDeleteDialog(false);
      setDeleteChildId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setDeleteChildId(null);
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

  // Helper функция за scroll до елемент
  const scrollToElement = (elementId) => {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  if (loading) {
    return <Loading text="Зареждане на деца..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Моите деца</h1>
        <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto flex items-center gap-2">
          {showForm ? 'Отказ' : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добави дете
            </>
          )}
        </Button>
      </div>

      <ToastComponent />
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Изтриване на профил"
        message="Сигурни ли сте, че искате да изтриете това дете? Това действие не може да бъде отменено."
        confirmText="Изтрий"
        cancelText="Отказ"
        variant="danger"
      />

      {showForm && (
        <Card title={editingChild ? 'Редактирай дете' : 'Добави ново дете'}>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                label="Дата на раждане (dd/mm/yyyy)"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                placeholder="dd/mm/yyyy"
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

            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button type="submit" variant="primary" className="w-full sm:w-auto flex items-center gap-2">
                {editingChild ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Обнови
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добави дете
                  </>
                )}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm} className="w-full sm:w-auto flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
              <Card key={child._id} id={`child-${child._id}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {[child.firstName, child.middleName, child.lastName].filter(Boolean).join(' ')}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      {child.dateOfBirth && (
                        <p className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Дата на раждане: {formatDate(child.dateOfBirth)}
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
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button variant="secondary" onClick={() => handleEdit(child)} className="w-full sm:w-auto flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Редактирай
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(child._id)} className="w-full sm:w-auto flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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

