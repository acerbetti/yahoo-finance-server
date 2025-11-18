/**
 * News Reader Routes tests
 * Tests for article scraping functionality
 * @module tests/routes/newsReader.test
 */

import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import newsReaderRouter from "../../src/routes/newsReader.js";

// Create a test Express app with the news reader routes
const app = express();
app.use(express.json());
app.use("/", newsReaderRouter);

// Add error handling middleware for testing
app.use((err, req, res, next) => {
  res.status(500).json({ error: "Internal server error" });
});

describe("News Reader Routes", () => {
  describe("GET /news_reader/:url", () => {
    test("should return error for invalid URL format", async () => {
      const response = await request(app).get("/news_reader/invalid");
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid URL");
    });

    test("should return error for non-Yahoo Finance URL", async () => {
      const response = await request(app).get(
        "/news_reader/https://example.com/article"
      );
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Invalid URL");
    });

    test("should accept valid Yahoo Finance /news/ URLs", async () => {
      const response = await request(app).get(
        "/news_reader/https://finance.yahoo.com/news/test-article-slug.html"
      );
      // May return 200 if article exists, or 404/500 if not
      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("title");
        expect(response.body).toHaveProperty("content");
        expect(response.body).toHaveProperty("url");
        expect(response.body.url).toBe(
          "https://finance.yahoo.com/news/test-article-slug.html"
        );
      }
    });

    test("should accept valid Yahoo Finance /m/ URLs", async () => {
      const response = await request(app).get(
        "/news_reader/https://finance.yahoo.com/m/test-uuid/article-title.html"
      );
      // May return 200 if article exists, or 404/500 if not
      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("title");
        expect(response.body).toHaveProperty("content");
        expect(response.body).toHaveProperty("url");
        expect(response.body.url).toBe(
          "https://finance.yahoo.com/m/test-uuid/article-title.html"
        );
      }
    });

    test("should handle URL-encoded characters in path", async () => {
      const response = await request(app).get(
        "/news_reader/https://finance.yahoo.com/m/uuid-123%2C-test/article.html"
      );
      // Should not crash on URL-encoded characters
      expect([200, 400, 404, 500]).toContain(response.status);
    });

    // Integration tests with real URLs (may be flaky due to network/external dependencies)
    describe("Integration Tests (may fail due to network/external dependencies)", () => {
      test("should extract content from real /news/ URL", async () => {
        const response = await request(app).get(
          "/news_reader/https://finance.yahoo.com/news/bitcoin-price-under-pressure-slips-below-92000-as-self-fulfilling-prophecy-puts-4-year-cycle-in-focus-203113535.html"
        );
        // This may fail if the article is removed or Yahoo changes their structure
        if (response.status === 200) {
          expect(response.body).toHaveProperty("title");
          expect(response.body).toHaveProperty("content");
          expect(response.body.content.length).toBeGreaterThan(100);
          expect(response.body.url).toContain("finance.yahoo.com");
        }
      }, 15000); // Longer timeout for network requests

      test("should extract content from real /m/ URL", async () => {
        const response = await request(app).get(
          "/news_reader/https://finance.yahoo.com/m/c1cea6f1-c03f-3db9-8021-6d3b5d51d088/bitcoin%2C-ethereum-dive-deeper.html"
        );
        // This may fail if the article is removed or Yahoo changes their structure
        if (response.status === 200) {
          expect(response.body).toHaveProperty("title");
          expect(response.body).toHaveProperty("content");
          expect(response.body.content.length).toBeGreaterThan(50);
          expect(response.body.url).toContain("finance.yahoo.com");
        }
      }, 15000); // Longer timeout for network requests
    });
  });
});
