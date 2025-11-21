/**
 * Middleware configuration module
 * Sets up rate limiting and other Express middleware
 */

import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { log } from "../utils/logger";

/**
 * Rate limit window in milliseconds from environment or default.
 * Default: 900000ms (15 minutes)
 */
const RATE_LIMIT_WINDOW_MS =
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

/**
 * Maximum requests per window from environment or default.
 * Default: 100 requests per window
 */
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX) || 100;

/**
 * Express rate limiter middleware instance.
 * Limits requests per IP address based on configured window and max.
 */
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: "Too many requests from this IP, please try again later.",
  handler: (req: Request, res: Response) => {
    log("warn", `Rate limit exceeded for IP: ${req.ip}, URL: ${req.url}`);
    res.status(429).json({
      error: "Too many requests from this IP, please try again later.",
    });
  },
});

/**
 * Logs rate limiting configuration on startup.
 */
const logRateLimitConfig = () => {
  log(
    "info",
    `Rate limiting configured: ${RATE_LIMIT_MAX} requests per ${
      RATE_LIMIT_WINDOW_MS / 1000
    }s window`
  );
};

export { limiter, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, logRateLimitConfig };
