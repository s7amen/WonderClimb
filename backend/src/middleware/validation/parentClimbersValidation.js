/**
 * Validation middleware for parent child endpoints
 */

export const validateCreateClimber = (req, res, next) => {
  const { firstName, middleName, lastName } = req.body;

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
    return res.status(400).json({
      error: {
        message: 'firstName is required and must be a non-empty string',
      },
    });
  }

  if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
    return res.status(400).json({
      error: {
        message: 'lastName is required and must be a non-empty string',
      },
    });
  }

  // Optional middleName validation
  if (middleName !== undefined && middleName !== null && typeof middleName !== 'string') {
    return res.status(400).json({
      error: {
        message: 'middleName must be a string or omitted',
      },
    });
  }

  // Optional dateOfBirth validation
  if (req.body.dateOfBirth) {
    const dateOfBirth = new Date(req.body.dateOfBirth);
    if (isNaN(dateOfBirth.getTime())) {
      return res.status(400).json({
        error: {
          message: 'dateOfBirth must be a valid date',
        },
      });
    }
  }

  // Optional phone validation
  if (req.body.phone !== undefined && req.body.phone !== null && typeof req.body.phone !== 'string') {
    return res.status(400).json({
      error: {
        message: 'phone must be a string or omitted',
      },
    });
  }

  // Optional notes validation
  if (req.body.notes && typeof req.body.notes !== 'string') {
    return res.status(400).json({
      error: {
        message: 'notes must be a string',
      },
    });
  }

  next();
};

export const validateUpdateClimber = (req, res, next) => {
  const { firstName, middleName, lastName, dateOfBirth, phone, notes, accountStatus } = req.body;

  // At least one field must be provided
  if (!firstName && middleName === undefined && !lastName && dateOfBirth === undefined && phone === undefined && notes === undefined && accountStatus === undefined) {
    return res.status(400).json({
      error: {
        message: 'At least one field must be provided for update',
      },
    });
  }

  // Validate provided fields
  if (firstName !== undefined && (typeof firstName !== 'string' || firstName.trim().length === 0)) {
    return res.status(400).json({
      error: {
        message: 'firstName must be a non-empty string',
      },
    });
  }

  if (middleName !== undefined && middleName !== null && typeof middleName !== 'string') {
    return res.status(400).json({
      error: {
        message: 'middleName must be a string or omitted',
      },
    });
  }

  if (lastName !== undefined && (typeof lastName !== 'string' || lastName.trim().length === 0)) {
    return res.status(400).json({
      error: {
        message: 'lastName must be a non-empty string',
      },
    });
  }

  if (dateOfBirth !== undefined) {
    if (dateOfBirth !== null) {
      const date = new Date(dateOfBirth);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          error: {
            message: 'dateOfBirth must be a valid date or null',
          },
        });
      }
    }
  }

  if (phone !== undefined && phone !== null && typeof phone !== 'string') {
    return res.status(400).json({
      error: {
        message: 'phone must be a string or omitted',
      },
    });
  }

  if (notes !== undefined && typeof notes !== 'string') {
    return res.status(400).json({
      error: {
        message: 'notes must be a string',
      },
    });
  }

  if (accountStatus !== undefined && !['active', 'inactive'].includes(accountStatus)) {
    return res.status(400).json({
      error: {
        message: 'accountStatus must be either "active" or "inactive"',
      },
    });
  }

  next();
};

