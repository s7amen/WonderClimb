import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { API_BASE_URL, adminUsersAPI, gymAPI } from '../../services/api';
import { financeAPI } from '../../services/financeService';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { getUserFullName } from '../../utils/userUtils';
import PhotoGallery from '../../components/PhotoGallery';
import AuthImage from '../../components/AuthImage';
import ImageLightbox from '../../components/ImageLightbox';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateUtils';

// Helper component for Data Sections
const DataSection = ({ title, data, loading, renderItem, total, onLoadAll, isExpanded, onLoadLess, emptyMessage = "Няма данни" }) => {
  return (
    <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 sm:p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-neutral-950">{title}</h2>
        {total > 0 && (
          <span className="text-sm text-gray-500">
            Общо: {total}
          </span>
        )}
      </div>

      {loading && !data.length ? (
        <div className="py-4 text-center text-gray-500">Зареждане...</div>
      ) : data.length === 0 ? (
        <div className="py-4 text-center text-gray-500 italic">{emptyMessage}</div>
      ) : (
        <div className="space-y-0">
          <div className="overflow-x-auto">
            {renderItem(data)}
          </div>
        </div>
      )}

      {total > 10 && (
        <div className="mt-4 flex justify-center border-t border-gray-100 pt-3">
          {!isExpanded ? (
            <button
              onClick={onLoadAll}
              className="text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              Зареди всички
            </button>
          ) : (
            <button
              onClick={onLoadLess}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Свий списъка
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ClimberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const [climber, setClimber] = useState(null);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data States
  const [visits, setVisits] = useState([]);
  const [visitsTotal, setVisitsTotal] = useState(0);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsExpanded, setVisitsExpanded] = useState(false);
  const [visitsPage, setVisitsPage] = useState(1);

  const [passes, setPasses] = useState([]);
  const [passesTotal, setPassesTotal] = useState(0);
  const [passesLoading, setPassesLoading] = useState(false);
  const [passesExpanded, setPassesExpanded] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsExpanded, setTransactionsExpanded] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  // Check if current user can manage photos (admin or coach)
  const canManagePhotos = currentUser?.roles?.some(role => ['admin', 'coach'].includes(role));

  useEffect(() => {
    fetchClimber();
    fetchVisits(1, 10);
    fetchTransactions(1, 10);
    // Fetch family first, then passes will differ if family is found
    fetchFamily();
  }, [id]);

  // Update passes when family is loaded
  useEffect(() => {
    fetchPasses();
  }, [family]);

  const fetchFamily = async () => {
    try {
      const response = await api.get('/families', { params: { memberId: id } });
      if (response.data && response.data.length > 0) {
        setFamily(response.data[0]);
      } else {
        setFamily(null);
      }
    } catch (error) {
      console.error('Error fetching family:', error);
    }
  };

  const fetchClimber = async () => {
    try {
      setLoading(true);
      const response = await adminUsersAPI.getById(id);
      setClimber(response.data.user);
    } catch (error) {
      console.error('Error fetching climber:', error);
      showToast(error.response?.data?.error?.message || 'Грешка при зареждане на профила', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisits = async (page = 1, limit = 10) => {
    try {
      setVisitsLoading(true);
      const params = { userId: id, page, limit };
      const response = await gymAPI.getVisits(params);
      setVisits(response.data.visits || []);
      setVisitsTotal(response.data.total || response.data.visits?.length || 0);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setVisitsLoading(false);
    }
  };

  const fetchPasses = async () => {
    try {
      setPassesLoading(true);
      const response = await gymAPI.getAllPasses({ userId: id });

      // Also fetch family passes if climber is in a family
      let familyPasses = [];
      if (family) {
        try {
          const famResponse = await gymAPI.getAllPasses({ familyId: family._id });
          familyPasses = famResponse.data.passes || [];
        } catch (e) {
          console.error('Error fetching family passes', e);
        }
      }

      const allPasses = [...(response.data.passes || []), ...familyPasses];

      // Remove duplicates if any (unlikely unless logic changes)
      const uniquePasses = Array.from(new Map(allPasses.map(item => [item._id, item])).values());

      // Sort by active status then date
      uniquePasses.sort((a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1));

      setPasses(uniquePasses);
      setPassesTotal(uniquePasses.length);
    } catch (error) {
      console.error('Error fetching passes:', error);
    } finally {
      setPassesLoading(false);
    }
  };

  const fetchTransactions = async (page = 1, limit = 10) => {
    try {
      setTransactionsLoading(true);
      const response = await financeAPI.getTransactions({ payerClimberId: id }, { page, limit });
      setTransactions(response.data.transactions || []);
      setTransactionsTotal(response.data.total || response.data.transactions?.length || 0);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Handlers for expanding/collapsing sections
  const handleLoadAllVisits = () => {
    setVisitsExpanded(true);
    fetchVisits(1, 20);
    setVisitsPage(1);
  };

  const handleLoadLessVisits = () => {
    setVisitsExpanded(false);
    fetchVisits(1, 10);
    setVisitsPage(1);
  };

  const handleLoadAllPasses = () => {
    setPassesExpanded(true);
  };

  const handleLoadLessPasses = () => {
    setPassesExpanded(false);
  };

  const handleLoadAllTransactions = () => {
    setTransactionsExpanded(true);
    fetchTransactions(1, 20);
    setTransactionsPage(1);
  };

  const handleLoadLessTransactions = () => {
    setTransactionsExpanded(false);
    fetchTransactions(1, 10);
    setTransactionsPage(1);
  };

  // Photo handlers
  const handlePhotoUpdate = () => {
    fetchClimber();
  };

  const getPhotoUrl = (filename) => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/admin/photos/${id}/${filename}${token ? `?token=${token}` : ''}`;
  };

  const openMainPhotoLightbox = () => {
    if (climber?.photos && climber.photos.length > 0) {
      const mainPhotoIndex = climber.photos.findIndex(p => p.isMain);
      setLightboxImageIndex(mainPhotoIndex >= 0 ? mainPhotoIndex : 0);
      setLightboxOpen(true);
    }
  };

  const openGalleryLightbox = (index) => {
    setLightboxImageIndex(index);
    setLightboxOpen(true);
  };

  const handlePrevious = () => {
    setLightboxImageIndex(prev => prev > 0 ? prev - 1 : climber.photos.length - 1);
  };

  const handleNext = () => {
    setLightboxImageIndex(prev => prev < climber.photos.length - 1 ? prev + 1 : 0);
  };

  // Utility functions
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

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('bg-BG') + ' ' + date.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleLabel = (role) => {
    const roles = {
      admin: 'Администратор',
      coach: 'Треньор',
      instructor: 'Инструктор',
      climber: 'Катерач'
    };
    return roles[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading text="Зареждане на профил..." />
      </div>
    );
  }

  if (!climber) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Катерачът не беше намерен</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate('/climbers')}
            className="bg-[#ea7a24] h-9 px-4 rounded-lg text-white text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0 w-full sm:w-auto self-start"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Назад към списъка
          </button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-950">{getUserFullName(climber)}</h1>
            <p className="text-sm text-gray-500 mt-1">Пълен профил на катерач</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 sm:p-6 relative">
            {/* Main Photo Display */}
            <div className="flex justify-center mb-6">
              {climber?.photos && climber.photos.length > 0 ? (() => {
                const mainPhoto = climber.photos.find(p => p.isMain) || climber.photos[0];
                const photoUrl = getPhotoUrl(mainPhoto.filename);
                return (
                  <div className="bg-[#f3f3f5] border-4 border-[#ea7a24] rounded-[16px] w-[200px] h-[200px] overflow-hidden p-1 hover:opacity-90 transition-opacity cursor-pointer" onClick={openMainPhotoLightbox}>
                    <AuthImage src={photoUrl} alt="Профилна снимка" className="w-full h-full object-cover rounded-[12px]" />
                  </div>
                );
              })() : (
                <div className="bg-[#f3f3f5] border-4 border-gray-200 rounded-[16px] w-[200px] h-[200px] flex items-center justify-center text-gray-400">
                  <span>Няма снимка</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-[#4a5565] uppercase tracking-wider mb-1">Име</p>
                <p className="text-sm font-medium text-neutral-950">{climber.firstName || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#4a5565] uppercase tracking-wider mb-1">Презиме</p>
                <p className="text-sm font-medium text-neutral-950">{climber.middleName || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#4a5565] uppercase tracking-wider mb-1">Фамилия</p>
                <p className="text-sm font-medium text-neutral-950">{climber.lastName || '-'}</p>
              </div>

              <div className="border-t border-gray-100 my-2"></div>

              <div>
                <p className="text-xs font-medium text-[#4a5565] uppercase tracking-wider mb-1">Имейл</p>
                <p className="text-sm text-neutral-950 break-all">{climber.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#4a5565] uppercase tracking-wider mb-1">Телефон</p>
                <p className="text-sm text-neutral-950">{climber.phone || '-'}</p>
              </div>

              <div className="border-t border-gray-100 my-2"></div>

              <div>
                <p className="text-xs font-medium text-[#4a5565] uppercase tracking-wider mb-1">Дата на раждане</p>
                <p className="text-sm text-neutral-950">
                  {climber.dateOfBirth ? formatDate(climber.dateOfBirth) : '-'}
                  {climber.dateOfBirth && <span className="text-gray-500 ml-1">({calculateAge(climber.dateOfBirth)} г.)</span>}
                </p>
              </div>

              <div className="border-t border-gray-100 my-2"></div>

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-[#4a5565] uppercase tracking-wider mb-1">Статус</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${climber.accountStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {climber.accountStatus === 'active' ? 'Активен' : 'Неактивен'}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#4a5565] uppercase tracking-wider mb-1">Трениращ</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${climber.isTrainee ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
                    {climber.isTrainee ? 'Да' : 'Не'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[#4a5565] uppercase tracking-wider mb-1">Роли</p>
                <div className="flex flex-wrap gap-1">
                  {climber.roles && climber.roles.map(role => (
                    <span key={role} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                      {getRoleLabel(role)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 my-2"></div>

              <div>
                <p className="text-xs font-medium text-[#4a5565] uppercase tracking-wider mb-1">Бележки</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{climber.notes || '-'}</p>
              </div>
            </div>
          </div>

          {/* Photos Management */}
          {canManagePhotos && (
            <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 sm:p-6">
              <h3 className="text-sm font-medium text-[#4a5565] uppercase tracking-wider mb-4">Снимки</h3>
              <PhotoGallery
                climberId={id}
                photos={climber?.photos || []}
                onUpdate={handlePhotoUpdate}
                onImageClick={openGalleryLightbox}
              />
            </div>
          )}
        </div>

        {/* Right Column: Data Sections */}
        <div className="lg:col-span-2 space-y-6">

          {/* Family Section */}
          {family && (
            <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 sm:p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-neutral-950 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Семейство
                </h2>
                <Link to={`/families/${family._id}`} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                  Виж семейството
                </Link>
              </div>
              <div className="bg-orange-50/50 rounded-lg p-4 border border-orange-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900">{family.name}</span>
                  <span className="text-xs bg-white text-gray-500 px-2 py-1 rounded border border-gray-200">
                    {family.memberIds?.length || 0} члена
                  </span>
                </div>
                {family.memberIds && family.memberIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {family.memberIds
                      .filter(m => m._id !== id) // Exclude current profile user
                      .map(member => (
                        <Link
                          key={member._id}
                          to={`/climbers/${member._id}`}
                          className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:border-orange-300 transition-colors"
                        >
                          <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                            {member.firstName?.charAt(0)}
                          </div>
                          <span className="text-gray-700">{member.firstName} {member.lastName}</span>
                        </Link>
                      ))
                    }
                    {family.memberIds.length === 1 && family.memberIds[0]._id === id && (
                      <span className="text-sm text-gray-500 italic">Няма други членове</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Visits Section */}
          <DataSection
            title="Посещения"
            data={visits}
            total={visitsTotal}
            loading={visitsLoading}
            isExpanded={visitsExpanded}
            onLoadAll={handleLoadAllVisits}
            onLoadLess={handleLoadLessVisits}
            renderItem={(data) => (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Цена</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map(visit => (
                    <tr key={visit._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(visit.checkInTime || visit.date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {visit.type === 'pass' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Карта</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Единично</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {visit.amount !== undefined ? `€${visit.amount.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          />

          {/* Passes Section - TABLE FORMAT */}
          <DataSection
            title="Карти и Абонаменти"
            data={passesExpanded ? passes : passes.slice(0, 10)}
            total={passesTotal}
            loading={passesLoading}
            isExpanded={passesExpanded}
            onLoadAll={handleLoadAllPasses}
            onLoadLess={handleLoadLessPasses}
            renderItem={(data) => (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Име</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Валидна до</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Посещения</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Цена</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map(pass => (
                    <tr key={pass._id} className={`hover:bg-gray-50 ${pass.isActive ? 'bg-green-50/30' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${pass.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                          {pass.isActive ? 'Активна' : 'Неактивна'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{pass.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{pass.type}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(pass.validUntil)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                        {pass.totalEntries ? `${pass.remainingEntries} / ${pass.totalEntries}` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {pass.amount ? `€${pass.amount.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          />

          {/* Transactions Section */}
          <DataSection
            title="Транзакции"
            data={transactions}
            total={transactionsTotal}
            loading={transactionsLoading}
            isExpanded={transactionsExpanded}
            onLoadAll={handleLoadAllTransactions}
            onLoadLess={handleLoadLessTransactions}
            renderItem={(data) => (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Описание</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Сума</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map(tx => (
                    <tr key={tx._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(tx.paidAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {tx.entries && tx.entries.length > 0 ? (
                          <span>
                            {tx.entries[0].description}
                            {tx.entries.length > 1 && <span className="text-xs text-gray-400 ml-1">(+{tx.entries.length - 1} други)</span>}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        €{tx.totalAmount?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          />

        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && climber?.photos && climber.photos.length > 0 && (
        <ImageLightbox
          isOpen={lightboxOpen}
          imageUrl={getPhotoUrl(climber.photos[lightboxImageIndex].filename)}
          onClose={() => setLightboxOpen(false)}
          onPrevious={climber.photos.length > 1 ? handlePrevious : null}
          onNext={climber.photos.length > 1 ? handleNext : null}
          showNavigation={climber.photos.length > 1}
        />
      )}</div>
  );
};

export default ClimberProfile;
