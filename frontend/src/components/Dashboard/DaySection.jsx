import TrainingCard from './TrainingCard';

const DaySection = ({ date, sessions, onAddChild }) => {
  const formatDate = (date) => {
    try {
      const days = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'];
      const months = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];
      const dayName = days[date.getDay()];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${dayName}, ${day}.${month}.${year}`;
    } catch {
      return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    }
  };

  const getTrainingCountText = (count) => {
    if (count === 1) return '1 тренировка';
    return `${count} тренировки`;
  };

  return (
    <div className="space-y-4">
      {/* Day Header */}
      <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#ea7a24] rounded-[10px] w-9 h-9 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-base font-normal text-neutral-950">
              {formatDate(date)}
            </h2>
            <p className="text-sm text-[#4a5565]">
              {getTrainingCountText(sessions.length)}
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal divider line extending to the right edge */}
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="h-px bg-[rgba(0,0,0,0.1)]"></div>
      </div>

      {/* Training Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <TrainingCard
            key={session._id || session.id}
            session={session}
            onAddChild={onAddChild}
          />
        ))}
      </div>
    </div>
  );
};

export default DaySection;

