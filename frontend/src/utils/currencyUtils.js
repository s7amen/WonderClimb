// Fixed EUR to BGN exchange rate (Bulgarian lev is pegged to Euro)
const EUR_TO_BGN_RATE = 1.95583;

/**
 * Convert EUR to BGN
 * @param {number} eurAmount - Amount in EUR
 * @returns {number} Amount in BGN
 */
export const convertEURtoBGN = (eurAmount) => {
    return eurAmount * EUR_TO_BGN_RATE;
};

/**
 * Convert BGN to EUR
 * @param {number} bgnAmount - Amount in BGN
 * @returns {number} Amount in EUR
 */
export const convertBGNtoEUR = (bgnAmount) => {
    return bgnAmount / EUR_TO_BGN_RATE;
};

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code ('EUR' or 'BGN')
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'EUR', decimals = 2) => {
    const formatted = amount.toFixed(decimals);
    const currencySymbol = currency === 'EUR' ? '€' : 'лв';
    return `${formatted} ${currencySymbol}`;
};

/**
 * Calculate change when payment is made in different currency than system
 * @param {number} totalEUR - Total amount in EUR
 * @param {number} amountPaid - Amount paid
 * @param {string} paymentCurrency - Currency of payment ('EUR' or 'BGN')
 * @returns {Object} Change in both currencies
 */
export const calculateChange = (totalEUR, amountPaid, paymentCurrency = 'EUR') => {
    let changeEUR = 0;
    let changeBGN = 0;
    let amountPaidEUR = 0;

    if (paymentCurrency === 'BGN') {
        amountPaidEUR = convertBGNtoEUR(amountPaid);
        changeEUR = amountPaidEUR - totalEUR;
        changeBGN = convertEURtoBGN(changeEUR);
    } else {
        amountPaidEUR = amountPaid;
        changeEUR = amountPaid - totalEUR;
        changeBGN = convertEURtoBGN(changeEUR);
    }

    return {
        changeEUR: parseFloat(changeEUR.toFixed(2)),
        changeBGN: parseFloat(changeBGN.toFixed(2)),
        amountPaidEUR: parseFloat(amountPaidEUR.toFixed(2))
    };
};

export { EUR_TO_BGN_RATE };
