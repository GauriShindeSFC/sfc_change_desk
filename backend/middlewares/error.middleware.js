export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = err.errors?.map((e) => e.message).join(', ') || 'Database validation failed';
    details = err.errors?.map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'SequelizeDatabaseError' || err.name === 'SequelizeConnectionError') {
    statusCode = 500;
    message = 'Database operation failed. Please try again later.';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = err.name === 'TokenExpiredError' ? 'Your session token has expired. Please sign in again.' : 'Invalid authorization token';
  }

  const isProd = process.env.NODE_ENV === 'production';

  // Log error server-side
  console.error(`[API Error] ${req.method} ${req.originalUrl || req.url} - Status ${statusCode}:`, err.stack || err.message || err);

  const responsePayload = {
    success: false,
    message: statusCode >= 500 && isProd
      ? 'An unexpected error occurred. Please try again later.'
      : message
  };

  if (details) {
    responsePayload.errors = details;
  }

  res.status(statusCode).json(responsePayload);
};

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not Found - ${req.method} ${req.originalUrl || req.url}`
  });
};

