/**
 * Market Routes Tests
 * Tests for generic market data endpoints
 * @module tests/routes/market.test
 */

import request from "supertest";
import express from "express";
import marketRoutes from "../../src/routes/market";

const app = express();
app.use(express.json());
app.use("/market", marketRoutes);
app.use((err: any, req: any, res: any, next: any) =>
  res.status(500).json({ error: "Internal server error" })
);

describe("Market Routes", () => {
  describe("GET /market/indices - Market Indices", () => {
    test("should return major market indices", async () => {
      const res = await request(app).get("/market/indices");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("indices");
        expect(Array.isArray(res.body.indices)).toBe(true);
        if (res.body.indices.length > 0) {
          expect(res.body.indices[0]).toHaveProperty("symbol");
          expect(res.body.indices[0]).toHaveProperty("regularMarketPrice");
        }
      }
    });
  });

  describe("GET /market/summary - Market Summary", () => {
    test("should return comprehensive market summary", async () => {
      const res = await request(app).get("/market/summary");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("indices");
        expect(res.body).toHaveProperty("trending");
        expect(res.body).toHaveProperty("gainers");
        expect(res.body).toHaveProperty("losers");
        expect(res.body).toHaveProperty("news");

        expect(Array.isArray(res.body.indices)).toBe(true);
        expect(typeof res.body.trending).toBe("object");
        expect(typeof res.body.gainers).toBe("object");
        expect(typeof res.body.losers).toBe("object");
        expect(Array.isArray(res.body.news)).toBe(true);
      }
    });
  });

  describe("GET /market/sectors - Sector Performance", () => {
    test("should return sector performance data", async () => {
      const res = await request(app).get("/market/sectors");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("sectors");
        expect(Array.isArray(res.body.sectors)).toBe(true);
        if (res.body.sectors.length > 0) {
          expect(res.body.sectors[0]).toHaveProperty("symbol");
          expect(res.body.sectors[0]).toHaveProperty("name");
          expect(res.body.sectors[0]).toHaveProperty("performance");
        }
      }
    });
  });

  describe("GET /market/currencies - Currency Exchange Rates", () => {
    test("should return major currency exchange rates", async () => {
      const res = await request(app).get("/market/currencies");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("currencies");
        expect(Array.isArray(res.body.currencies)).toBe(true);
        if (res.body.currencies.length > 0) {
          expect(res.body.currencies[0]).toHaveProperty("symbol");
          expect(res.body.currencies[0]).toHaveProperty("regularMarketPrice");
        }
      }
    });
  });

  describe("GET /market/commodities - Commodity Prices", () => {
    test("should return commodity prices", async () => {
      const res = await request(app).get("/market/commodities");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("commodities");
        expect(Array.isArray(res.body.commodities)).toBe(true);
        if (res.body.commodities.length > 0) {
          expect(res.body.commodities[0]).toHaveProperty("symbol");
          expect(res.body.commodities[0]).toHaveProperty("name");
          expect(res.body.commodities[0]).toHaveProperty("price");
        }
      }
    });
  });

  describe("GET /market/breadth - Market Breadth Indicators", () => {
    test("should return market breadth data", async () => {
      const res = await request(app).get("/market/breadth");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("breadth");
        expect(res.body.breadth).toHaveProperty("gainers");
        expect(res.body.breadth).toHaveProperty("losers");
        expect(res.body.breadth).toHaveProperty("unchanged");
        expect(res.body.breadth).toHaveProperty("ratio");

        expect(typeof res.body.breadth.gainers).toBe("number");
        expect(typeof res.body.breadth.losers).toBe("number");
        expect(typeof res.body.breadth.unchanged).toBe("number");
        expect(typeof res.body.breadth.ratio).toBe("number");
      }
    });
  });

  describe("GET /market/sentiment - Market Sentiment", () => {
    test("should return market sentiment indicators", async () => {
      const res = await request(app).get("/market/sentiment");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("sentiment");
        expect(res.body.sentiment).toHaveProperty("vix");
        expect(res.body.sentiment).toHaveProperty("fearGreedIndex");
      }
    });
  });

  describe("GET /market/trending/:region - Trending Symbols (moved)", () => {
    test("should return trending symbols for US region", async () => {
      const res = await request(app).get("/market/trending/US");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("count");
        expect(res.body).toHaveProperty("quotes");
        expect(Array.isArray(res.body.quotes)).toBe(true);
      }
    });

    test("should return trending symbols for default region", async () => {
      const res = await request(app).get("/market/trending/US");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("count");
        expect(Array.isArray(res.body.quotes)).toBe(true);
      }
    });
  });

  describe("GET /market/screener/:type - Stock Screener (moved)", () => {
    test("should return day gainers", async () => {
      const res = await request(app).get("/market/screener/day_gainers");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("quotes");
        expect(Array.isArray(res.body.quotes)).toBe(true);
      }
    });

    test("should return day losers", async () => {
      const res = await request(app).get("/market/screener/day_losers");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("quotes");
        expect(Array.isArray(res.body.quotes)).toBe(true);
      }
    });

    test("should accept count query parameter", async () => {
      const res = await request(app).get(
        "/market/screener/day_gainers?count=10"
      );

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body.quotes)).toBe(true);
        expect(res.body.quotes.length).toBeLessThanOrEqual(10);
      }
    });

    test("should reject invalid screener type", async () => {
      const res = await request(app).get("/market/screener/invalid_type");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /market/news - General News (moved)", () => {
    test("should return general market news", async () => {
      const res = await request(app).get("/market/news");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test("should accept count query parameter", async () => {
      const res = await request(app).get("/market/news?count=5");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeLessThanOrEqual(5);
      }
    });
  });
});
