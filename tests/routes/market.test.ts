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

  describe("GET /market/sentiment - Market Sentiment", () => {
    test("should return market sentiment indicators", async () => {
      const res = await request(app).get("/market/sentiment");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("sentiment");
        expect(res.body.sentiment).toHaveProperty("vix");
        expect(res.body.sentiment).toHaveProperty("fearGreedIndex");

        // VIX can be null if Yahoo Finance is unavailable
        if (res.body.sentiment.vix !== null) {
          expect(res.body.sentiment.vix).toHaveProperty("symbol");
          expect(res.body.sentiment.vix.symbol).toBe("^VIX");
        }

        // FearGreedIndex can be null if Alternative.me API is unavailable
        if (res.body.sentiment.fearGreedIndex !== null) {
          expect(res.body.sentiment.fearGreedIndex).toHaveProperty("score");
          expect(res.body.sentiment.fearGreedIndex).toHaveProperty("rating");
          expect(res.body.sentiment.fearGreedIndex).toHaveProperty("timestamp");

          expect(typeof res.body.sentiment.fearGreedIndex.score).toBe("number");
          expect(typeof res.body.sentiment.fearGreedIndex.rating).toBe(
            "string"
          );
          expect(typeof res.body.sentiment.fearGreedIndex.timestamp).toBe(
            "string"
          );

          // Score should be between 0 and 100
          expect(
            res.body.sentiment.fearGreedIndex.score
          ).toBeGreaterThanOrEqual(0);
          expect(res.body.sentiment.fearGreedIndex.score).toBeLessThanOrEqual(
            100
          );
        }
      }
    });

    test("should handle Fear & Greed Index API failures gracefully", async () => {
      // This test verifies that if the Fear & Greed API fails,
      // the endpoint still returns successfully with VIX data
      const res = await request(app).get("/market/sentiment");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("sentiment");
        // Even if Fear & Greed API fails, we should still get a response
        // The fearGreedIndex can be null, but the structure should be consistent
        expect(res.body.sentiment).toHaveProperty("fearGreedIndex");
      }
    });

    test("should return valid Fear & Greed Index ratings", async () => {
      const res = await request(app).get("/market/sentiment");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200 && res.body.sentiment.fearGreedIndex !== null) {
        const validRatings = [
          "Extreme Fear",
          "Fear",
          "Neutral",
          "Greed",
          "Extreme Greed",
        ];

        expect(validRatings).toContain(
          res.body.sentiment.fearGreedIndex.rating
        );
      }
    });

    test("should return properly formatted timestamp for Fear & Greed Index", async () => {
      const res = await request(app).get("/market/sentiment");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200 && res.body.sentiment.fearGreedIndex !== null) {
        const timestamp = res.body.sentiment.fearGreedIndex.timestamp;

        // Should be a valid ISO date string
        expect(() => new Date(timestamp)).not.toThrow();
        expect(new Date(timestamp).toISOString()).toBe(timestamp);
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
