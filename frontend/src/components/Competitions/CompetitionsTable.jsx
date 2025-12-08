import { format } from 'date-fns';

const CompetitionsTable = ({
    competitions,
    isAdmin = false,
    showCheckboxes = false,
    onRowClick,
    onEdit,
    onDelete,
    selectedIds = new Set(),
    onToggleSelection,
    onToggleSelectAll,
    competitionStatuses = {}
}) => {
    // Check if all filtered competitions are selected
    // Note: This logic depends on the parent passing the filtered list correctly
    const allSelected = competitions.length > 0 && competitions.every(c => selectedIds.has(c.tempId || c._id));

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                <thead className="bg-gray-50">
                    <tr>
                        {showCheckboxes && (
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={onToggleSelectAll}
                                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </th>
                        )}
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Заглавие</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Място</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Спорт</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Групи</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ранг</th>
                        {isAdmin && (
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                        )}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {competitions.map((competition, index) => {
                        const date = new Date(competition.date);
                        const status = competition.tempId ? (competitionStatuses[competition.tempId] || 'new') : null;

                        // Determine background color based on status (for import) or hover
                        let rowClass = "cursor-pointer transition-colors duration-150 ";
                        if (status === 'exists') {
                            rowClass += "bg-green-50 hover:bg-green-100";
                        } else if (status === 'changed') {
                            rowClass += "bg-orange-50 hover:bg-orange-100";
                        } else {
                            rowClass += "hover:bg-gray-50";
                        }

                        const statusText = status === 'exists'
                            ? ' (Вече съществува)'
                            : status === 'changed'
                                ? ' (Променена дата)'
                                : '';

                        return (
                            <tr
                                key={competition._id || competition.tempId}
                                id={`competition-${competition._id || competition.tempId}`}
                                className={rowClass}
                                onClick={() => onRowClick && onRowClick(competition)}
                            >
                                {showCheckboxes && (
                                    <td className="px-4 py-4 whitespace-nowrap w-12" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(competition.tempId || competition._id)}
                                            onChange={() => onToggleSelection && onToggleSelection(competition.tempId || competition._id)}
                                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                        />
                                    </td>
                                )}
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                    {format(date, 'dd.MM.yyyy')}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 max-w-xs truncate" title={competition.title}>
                                    {competition.title}
                                    {statusText && <span className="text-xs text-gray-500 italic block font-normal">{statusText}</span>}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[150px] truncate" title={competition.location}>
                                    {competition.location}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                    {competition.sport && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {competition.sport}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                    {competition.groups ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            {competition.groups}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                    {competition.rank && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                            {competition.rank}
                                        </span>
                                    )}
                                </td>
                                {isAdmin && (
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => onEdit && onEdit(competition)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
                                                title="Редактирай"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => onDelete && onDelete(competition._id)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors text-red-600 hover:text-red-800"
                                                title="Изтрий"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Mobile Cards View - kept as is for responsiveness */}
            <div className="md:hidden divide-y divide-gray-200">
                {competitions.map((competition) => {
                    const date = new Date(competition.date);
                    const status = competition.tempId ? (competitionStatuses[competition.tempId] || 'new') : null;

                    return (
                        <div
                            key={competition._id || competition.tempId}
                            id={`competition-${competition._id || competition.tempId}`}
                            className="p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => onRowClick && onRowClick(competition)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                                        {competition.title}
                                        {status === 'exists' && <span className="text-xs text-gray-500 italic ml-2">(Вече съществува)</span>}
                                        {status === 'changed' && <span className="text-xs text-orange-500 italic ml-2">(Променена дата)</span>}
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-2">{format(date, 'dd.MM.yyyy')} • {competition.location}</p>
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => onEdit && onEdit(competition)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => onDelete && onDelete(competition._id)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors text-red-600"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {competition.sport && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {competition.sport}
                                    </span>
                                )}
                                {competition.groups && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        {competition.groups}
                                    </span>
                                )}
                                {competition.rank && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                        {competition.rank}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CompetitionsTable;
