/**
 * Logger utility tests
 * Tests for logging functionality with different log levels
 * @module tests/utils/logger.test
 */

import { log, LOG_LEVELS, CURRENT_LOG_LEVEL } from "../../src/utils/logger.js";

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

describe("Logger Utility", () => {
  describe("log function", () => {
    test("should log with timestamp and level", () => {
      log("info", "Test message");
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
      expect(logs[0]).toContain("INFO: Test message");
    });

    test("should handle different log levels", () => {
      log("error", "Error message");
      log("warn", "Warning message");
      log("info", "Info message");
      log("debug", "Debug message");

      expect(logs.some((l) => l.includes("ERROR: Error message"))).toBe(true);
      expect(logs.some((l) => l.includes("WARN: Warning message"))).toBe(true);
      expect(logs.some((l) => l.includes("INFO: Info message"))).toBe(true);
    });

    test("should handle additional arguments", () => {
      const errorObj = { code: 500 };
      log("error", "Error occurred", errorObj);
      expect(logs[0]).toContain("Error occurred");
    });
  });

  describe("LOG_LEVELS constant", () => {
    test("should have correct numerical values", () => {
      expect(LOG_LEVELS.error).toBe(0);
      expect(LOG_LEVELS.warn).toBe(1);
      expect(LOG_LEVELS.info).toBe(2);
      expect(LOG_LEVELS.debug).toBe(3);
    });
  });

  describe("CURRENT_LOG_LEVEL constant", () => {
    test("should be a valid number", () => {
      expect(typeof CURRENT_LOG_LEVEL).toBe("number");
      expect(CURRENT_LOG_LEVEL).toBeGreaterThanOrEqual(0);
      expect(CURRENT_LOG_LEVEL).toBeLessThanOrEqual(3);
    });
  });
});
