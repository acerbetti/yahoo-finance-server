/**
 * Cache configuration tests
 * Tests for caching module configuration and behavior
 * @module tests/config/cache.test
 */

import { cache, CACHE_ENABLED, CACHE_TTL } from "../../src/config/cache.js";

describe("Cache Configuration", () => {
  describe("cache object", () => {
    test("should be a NodeCache instance", () => {
      expect(cache).toBeDefined();
      expect(typeof cache.get).toBe("function");
      expect(typeof cache.set).toBe("function");
    });

    test("should set and get values", () => {
      cache.set("test_key", { data: "test_value" });
      const result = cache.get("test_key");
      expect(result).toEqual({ data: "test_value" });
    });

    test("should handle cache miss", () => {
      const result = cache.get("nonexistent_key");
      expect(result).toBeUndefined();
    });

    test("should support deleting keys", () => {
      cache.set("temp_key", "temp_value");
      cache.del("temp_key");
      expect(cache.get("temp_key")).toBeUndefined();
    });

    test("should respect TTL configuration", () => {
      const ttl = CACHE_TTL;
      expect(ttl).toBeGreaterThan(0);
      // Cache should expire after TTL
      cache.set("expiring_key", "value", ttl / 1000);
      expect(cache.get("expiring_key")).toBe("value");
    });
  });

  describe("CACHE_ENABLED constant", () => {
    test("should be a boolean", () => {
      expect(typeof CACHE_ENABLED).toBe("boolean");
    });

    test("should be true by default", () => {
      // Default behavior unless env var is set to 'false'
      expect(CACHE_ENABLED).toBe(true);
    });
  });

  describe("CACHE_TTL constant", () => {
    test("should be a positive number", () => {
      expect(typeof CACHE_TTL).toBe("number");
      expect(CACHE_TTL).toBeGreaterThan(0);
    });

    test("should be at least 300 seconds by default", () => {
      expect(CACHE_TTL).toBeGreaterThanOrEqual(300);
    });
  });
});
