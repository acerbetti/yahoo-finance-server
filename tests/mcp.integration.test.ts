/**
 * MCP integration tests
 * Comprehensive tests for MCP (Model Context Protocol) endpoints and tool execution
 * @module tests/mcp.integration.test
 */

import request from "supertest";
import { jest } from "@jest/globals";

// Mock yahoo-finance2
const mockYahooFinanceInstance = {
  quote: jest.fn() as any,
  historical: jest.fn() as any,
  quoteSummary: jest.fn() as any,
  search: jest.fn() as any,
  trendingSymbols: jest.fn() as any,
  recommendationsBySymbol: jest.fn() as any,
  screener: jest.fn() as any,
  screeners: jest.fn() as any,
  fundamentalsTimeSeries: jest.fn() as any,
};

jest.mock("yahoo-finance2", () => ({
  __esModule: true,
  default: jest.fn(() => mockYahooFinanceInstance),
}));

const mockNewsScraper = {
  fetchArticleContent: jest.fn() as any,
  extractArticleContent: jest.fn() as any,
};

jest.mock("../src/utils/newsScraper.ts", () => mockNewsScraper);

import app from "../src/server";
const yahooFinance = mockYahooFinanceInstance;
const newsScraper = mockNewsScraper;

describe("MCP Server Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /mcp/tools", () => {
    it("should list all available tools including new ones", async () => {
      const res = await request(app).get("/mcp/tools");
      expect(res.statusCode).toBe(200);
      expect(res.body.tools).toBeDefined();

      const toolNames = res.body.tools.map((t) => t.name);
      expect(toolNames).toContain("get_stock_quote");
      expect(toolNames).toContain("get_etf_holdings");
      expect(toolNames).toContain("get_fund_holdings");
      expect(toolNames).toContain("read_news_article");
    });

    it("should return OpenAI-compatible format when requested", async () => {
      const res = await request(app).get("/mcp/tools?format=openai");
      expect(res.statusCode).toBe(200);
      expect(res.body.tools).toBeDefined();

      const tool = res.body.tools[0];
      expect(tool).toHaveProperty("type", "function");
      expect(tool).toHaveProperty("function");
      expect(tool.function).toHaveProperty("name");
      expect(tool.function).toHaveProperty("parameters");
      expect(tool.function.parameters).toHaveProperty("type", "object");
    });
  });

  describe("POST /mcp/call", () => {
    it("should execute get_etf_holdings tool", async () => {
      const mockData = {
        topHoldings: {
          holdings: [
            { symbol: "AAPL", holdingName: "Apple Inc", holdingPercent: 0.05 },
          ],
          sectorWeightings: [{ technology: 0.3 }],
          stockPosition: 0.99,
          bondPosition: 0,
          cashPosition: 0.01,
          otherPosition: 0,
        },
        fundProfile: {
          family: "SPDR",
          categoryName: "Large Blend",
          legalType: "ETF",
          feesExpensesInvestment: {
            annualReportExpenseRatio: 0.0009,
            totalNetAssets: 400000,
          },
        },
      };
      yahooFinance.quoteSummary.mockResolvedValue(mockData);

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "get_etf_holdings",
          arguments: { symbol: "SPY" },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content.symbol).toBe("SPY");
      expect(content.fundName).toBe("SPDR");
      expect(content.topHoldings).toHaveLength(1);
      expect(content.topHoldings[0].symbol).toBe("AAPL");
      expect(yahooFinance.quoteSummary).toHaveBeenCalledWith("SPY", {
        modules: ["topHoldings", "fundProfile"],
      });
    });

    it("should execute get_fund_holdings tool", async () => {
      const mockData = {
        topHoldings: {
          holdings: [
            { symbol: "MSFT", holdingName: "Microsoft", holdingPercent: 0.04 },
          ],
          sectorWeightings: [],
          stockPosition: 0.98,
          bondPosition: 0.01,
          cashPosition: 0.01,
          otherPosition: 0,
        },
        fundProfile: {
          family: "Vanguard",
          categoryName: "Large Blend",
          legalType: "Mutual Fund",
          feesExpensesInvestment: {
            annualReportExpenseRatio: 0.0004,
            totalNetAssets: 800000,
          },
        },
      };
      yahooFinance.quoteSummary.mockResolvedValue(mockData);

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "get_fund_holdings",
          arguments: { symbol: "VFIAX" },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content.symbol).toBe("VFIAX");
      expect(content.family).toBe("Vanguard");
      expect(content.topHoldings).toHaveLength(1);
      expect(content.topHoldings[0].symbol).toBe("MSFT");
    });

    it("should handle missing tools gracefully", async () => {
      const res = await request(app).post("/mcp/call").send({
        name: "non_existent_tool",
        arguments: {},
      });

      expect(res.statusCode).toBe(404);
    });

    it("should execute get_stock_quote tool", async () => {
      const mockQuote = {
        symbol: "AAPL",
        regularMarketPrice: 150.0,
        currency: "USD",
        regularMarketChange: 2.5,
        regularMarketChangePercent: 1.6,
        marketCap: 2500000000000,
      };
      yahooFinance.quote.mockResolvedValue(mockQuote);

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "get_stock_quote",
          arguments: { symbols: "AAPL" },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content).toHaveLength(1);
      expect(content[0].symbol).toBe("AAPL");
      expect(content[0].price).toBe(150.0);
      expect(yahooFinance.quote).toHaveBeenCalledWith("AAPL");
    });

    it("should execute get_stock_history tool", async () => {
      const mockHistory = [
        {
          date: new Date("2023-01-01"),
          open: 100,
          high: 110,
          low: 90,
          close: 105,
          volume: 1000000,
        },
        {
          date: new Date("2023-01-02"),
          open: 105,
          high: 115,
          low: 100,
          close: 110,
          volume: 1200000,
        },
      ];
      yahooFinance.historical.mockResolvedValue(mockHistory);

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "get_stock_history",
          arguments: { symbols: "AAPL", period: "1mo", interval: "1d" },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content).toHaveLength(1);
      expect(content[0].symbol).toBe("AAPL");
      expect(content[0].data).toHaveLength(2);
      expect(yahooFinance.historical).toHaveBeenCalledWith("AAPL", {
        period1: expect.any(Date),
        period2: expect.any(Date),
        interval: "1d",
      });
    });

    it("should execute get_company_info tool", async () => {
      const mockInfo = {
        assetProfile: {
          longName: "Apple Inc.",
          industry: "Consumer Electronics",
          sector: "Technology",
          website: "https://www.apple.com",
          longBusinessSummary:
            "Apple Inc. designs, manufactures, and markets smartphones...",
        },
        financialData: {
          revenuePerShare: 20.5,
          profitMargins: 0.25,
        },
      };
      yahooFinance.quoteSummary.mockResolvedValue(mockInfo);

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "get_company_info",
          arguments: { symbols: "AAPL" },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content).toHaveLength(1);
      expect(content[0].symbol).toBe("AAPL");
      expect(content[0].company).toBe("Apple Inc.");
      expect(content[0].industry).toBe("Consumer Electronics");
    });

    it("should execute search_symbols tool", async () => {
      const mockSearch = {
        quotes: [
          {
            symbol: "AAPL",
            shortname: "Apple Inc.",
            type: "EQUITY",
            exchange: "NMS",
            score: 10000,
          },
          {
            symbol: "MSFT",
            shortname: "Microsoft Corp.",
            type: "EQUITY",
            exchange: "NMS",
            score: 9000,
          },
        ],
      };
      yahooFinance.search.mockResolvedValue(mockSearch);

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "search_symbols",
          arguments: { query: "tech" },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content.query).toBe("tech");
      expect(content.count).toBe(2);
      expect(content.results).toHaveLength(2);
      expect(yahooFinance.search).toHaveBeenCalledWith("tech");
    });

    it("should execute get_trending_symbols tool", async () => {
      const mockTrending = {
        quotes: [
          {
            symbol: "NVDA",
            shortname: "NVIDIA Corp",
            regularMarketPrice: 400,
            regularMarketChange: 10,
            regularMarketChangePercent: 2.5,
          },
        ],
      };
      yahooFinance.trendingSymbols.mockResolvedValue(mockTrending);

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "get_trending_symbols",
          arguments: { region: "US" },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content.region).toBe("US");
      expect(content.symbols).toHaveLength(1);
      expect(content.symbols[0].symbol).toBe("NVDA");
      expect(yahooFinance.trendingSymbols).toHaveBeenCalledWith("US");
    });

    it("should execute get_stock_recommendations tool", async () => {
      const mockRecs = {
        symbol: "AAPL",
        recommendedSymbols: [
          {
            symbol: "AAPL",
            shortname: "Apple",
            recommendationKey: "buy",
            recommendationScore: 2.0,
          },
        ],
      };
      yahooFinance.recommendationsBySymbol.mockResolvedValue(mockRecs);

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "get_stock_recommendations",
          arguments: { symbol: "AAPL" },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content.baseSymbol).toBe("AAPL");
      expect(content.recommendations).toHaveLength(1);
      expect(yahooFinance.recommendationsBySymbol).toHaveBeenCalledWith("AAPL");
    });

    it("should execute get_stock_insights tool", async () => {
      const mockInsights = {
        recommendationTrend: { trend: [] },
        upgradeDowngradeHistory: { history: [] },
        insiderTransactions: { transactions: [] },
        insiderHolders: { holders: [] },
      };
      yahooFinance.quoteSummary.mockResolvedValue(mockInsights);

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "get_stock_insights",
          arguments: { symbol: "AAPL" },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content.symbol).toBe("AAPL");
      expect(content).toHaveProperty("recommendations");
      expect(content).toHaveProperty("insiderTransactions");
    });

    it("should execute get_stock_screener tool", async () => {
      const mockScreener = {
        quotes: [
          {
            symbol: "AMD",
            shortname: "AMD",
            regularMarketPrice: 100,
            regularMarketChange: 5,
            regularMarketChangePercent: 5.0,
          },
        ],
      };
      yahooFinance.screener.mockResolvedValue(mockScreener);

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "get_stock_screener",
          arguments: { type: "day_gainers" },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content.type).toBe("day_gainers");
      expect(content.stocks).toHaveLength(1);
      expect(content.stocks[0].symbol).toBe("AMD");
      expect(yahooFinance.screener).toHaveBeenCalledWith("day_gainers");
    });

    it("should execute analyze_stock_performance tool", async () => {
      const mockHistory = [
        {
          date: new Date("2023-01-01"),
          open: 100,
          high: 110,
          low: 90,
          close: 100,
          volume: 1000000,
        },
        {
          date: new Date("2023-01-02"),
          open: 105,
          high: 115,
          low: 100,
          close: 110,
          volume: 1200000,
        },
      ];
      const mockQuote = {
        regularMarketPrice: 110,
        regularMarketChange: 10,
        regularMarketChangePercent: 10,
      };

      yahooFinance.historical.mockResolvedValue(mockHistory);
      yahooFinance.quote.mockResolvedValue(mockQuote);

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "analyze_stock_performance",
          arguments: { symbol: "AAPL", period: "1mo" },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content.symbol).toBe("AAPL");
      expect(content.totalReturn).toBe("10.00"); // (110-100)/100 * 100
    });

    it("should execute get_financial_statement tool", async () => {
      const mockFinancials = [
        {
          date: new Date("2023-12-31"),
          totalRevenue: 1000000,
          netIncome: 200000,
        },
      ];
      yahooFinance.fundamentalsTimeSeries.mockResolvedValue(mockFinancials);

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "get_financial_statement",
          arguments: { symbol: "AAPL", statementType: "income" },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content.symbol).toBe("AAPL");
      expect(content.type).toBe("income");
      expect(content.statements).toHaveLength(1);
      expect(content.statements[0].totalRevenue).toBe(1000000);
    });

    it("should execute get_stock_news tool", async () => {
      const mockSearch = {
        news: [
          {
            title: "News 1",
            publisher: "Pub 1",
            link: "http://link1",
            providerPublishTime: 1234567890,
            type: "STORY",
            relatedTickers: ["AAPL"],
          },
        ],
      };
      const mockInfo = { assetProfile: { longName: "Apple Inc." } };

      yahooFinance.search.mockResolvedValue(mockSearch);
      yahooFinance.quoteSummary.mockResolvedValue(mockInfo);

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "get_stock_news",
          arguments: { symbol: "AAPL" },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content.symbol).toBe("AAPL");
      expect(content.news).toHaveLength(1);
      expect(content.news[0].title).toBe("News 1");
    });

    it("should execute read_news_article tool", async () => {
      const mockUrl = "https://finance.yahoo.com/news/test-article.html";
      newsScraper.fetchArticleContent.mockResolvedValue({
        status: 200,
        data: "<html><body><h1>Title</h1><p>Content</p></body></html>",
      });
      newsScraper.extractArticleContent.mockReturnValue({
        title: "Test Title",
        content: "Test Content",
      });

      const res = await request(app)
        .post("/mcp/call")
        .send({
          name: "read_news_article",
          arguments: { url: mockUrl },
        });

      expect(res.statusCode).toBe(200);
      const content = JSON.parse(res.body.content[0].text);
      expect(content.title).toBe("Test Title");
      expect(content.content).toBe("Test Content");
      expect(content.url).toBe(mockUrl);
    });
  });
});
