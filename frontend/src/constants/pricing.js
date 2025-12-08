/**
 * Pricing Categories
 * These should match the backend enum values exactly
 */
export const PRICING_CATEGORIES = [
    { value: 'gym_pass', label: 'Карта за зала' },
    { value: 'gym_single_visit', label: 'Единично посещение - зала' },
    { value: 'training_pass', label: 'Карта за тренировки' },
    { value: 'training_single', label: 'Единична тренировка' },
    { value: 'product', label: 'Продукт' },
    { value: 'birthday', label: 'Рожден ден' },
    { value: 'events', label: 'Събития' },
    { value: 'course', label: 'Курс' },
    { value: 'other', label: 'Друго' },
];

/**
 * Get category label by value
 */
export const getCategoryLabel = (value) => {
    const category = PRICING_CATEGORIES.find(c => c.value === value);
    return category ? category.label : value;
};

/**
 * Pricing Code Format Guidelines
 */
export const PRICING_CODE_EXAMPLES = [
    { code: 'GYM_SINGLE', description: 'Single gym entry' },
    { code: 'GYM_PASS_MONTHLY', description: 'Monthly gym pass' },
    { code: 'GYM_PASS_MONTHLY_FAMILY', description: 'Monthly family gym pass' },
    { code: 'TRAIN_SINGLE_INDIVIDUAL', description: 'Single individual training' },
    { code: 'TRAIN_SINGLE_MULTI', description: 'Single multisport training' },
    { code: 'TRAIN_SINGLE_FAMILY', description: 'Single family training' },
    { code: 'TRAIN_PASS_8', description: 'Training pass with 8 sessions' },
    { code: 'TRAIN_PASS_8_FAMILY', description: 'Family training pass with 8 sessions' },
    { code: 'TRAIN_PASS_12', description: 'Training pass with 12 sessions' },
    { code: 'COURSE_TOPROPE', description: 'Top-rope course' },
    { code: 'EVENT_BIRTHDAY', description: 'Birthday party event' },
    { code: 'PRODUCT_MAGNESIUM', description: 'Magnesium product' },
];

export const PRICING_CODE_FORMAT_HINT = 'Format: [AREA]_[TYPE]_[DETAILS] (e.g., GYM_PASS_MONTHLY)';
