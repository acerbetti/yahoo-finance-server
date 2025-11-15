/**
 * Middleware configuration tests
 * Tests for rate limiting and middleware configuration
 * @module tests/middleware/index.test
 */

import {
  limiter,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  logRateLimitConfig,
} from "../../src/middleware/index.js";

// Mock console.log
const originalLog = console.log;
const logs = [];

beforeEach(() => {
  logs.length = 0;
  console.log = (...args) => {
    logs.push(args.join(" "));
  };
});

afterEach(() => {
  console.log = originalLog;
});

describe("Middleware Configuration", () => {
  describe("limiter middleware", () => {
    test("should be a function", () => {
      expect(typeof limiter).toBe("function");
    });

    test("should be callable as Express middleware", () => {
      // Middleware functions should accept (req, res, next)
      expect(limiter.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("RATE_LIMIT_WINDOW_MS constant", () => {
    test("should be a positive number in milliseconds", () => {
      expect(typeof RATE_LIMIT_WINDOW_MS).toBe("number");
      expect(RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
    });

    test("should be at least 1 minute", () => {
      expect(RATE_LIMIT_WINDOW_MS).toBeGreaterThanOrEqual(60 * 1000);
    });

    test("should be 15 minutes by default", () => {
      expect(RATE_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000);
    });
  });

  describe("RATE_LIMIT_MAX constant", () => {
    test("should be a positive number", () => {
      expect(typeof RATE_LIMIT_MAX).toBe("number");
      expect(RATE_LIMIT_MAX).toBeGreaterThan(0);
    });

    test("should be at least 10 requests", () => {
      expect(RATE_LIMIT_MAX).toBeGreaterThanOrEqual(10);
    });

    test("should be 100 requests by default", () => {
      expect(RATE_LIMIT_MAX).toBe(100);
    });
  });

  describe("logRateLimitConfig function", () => {
    test("should be a function", () => {
      expect(typeof logRateLimitConfig).toBe("function");
    });

    test("should log rate limit configuration", () => {
      logRateLimitConfig();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toContain("Rate limiting configured");
      expect(logs[0]).toContain("100");
      expect(logs[0]).toContain("900"); // 900 seconds = 15 minutes
    });
  });
});
