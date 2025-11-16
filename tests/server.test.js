import { jest } from "@jest/globals";

// Mock the yahoo module before importing app
const mockYahooFinance = {
  quoteSummary: jest.fn(),
  chart: jest.fn(),
};

jest.unstable_mockModule("../src/yahoo.js", () => ({
  default: mockYahooFinance,
}));

import request from "supertest";
import app from "../src/server.js";

describe("/health", () => {
  it("should return status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("/quote/:symbols", () => {
  afterEach(() => {
    mockYahooFinance.quoteSummary.mockClear();
  });

  it("should return quote data for single symbol", async () => {
    mockYahooFinance.quoteSummary.mockResolvedValue({
      symbol: "AAPL",
      regularMarketPrice: 150,
    });
    const res = await request(app).get("/quote/AAPL");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("AAPL");
  });

  it("should return quote data for multiple symbols", async () => {
    mockYahooFinance.quoteSummary
      .mockResolvedValueOnce({ symbol: "AAPL", regularMarketPrice: 150 })
      .mockResolvedValueOnce({ symbol: "GOOGL", regularMarketPrice: 2800 });
    const res = await request(app).get("/quote/AAPL,GOOGL");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("AAPL");
    expect(res.body).toHaveProperty("GOOGL");
  });

  it("should handle errors gracefully", async () => {
    mockYahooFinance.quoteSummary.mockRejectedValue(new Error("API error"));
    const res = await request(app).get("/quote/INVALID");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("INVALID");
    expect(res.body.INVALID).toHaveProperty("error");
  });
});

describe("/history/:symbols", () => {
  beforeEach(() => {
    mockYahooFinance.chart.mockReset();
  });

  it("should return historical data for single symbol", async () => {
    mockYahooFinance.chart.mockResolvedValueOnce({
      quotes: [{ date: "2023-01-01", close: 150 }],
    });
    const res = await request(app).get("/history/AAPL");
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe("object");
    expect(Array.isArray(res.body)).toBe(false);
    expect(res.body).toHaveProperty("AAPL");
    expect(Array.isArray(res.body.AAPL)).toBe(true);
    expect(res.body.AAPL.length).toBeGreaterThan(0);
  });

  it("should return historical data for multiple symbols", async () => {
    mockYahooFinance.chart
      .mockResolvedValueOnce({ quotes: [{ date: "2023-01-01", close: 150 }] })
      .mockResolvedValueOnce({ quotes: [{ date: "2023-01-01", close: 2800 }] });
    const res = await request(app).get("/history/AAPL,GOOGL");
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe("object");
    expect(Array.isArray(res.body)).toBe(false);
    expect(res.body).toHaveProperty("AAPL");
    expect(res.body).toHaveProperty("GOOGL");
    expect(Array.isArray(res.body.AAPL)).toBe(true);
    expect(Array.isArray(res.body.GOOGL)).toBe(true);
  });

  it("should handle partial failures", async () => {
    mockYahooFinance.chart
      .mockResolvedValueOnce({ quotes: [{ date: "2023-01-01", close: 150 }] })
      .mockRejectedValueOnce(new Error("Invalid symbol"));
    const res = await request(app).get("/history/AAPL,INVALID");
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe("object");
    expect(Array.isArray(res.body)).toBe(false);
    expect(res.body).toHaveProperty("AAPL");
    expect(res.body).toHaveProperty("INVALID");
    expect(Array.isArray(res.body.AAPL)).toBe(true);
    expect(res.body.INVALID).toHaveProperty("error");
  });
});

describe("/info/:symbols", () => {
  afterEach(() => {
    mockYahooFinance.quoteSummary.mockClear();
  });

  it("should return info data for single symbol", async () => {
    mockYahooFinance.quoteSummary.mockResolvedValue({
      assetProfile: { name: "Apple Inc." },
    });
    const res = await request(app).get("/info/AAPL");
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe("object");
    expect(Array.isArray(res.body)).toBe(false);
    expect(res.body).toHaveProperty("AAPL");
  });

  it("should handle errors gracefully", async () => {
    mockYahooFinance.quoteSummary.mockRejectedValue(new Error("API error"));
    const res = await request(app).get("/info/INVALID");
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe("object");
    expect(Array.isArray(res.body)).toBe(false);
    expect(res.body).toHaveProperty("INVALID");
    expect(res.body.INVALID).toHaveProperty("error");
  });
});

describe("CORS Configuration", () => {
  it("should include CORS headers in responses", async () => {
    const origin = "https://example.com";
    const res = await request(app)
      .options("/health")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "GET");

    expect(res.status).toBe(204); // OPTIONS requests typically return 204
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
    expect(res.headers["access-control-allow-methods"]).toContain("GET");
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
    expect(res.headers["access-control-allow-methods"]).toContain("OPTIONS");
    expect(res.headers["access-control-allow-headers"]).toContain(
      "Content-Type"
    );
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("should allow requests from any origin", async () => {
    const origin = "https://finance.caplaz.com";
    const res = await request(app).get("/health").set("Origin", origin);

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
  });

  it("should handle preflight requests correctly", async () => {
    const origin = "http://localhost:3000";
    const res = await request(app)
      .options("/quote/AAPL")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "Content-Type, Authorization");

    expect(res.status).toBe(204); // OPTIONS requests typically return 204
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
    expect(res.headers["access-control-allow-methods"]).toContain("GET");
    expect(res.headers["access-control-allow-headers"]).toContain(
      "Content-Type"
    );
    expect(res.headers["access-control-allow-headers"]).toContain(
      "Authorization"
    );
  });
});
