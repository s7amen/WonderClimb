import { useState, useEffect } from 'react';
import Card from '../../components/UI/Card';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { format } from 'date-fns';

const Subscriptions = () => {
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    // Placeholder for future subscription data fetching
    setLoading(false);
  }, []);

  if (loading) {
    return <Loading text="Зареждане на абонаменти..." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Абонаменти</h1>

      <ToastComponent />

      <Card>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            Функционалността за абонаменти ще бъде добавена скоро.
          </p>
          <p className="text-sm text-gray-400">
            Тук ще можете да виждате активните и минали абонаменти на децата си.
          </p>
        </div>
      </Card>

      {/* Placeholder for future subscription display */}
      <div className="space-y-4">
        <Card>
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <h3 className="font-semibold mb-2">Активни абонаменти</h3>
            <p className="text-sm text-gray-500">Няма активни абонаменти</p>
          </div>
        </Card>

        <Card>
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <h3 className="font-semibold mb-2">Минали абонаменти</h3>
            <p className="text-sm text-gray-500">Няма минали абонаменти</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Subscriptions;

