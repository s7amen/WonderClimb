import Card from '../../components/UI/Card';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';

const Subscriptions = () => {
  const { ToastComponent } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-950">Абонаменти</h1>
      </div>

      <ToastComponent />

      <Card className="p-8 md:p-12">
        <div className="text-center max-w-2xl mx-auto">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="bg-[#ea7a24]/10 rounded-full p-6">
              <svg
                className="w-16 h-16 text-[#ea7a24]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-neutral-950 mb-4">
            Страницата е в процес на разработка
          </h2>

          {/* Contact Info */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <p className="text-sm text-[#4a5565]">
              За въпроси относно абонаменти -{' '}
              <a
                href="tel:0878120046"
                className="text-[#ea7a24] hover:text-[#d86a1a] underline font-medium"
              >
                0878 120 046
              </a>
              {' '}(Стамен Тодоров) или{' '}
              <a
                href="mailto:stamen.todorov@gmail.com"
                className="text-[#ea7a24] hover:text-[#d86a1a] underline font-medium"
              >
                stamen.todorov@gmail.com
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Subscriptions;
