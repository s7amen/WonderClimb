import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { competitionsAPI } from '../../services/api';
import { format } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';

const CompetitionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    fetchCompetition();
  }, [id]);

  const fetchCompetition = async () => {
    try {
      setLoading(true);
      const response = await competitionsAPI.getCompetition(id);
      if (response.data.competition) {
        setCompetition(response.data.competition);
      } else {
        showToast('Състезанието не е намерено', 'error');
        navigate('/competitions');
      }
    } catch (error) {
      console.error('Error fetching competition:', error);
      showToast(
        error.response?.data?.error?.message || 'Грешка при зареждане на състезанието',
        'error'
      );
      navigate('/competitions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text="Зареждане на състезание..." />;
  }

  if (!competition) {
    return null;
  }

  const date = new Date(competition.date);

  return (
    <div className="min-h-screen bg-[#f3f3f5] flex flex-col">
      <Header navigation={[]} />
      
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button
            onClick={() => navigate('/competitions')}
            variant="secondary"
            className="mb-4 bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]"
          >
            ← Назад към състезанията
          </Button>
          <h1 className="text-base font-medium text-neutral-950 mb-1">{competition.title}</h1>
          <p className="text-sm text-[#4a5565]">Детайли за състезанието</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-[rgba(0,0,0,0.1)] rounded-[10px]">
          <h2 className="text-base font-medium text-neutral-950 mb-4">Основна информация</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#4a5565]">Дата и час</label>
              <p className="text-sm text-neutral-950 mt-1">
                {format(date, 'dd MMMM yyyy, HH:mm')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-[#4a5565]">Място</label>
              <p className="text-sm text-neutral-950 mt-1">{competition.location}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-[#4a5565]">Спорт</label>
              <p className="text-sm text-neutral-950 mt-1">{competition.sport}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-[#4a5565]">Ранг</label>
              <p className="text-sm text-neutral-950 mt-1">{competition.rank}</p>
            </div>
            {competition.groups && (
              <div>
                <label className="text-sm font-medium text-[#4a5565]">Групи</label>
                <p className="text-sm text-neutral-950 mt-1">{competition.groups}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="border border-[rgba(0,0,0,0.1)] rounded-[10px]">
          <h2 className="text-base font-medium text-neutral-950 mb-4">Допълнителна информация</h2>
          <div className="space-y-4">
            {competition.sourceUrl && (
              <div>
                <label className="text-sm font-medium text-[#4a5565]">Източник</label>
                <p className="text-sm text-neutral-950 mt-1">
                  <a
                    href={competition.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {competition.sourceUrl}
                  </a>
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          onClick={() => navigate('/competitions')}
          variant="secondary"
          className="bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]"
        >
          Назад
        </Button>
      </div>

      {ToastComponent}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CompetitionDetail;

