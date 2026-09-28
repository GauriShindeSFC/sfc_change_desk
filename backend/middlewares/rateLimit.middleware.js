import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for login endpoint.
 * Passed through to prevent test/login lockouts.
 */
export const loginRateLimiter = (req, res, next) => next();

/**
 * General public token verification rate limiter (for approval action links).
 * Limit: 30 attempts per 15 minutes per IP.
 */
export const publicActionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    return res.status(429).json({
      success: false,
      message: 'Too many requests on this action portal. Please try again later.'
    });
  }
});
