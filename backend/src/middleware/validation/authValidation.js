/**
 * Validation middleware for authentication endpoints
 */

export const validateRegister = (req, res, next) => {
  const { email, password, firstName, middleName, lastName } = req.body;
  const errors = [];

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Имейлът е задължителен и трябва да бъде текст');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Имейлът трябва да бъде валиден имейл адрес');
    }
  }

  // Password validation
  if (!password || typeof password !== 'string') {
    errors.push('Паролата е задължителна и трябва да бъде текст');
  } else if (password.length < 5) {
    errors.push('Паролата трябва да бъде поне 5 символа');
  }

  // First name validation
  if (!firstName || typeof firstName !== 'string') {
    errors.push('Името е задължително и трябва да бъде текст');
  } else if (firstName.trim().length < 1) {
    errors.push('Името трябва да бъде поне 1 символ');
  }

  // Last name validation
  if (!lastName || typeof lastName !== 'string') {
    errors.push('Фамилията е задължителна и трябва да бъде текст');
  } else if (lastName.trim().length < 1) {
    errors.push('Фамилията трябва да бъде поне 1 символ');
  }

  // Middle name validation (optional)
  if (middleName !== undefined && middleName !== null && typeof middleName !== 'string') {
    errors.push('Презимето трябва да бъде текст или да бъде пропуснато');
  }

  // Note: Roles are automatically assigned as "climber" - no validation needed

  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        message: 'Валидацията неуспешна',
        errors,
      },
    });
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Имейлът е задължителен и трябва да бъде текст');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Имейлът трябва да бъде валиден имейл адрес');
    }
  }

  // Password validation
  if (!password || typeof password !== 'string') {
    errors.push('Паролата е задължителна и трябва да бъде текст');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        message: 'Валидацията неуспешна',
        errors,
      },
    });
  }

  next();
};

