import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter specifically designed for login and public action authorization endpoints.
 * Blocks brute-force credential stuffing and token guessing attacks.
 * Limit: 5 attempts per 15 minutes per IP address.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: false,
  handler: (req, res, next, options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000 / 60);
    console.warn(`[Security Alert] Rate limit exceeded for IP: ${req.ip} on ${req.originalUrl || req.url}`);
    return res.status(429).json({
      success: false,
      message: `Too many login attempts from this IP address. Please try again after ${retryAfter} minutes.`,
      retryAfterMinutes: retryAfter
    });
  }
});

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
