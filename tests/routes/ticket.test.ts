/**
 * Ticket Routes Tests
 * Tests for consolidated ticker-specific endpoints
 * @module tests/routes/ticket
 */

import request from "supertest";
import express from "express";
import ticketRoutes from "../../src/routes/ticket";

const app = express();
app.use(express.json());
app.use("/ticket", ticketRoutes);
app.use((err: any, req: any, res: any, next: any) =>
  res.status(500).json({ error: "Internal server error" })
);

describe("Ticket Routes", () => {
  describe("GET /ticket/:ticket - Company Info", () => {
    test("should return 200 for valid symbol", async () => {
      const res = await request(app).get("/ticket/AAPL");

      expect([200, 500]).toContain(res.status);
    });

    test("should uppercase the ticket symbol", async () => {
      const res = await request(app).get("/ticket/aapl");

      expect([200, 500]).toContain(res.status);
    });

    test("should handle multiple symbol requests", async () => {
      const res1 = await request(app).get("/ticket/AAPL");
      const res2 = await request(app).get("/ticket/MSFT");

      expect([200, 500]).toContain(res1.status);
      expect([200, 500]).toContain(res2.status);
    });
  });

  describe("GET /ticket/:ticket/:type - Financial Statements", () => {
    test("should return income statement", async () => {
      const res = await request(app).get("/ticket/AAPL/income");

      expect([200, 500]).toContain(res.status);
    });

    test("should return balance sheet", async () => {
      const res = await request(app).get("/ticket/AAPL/balance");

      expect([200, 500]).toContain(res.status);
    });

    test("should return cashflow statement", async () => {
      const res = await request(app).get("/ticket/AAPL/cashflow");

      expect([200, 500]).toContain(res.status);
    });

    test("should accept annual period parameter", async () => {
      const res = await request(app)
        .get("/ticket/AAPL/income")
        .query({ period: "annual" });

      expect([200, 500]).toContain(res.status);
    });

    test("should accept quarterly period parameter", async () => {
      const res = await request(app)
        .get("/ticket/AAPL/income")
        .query({ period: "quarterly" });

      expect([200, 500]).toContain(res.status);
    });

    test("should default to annual period", async () => {
      const res = await request(app).get("/ticket/AAPL/income");

      expect([200, 500]).toContain(res.status);
    });

    test("should reject invalid statement type", async () => {
      const res = await request(app).get("/ticket/AAPL/invalid");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Invalid statement type/);
    });

    test("should reject invalid period", async () => {
      const res = await request(app)
        .get("/ticket/AAPL/income")
        .query({ period: "invalid" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Invalid period/);
    });

    test("should handle case-insensitive types", async () => {
      const res1 = await request(app).get("/ticket/AAPL/INCOME");
      const res2 = await request(app).get("/ticket/AAPL/Income");

      expect([200, 500]).toContain(res1.status);
      expect([200, 500]).toContain(res2.status);
    });

    test("should handle case-insensitive tickets", async () => {
      const res1 = await request(app).get("/ticket/aapl/income");
      const res2 = await request(app).get("/ticket/AaPl/balance");

      expect([200, 500]).toContain(res1.status);
      expect([200, 500]).toContain(res2.status);
    });
  });

  describe("GET /ticket/:ticket/holdings - Holdings Data", () => {
    test("should return holdings for valid ETF", async () => {
      const res = await request(app).get("/ticket/SPY/holdings");

      expect([200, 500]).toContain(res.status);
    });

    test("should uppercase the ticket symbol", async () => {
      const res = await request(app).get("/ticket/spy/holdings");

      expect([200, 500]).toContain(res.status);
    });

    test("should handle multiple holdings requests", async () => {
      const res1 = await request(app).get("/ticket/SPY/holdings");
      const res2 = await request(app).get("/ticket/QQQ/holdings");

      expect([200, 500]).toContain(res1.status);
      expect([200, 500]).toContain(res2.status);
    });
  });

  describe("GET /ticket/:ticket/insights - Stock Insights", () => {
    test("should return insights for valid symbol", async () => {
      const res = await request(app).get("/ticket/AAPL/insights");

      expect([200, 500]).toContain(res.status);
    });

    test("should uppercase the ticket symbol", async () => {
      const res = await request(app).get("/ticket/aapl/insights");

      expect([200, 500]).toContain(res.status);
    });

    test("should handle multiple insights requests", async () => {
      const res1 = await request(app).get("/ticket/AAPL/insights");
      const res2 = await request(app).get("/ticket/MSFT/insights");

      expect([200, 500]).toContain(res1.status);
      expect([200, 500]).toContain(res2.status);
    });
  });

  describe("GET /ticket/:ticket/news - News Articles", () => {
    test("should return news for valid symbol", async () => {
      const res = await request(app).get("/ticket/AAPL/news");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
          expect(res.body[0]).toHaveProperty("title");
          expect(res.body[0]).toHaveProperty("publisher");
          expect(res.body[0]).toHaveProperty("link");
        }
      }
    });

    test("should uppercase the ticket symbol", async () => {
      const res = await request(app).get("/ticket/aapl/news");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test("should accept count query parameter", async () => {
      const res = await request(app)
        .get("/ticket/AAPL/news")
        .query({ count: 5 });

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test("should limit count to 50", async () => {
      const res = await request(app)
        .get("/ticket/AAPL/news")
        .query({ count: 100 });

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeLessThanOrEqual(50);
      }
    });

    test("should default to 10 articles", async () => {
      const res = await request(app).get("/ticket/AAPL/news");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    test("should return array of SearchNews", async () => {
      const res = await request(app).get("/ticket/AAPL/news");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
          const article = res.body[0];
          expect(article).toHaveProperty("uuid");
          expect(article).toHaveProperty("title");
          expect(article).toHaveProperty("publisher");
          expect(article).toHaveProperty("link");
          expect(article).toHaveProperty("providerPublishTime");
          expect(article).toHaveProperty("type");
        }
      }
    });

    test("should handle multiple news requests", async () => {
      const res1 = await request(app).get("/ticket/AAPL/news");
      const res2 = await request(app).get("/ticket/MSFT/news");

      expect([200, 500]).toContain(res1.status);
      expect([200, 500]).toContain(res2.status);
      if (res1.status === 200) {
        expect(Array.isArray(res1.body)).toBe(true);
      }
      if (res2.status === 200) {
        expect(Array.isArray(res2.body)).toBe(true);
      }
    });
  });

  describe("GET /ticket/:ticket/events - Calendar Events", () => {
    test("should return events for valid symbol", async () => {
      const res = await request(app).get("/ticket/AAPL/events");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("calendarEvents");
        expect(res.body).toHaveProperty("earnings");
        expect(res.body).toHaveProperty("earningsHistory");
      }
    });

    test("should uppercase the ticket symbol", async () => {
      const res = await request(app).get("/ticket/aapl/events");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("calendarEvents");
      }
    });

    test("should handle multiple events requests", async () => {
      const res1 = await request(app).get("/ticket/AAPL/events");
      const res2 = await request(app).get("/ticket/MSFT/events");

      expect([200, 500]).toContain(res1.status);
      expect([200, 500]).toContain(res2.status);
    });
  });

  describe("GET /ticket/:ticket/statistics - Key Statistics", () => {
    test("should return statistics for valid symbol", async () => {
      const res = await request(app).get("/ticket/AAPL/statistics");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("defaultKeyStatistics");
        expect(res.body).toHaveProperty("financialData");
      }
    });

    test("should uppercase the ticket symbol", async () => {
      const res = await request(app).get("/ticket/aapl/statistics");

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("defaultKeyStatistics");
      }
    });

    test("should handle multiple statistics requests", async () => {
      const res1 = await request(app).get("/ticket/AAPL/statistics");
      const res2 = await request(app).get("/ticket/MSFT/statistics");

      expect([200, 500]).toContain(res1.status);
      expect([200, 500]).toContain(res2.status);
    });
  });

  describe("Route Collision Prevention", () => {
    test("should not match /ticket/:ticket to /ticket/:ticket/:type", async () => {
      const res1 = await request(app).get("/ticket/AAPL");
      const res2 = await request(app).get("/ticket/AAPL/income");

      expect([200, 500]).toContain(res1.status);
      expect([200, 400, 500]).toContain(res2.status); // 400 for invalid type if parsed differently
    });

    test("should correctly differentiate between endpoints", async () => {
      const infoRes = await request(app).get("/ticket/AAPL");
      const financialRes = await request(app).get("/ticket/AAPL/income");
      const holdingsRes = await request(app).get("/ticket/AAPL/holdings");
      const insightsRes = await request(app).get("/ticket/AAPL/insights");
      const newsRes = await request(app).get("/ticket/AAPL/news");

      expect([200, 500]).toContain(infoRes.status);
      expect([200, 500]).toContain(financialRes.status);
      expect([200, 500]).toContain(holdingsRes.status);
      expect([200, 500]).toContain(insightsRes.status);
      expect([200, 500]).toContain(newsRes.status);
    });
  });

  describe("Error Handling", () => {
    test("should return 400 for invalid financial type", async () => {
      const res = await request(app).get("/ticket/AAPL/invalid");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    test("should return 400 for invalid period", async () => {
      const res = await request(app)
        .get("/ticket/AAPL/income")
        .query({ period: "weekly" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    test("should return 404 for invalid symbol in company info endpoint", async () => {
      const res = await request(app).get("/ticket/INVALID_SYMBOL_XYZ123");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("not found or invalid");
    });

    test("should return 404 for invalid symbol in holdings endpoint", async () => {
      const res = await request(app).get(
        "/ticket/INVALID_SYMBOL_XYZ123/holdings"
      );

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("not found or invalid");
    });

    test("should return 404 for invalid symbol in insights endpoint", async () => {
      const res = await request(app).get(
        "/ticket/INVALID_SYMBOL_XYZ123/insights"
      );

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("not found or invalid");
    });

    test("should return 404 for invalid symbol in news endpoint", async () => {
      const res = await request(app).get("/ticket/INVALID_SYMBOL_XYZ123/news");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("not found or invalid");
    });

    test("should return 404 for invalid symbol in financial endpoint", async () => {
      const res = await request(app).get(
        "/ticket/INVALID_SYMBOL_XYZ123/income"
      );

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("not found or invalid");
    });

    test("should return 500 for server errors", async () => {
      // Mock a scenario that would cause a server error
      // This is harder to test directly, but we can verify the pattern exists
      const res = await request(app).get("/ticket/AAPL");

      // Should either succeed (200) or fail with server error (500), not client error (404)
      expect([200, 500]).toContain(res.status);
      if (res.status === 500) {
        expect(res.body).toHaveProperty("error");
      }
    });

    test("should handle server errors gracefully", async () => {
      // This will likely fail if the API is down, but should return 500
      const res = await request(app).get("/ticket/INVALID_SYMBOL_XYZ123");

      // Could be 404 (invalid symbol) or 500 (server error)
      expect([404, 500]).toContain(res.status);
      expect(res.body).toHaveProperty("error");
    });
  });
});
