/**
 * Add a duration to a date
 * @param {Date} date - The start date
 * @param {number} amount - The amount to add
 * @param {string} type - 'days' or 'months'
 * @returns {Date} The new date
 */
export const addDuration = (date, amount, type = 'days') => {
    const result = new Date(date);

    if (type === 'months') {
        const originalDay = result.getDate();

        // Add months
        result.setMonth(result.getMonth() + amount);

        // Check for day overflow (e.g. adding 1 month to Jan 31 -> Feb 28/29)
        // If the day changed, it means we overflowed into the next month
        // So we set it to the last day of the previous month (the target month)
        if (result.getDate() !== originalDay) {
            result.setDate(0);
        }
    } else {
        // Default to days
        result.setDate(result.getDate() + amount);
    }

    return result;
};
