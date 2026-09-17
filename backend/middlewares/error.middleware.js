export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const isProd = process.env.NODE_ENV === 'production';

  // Server-side diagnostic log
  console.error(`[API Error] ${req.method} ${req.originalUrl || req.url} - ${statusCode}:`, err);

  const responsePayload = {
    success: false,
    message: statusCode >= 500 && isProd
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal Server Error'
  };

  if (err.details) {
    responsePayload.errors = err.details;
  }

  res.status(statusCode).json(responsePayload);
};

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not Found - ${req.method} ${req.originalUrl || req.url}`
  });
};
