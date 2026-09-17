export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const badRequest = (msg, details = null) => new AppError(msg, 400, details);
export const unauthorized = (msg = 'Unauthorized') => new AppError(msg, 401);
export const forbidden = (msg = 'Forbidden') => new AppError(msg, 403);
export const notFound = (msg = 'Resource not found') => new AppError(msg, 404);
export const conflict = (msg = 'Conflict') => new AppError(msg, 409);
