/**
 * Validation middleware for authentication endpoints
 */

export const validateRegister = (req, res, next) => {
  const { email, password, firstName, middleName, lastName } = req.body;
  const errors = [];

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Email is required and must be a string');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Email must be a valid email address');
    }
  }

  // Password validation
  if (!password || typeof password !== 'string') {
    errors.push('Password is required and must be a string');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  // First name validation
  if (!firstName || typeof firstName !== 'string') {
    errors.push('firstName is required and must be a string');
  } else if (firstName.trim().length < 1) {
    errors.push('firstName must be at least 1 character long');
  }

  // Last name validation
  if (!lastName || typeof lastName !== 'string') {
    errors.push('lastName is required and must be a string');
  } else if (lastName.trim().length < 1) {
    errors.push('lastName must be at least 1 character long');
  }

  // Middle name validation (optional)
  if (middleName !== undefined && middleName !== null && typeof middleName !== 'string') {
    errors.push('middleName must be a string or omitted');
  }

  // Note: Roles are automatically assigned as "climber" - no validation needed

  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
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
    errors.push('Email is required and must be a string');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Email must be a valid email address');
    }
  }

  // Password validation
  if (!password || typeof password !== 'string') {
    errors.push('Password is required and must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        errors,
      },
    });
  }

  next();
};

