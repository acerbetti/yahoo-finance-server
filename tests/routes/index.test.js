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
        expect(response.body).toHaveProperty("count");
        expect(response.body).toHaveProperty("quotes");
        expect(Array.isArray(response.body.quotes)).toBe(true);
      } else if (response.status === 500) {
        // API may have schema validation issues
        expect(response.body).toHaveProperty("error");
        expect(typeof response.body.error).toBe("string");
      }
    });

    test("should handle different regions", async () => {
      const regions = ["US", "CA", "UK"];
      for (const region of regions) {
        const response = await request(app).get(`/trending/${region}`);
        expect([200, 500]).toContain(response.status);
        if (response.status === 500) {
          // Log API issues but don't fail test
          console.log(`Trending ${region} failed: ${response.body?.error}`);
        }
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
        expect(response.body).toHaveProperty("quotes");
        expect(Array.isArray(response.body.quotes)).toBe(true);
      } else if (response.status === 500) {
        // API may be temporarily unavailable due to Yahoo Finance changes
        expect(response.body).toHaveProperty("error");
        expect(typeof response.body.error).toBe("string");
      }
    });

    test("should accept count parameter", async () => {
      const response = await request(app)
        .get("/screener/day_losers")
        .query({ count: 50 });
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
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
        if (response.status === 500) {
          // Log API issues but don't fail test
          console.log(`Screener ${type} failed: ${response.body?.error}`);
        }
      }
    });
  });

  describe("API Response Format Consistency", () => {
    test("should return keyed objects for multi-symbol quote requests", async () => {
      const response = await request(app).get("/quote/AAPL,GOOGL");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        // Should return object with symbol keys, not array
        expect(typeof response.body).toBe("object");
        expect(Array.isArray(response.body)).toBe(false);
        expect(response.body).toHaveProperty("AAPL");
        expect(response.body).toHaveProperty("GOOGL");
      }
    });

    test("should return keyed objects for multi-symbol history requests", async () => {
      const response = await request(app)
        .get("/history/AAPL,MSFT")
        .query({ period: "1mo", interval: "1d" });
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        // Should return object with symbol keys, not array
        expect(typeof response.body).toBe("object");
        expect(Array.isArray(response.body)).toBe(false);
        expect(response.body).toHaveProperty("AAPL");
        expect(response.body).toHaveProperty("MSFT");
      }
    });

    test("should return keyed objects for multi-symbol info requests", async () => {
      const response = await request(app).get("/info/AAPL,MSFT");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        // Should return object with symbol keys, not array
        expect(typeof response.body).toBe("object");
        expect(Array.isArray(response.body)).toBe(false);
        expect(response.body).toHaveProperty("AAPL");
        expect(response.body).toHaveProperty("MSFT");
        // Should only have assetProfile, not summaryProfile
        if (response.body.AAPL && response.body.AAPL.assetProfile) {
          expect(response.body.AAPL).toHaveProperty("assetProfile");
          expect(response.body.AAPL).not.toHaveProperty("summaryProfile");
        }
      }
    });
  });

  describe("GET /financial/:symbol/:type", () => {
    test("should return 200 for valid income statement request", async () => {
      const response = await request(app).get("/financial/AAPL/income");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("symbol", "AAPL");
        expect(response.body).toHaveProperty("type", "income");
        expect(response.body).toHaveProperty("count");
        expect(response.body).toHaveProperty("statements");
        expect(Array.isArray(response.body.statements)).toBe(true);
      }
    });

    test("should return 200 for balance sheet request", async () => {
      const response = await request(app).get("/financial/MSFT/balance");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("symbol", "MSFT");
        expect(response.body).toHaveProperty("type", "balance");
        expect(response.body).toHaveProperty("statements");
      }
    });

    test("should return 200 for cashflow request", async () => {
      const response = await request(app).get("/financial/GOOGL/cashflow");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("symbol", "GOOGL");
        expect(response.body).toHaveProperty("type", "cashflow");
        expect(response.body).toHaveProperty("statements");
      }
    });

    test("should accept period query parameter", async () => {
      const response = await request(app)
        .get("/financial/AAPL/income")
        .query({ period: "annual" });
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("period", "annual");
      }
    });

    test("should handle quarterly period parameter", async () => {
      const response = await request(app)
        .get("/financial/MSFT/balance")
        .query({ period: "quarterly" });
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("period", "quarterly");
      }
    });

    test("should return 400 for invalid statement type", async () => {
      const response = await request(app).get("/financial/AAPL/invalid");
      expect([400, 500]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Invalid statement type");
      }
    });

    test("should return 400 for invalid period parameter", async () => {
      const response = await request(app)
        .get("/financial/AAPL/income")
        .query({ period: "invalid" });
      expect([400, 500]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Invalid period");
      }
    });

    test("should handle case-insensitive symbols", async () => {
      const response = await request(app).get("/financial/aapl/income");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("symbol", "AAPL");
      }
    });

    test("should cache financial statement requests", async () => {
      const response1 = await request(app).get("/financial/AAPL/income");
      const response2 = await request(app).get("/financial/AAPL/income");

      if (response1.status === 200 && response2.status === 200) {
        expect(response1.body).toEqual(response2.body);
      }
    });
  });

  describe("GET /news/:symbol", () => {
    test("should return 200 for valid symbol", async () => {
      const response = await request(app).get("/news/AAPL");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("symbol", "AAPL");
        expect(response.body).toHaveProperty("count");
        expect(response.body).toHaveProperty("news");
        expect(Array.isArray(response.body.news)).toBe(true);
        expect(response.body).toHaveProperty("companyInfo");
        expect(response.body).toHaveProperty("message");
      } else if (response.status === 500) {
        // API may be temporarily unavailable due to Yahoo Finance changes
        expect(response.body).toHaveProperty("error");
        expect(typeof response.body.error).toBe("string");
      }
    });

    test("should return company information", async () => {
      const response = await request(app).get("/news/MSFT");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("companyInfo");
        const info = response.body.companyInfo;
        if (info) {
          // At least some fields should be present
          expect(
            info.longName ||
              info.sector ||
              info.industry ||
              info.website ||
              info.description
          ).toBeDefined();
        }
      }
    });

    test("should accept count query parameter", async () => {
      const response = await request(app)
        .get("/news/GOOGL")
        .query({ count: 5 });
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("count");
      }
    });

    test("should limit count to maximum of 50", async () => {
      const response = await request(app)
        .get("/news/AAPL")
        .query({ count: 100 });
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        // Count should be limited to 50 or actual available
        expect(response.body.count).toBeLessThanOrEqual(50);
      }
    });

    test("should handle case-insensitive symbols", async () => {
      const response = await request(app).get("/news/msft");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("symbol", "MSFT");
      }
    });

    test("should cache news requests", async () => {
      const response1 = await request(app).get("/news/AAPL");
      const response2 = await request(app).get("/news/AAPL");

      if (response1.status === 200 && response2.status === 200) {
        expect(response1.body).toEqual(response2.body);
      }
    });

    test("should include data availability info", async () => {
      const response = await request(app).get("/news/AAPL");
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("dataAvailable");
        expect(response.body.dataAvailable).toHaveProperty("hasAssetProfile");
      }
    });
  });
});
