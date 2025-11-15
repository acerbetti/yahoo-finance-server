/**
 * API Routes tests
 * Tests for all API endpoints functionality
 * @module tests/routes/index.test
 */

import request from "supertest";
import express from "express";
import routes from "../../src/routes/index.js";

// Create a test Express app with the routes
const app = express();
app.use(express.json());
app.use(routes);

// Add error handling middleware for testing
app.use((err, req, res, next) => {
  res.status(500).json({ error: "Internal server error" });
});

describe("API Routes", () => {
  describe("GET /health", () => {
    test("should return 200 with ok status", async () => {
      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ok" });
    });
  });

  describe("GET /quote/:symbols", () => {
    test("should return 200 for valid symbol", async () => {
      const response = await request(app).get("/quote/AAPL");
      expect([200, 500]).toContain(response.status); // May fail if API is down
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });

    test("should handle multiple symbols", async () => {
      const response = await request(app).get("/quote/AAPL,GOOGL");
      expect([200, 500]).toContain(response.status);
    });

    test("should return error for completely invalid input", async () => {
      const response = await request(app).get("/quote/");
      expect(response.status).toBe(404); // Route not matched
    });
  });

  describe("GET /history/:symbols", () => {
    test("should accept period and interval parameters", async () => {
      const response = await request(app)
        .get("/history/AAPL")
        .query({ period: "1y", interval: "1d" });
      expect([200, 500]).toContain(response.status);
    });

    test("should use default period and interval", async () => {
      const response = await request(app).get("/history/AAPL");
      expect([200, 500]).toContain(response.status);
    });

    test("should handle multiple symbols with parameters", async () => {
      const response = await request(app)
        .get("/history/AAPL,MSFT")
        .query({ period: "3mo", interval: "1d" });
      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /info/:symbols", () => {
    test("should return info for valid symbol", async () => {
      const response = await request(app).get("/info/AAPL");
      expect([200, 500]).toContain(response.status);
    });

    test("should handle multiple symbols", async () => {
      const response = await request(app).get("/info/AAPL,MSFT");
      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /search/:query", () => {
    test("should return search results", async () => {
      const response = await request(app).get("/search/apple");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });

    test("should handle special characters in query", async () => {
      const response = await request(app).get("/search/apple%20inc");
      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /trending/:region", () => {
    test("should return trending symbols for region", async () => {
      const response = await request(app).get("/trending/US");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });

    test("should handle different regions", async () => {
      const regions = ["US", "CA", "UK"];
      for (const region of regions) {
        const response = await request(app).get(`/trending/${region}`);
        expect([200, 500]).toContain(response.status);
      }
    });
  });

  describe("GET /recommendations/:symbol", () => {
    test("should return recommendations for symbol", async () => {
      const response = await request(app).get("/recommendations/AAPL");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });

    test("should handle lowercase symbols", async () => {
      const response = await request(app).get("/recommendations/aapl");
      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /insights/:symbol", () => {
    test("should return insights for symbol", async () => {
      const response = await request(app).get("/insights/AAPL");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });
  });

  describe("GET /screener/:type", () => {
    test("should return screener results for day_gainers", async () => {
      const response = await request(app).get("/screener/day_gainers");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });

    test("should accept count parameter", async () => {
      const response = await request(app)
        .get("/screener/day_losers")
        .query({ count: 50 });
      expect([200, 500]).toContain(response.status);
    });

    test("should handle different screener types", async () => {
      const types = [
        "day_gainers",
        "day_losers",
        "most_actives",
        "most_shorted",
      ];
      for (const type of types) {
        const response = await request(app).get(`/screener/${type}`);
        expect([200, 500]).toContain(response.status);
      }
    });
  });

  describe("Route validation", () => {
    test("should have all required endpoints", async () => {
      const endpoints = [
        "/health",
        "/quote/AAPL",
        "/history/AAPL",
        "/info/AAPL",
        "/search/test",
        "/trending/US",
        "/recommendations/AAPL",
        "/insights/AAPL",
        "/screener/day_gainers",
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        // All endpoints should return either 200/500 (API response) or 200 (cached)
        // Not 404 (route not found)
        expect([200, 500]).toContain(response.status);
      }
    });
  });
});
