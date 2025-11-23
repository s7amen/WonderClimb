/**
 * Validation middleware for climber activation endpoints
 */

export const validateActivateClimber = (req, res, next) => {
  const { email, password, middleName, phone } = req.body;
  const errors = [];

  // Email validation (required)
  if (!email || typeof email !== 'string') {
    errors.push('Email is required and must be a string');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Email must be a valid email address');
    }
  }

  // Password validation (required)
  if (!password || typeof password !== 'string') {
    errors.push('Password is required and must be a string');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  // Middle name validation (optional)
  if (middleName !== undefined && middleName !== null && typeof middleName !== 'string') {
    errors.push('middleName must be a string or omitted');
  }

  // Phone validation (optional)
  if (phone !== undefined && phone !== null && typeof phone !== 'string') {
    errors.push('phone must be a string or omitted');
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

