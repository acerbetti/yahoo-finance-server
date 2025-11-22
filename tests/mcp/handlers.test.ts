/**
 * MCP Handlers Tests
 * Tests for MCP tool handler functions
 * @module tests/mcp/handlers.test
 */

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

jest.unstable_mockModule("yahoo-finance2", () => ({
  default: jest.fn(() => mockYahooFinanceInstance),
}));

const mockNewsScraper = {
  fetchArticleContent: jest.fn() as any,
  extractArticleContent: jest.fn() as any,
};

jest.unstable_mockModule("../../src/utils/newsScraper.ts", () => ({
  fetchArticleContent: mockNewsScraper.fetchArticleContent,
  extractArticleContent: mockNewsScraper.extractArticleContent,
}));

const mockCache = {
  get: jest.fn() as any,
  set: jest.fn() as any,
};

jest.unstable_mockModule("../../src/config/cache.ts", () => ({
  cache: mockCache,
  CACHE_ENABLED: true,
}));

// Import handlers dynamically AFTER mocking
const { toolHandlers } = await import("../../src/mcp/handlers");
const yahooFinance = mockYahooFinanceInstance;
const newsScraper = mockNewsScraper;
const cache = mockCache;

describe("MCP Tool Handlers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset cache mocks to return undefined (cache miss)
    mockCache.get.mockResolvedValue(undefined);
    mockCache.set.mockResolvedValue(undefined);
  });

  describe("get_stock_quote handler", () => {
    test("should handle single symbol", async () => {
      const mockQuote = {
        symbol: "AAPL",
        regularMarketPrice: 150.0,
        currency: "USD",
        regularMarketChange: 2.5,
        regularMarketChangePercent: 1.6,
        marketCap: 2500000000000,
      };
      yahooFinance.quote.mockResolvedValue(mockQuote);

      const result = await toolHandlers.get_stock_quote("AAPL");

      expect(yahooFinance.quote).toHaveBeenCalledWith("AAPL");
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("AAPL");
      expect(result[0].price).toBe(150.0);
    });

    test("should handle multiple symbols", async () => {
      const mockQuote1 = {
        symbol: "AAPL",
        regularMarketPrice: 150.0,
        currency: "USD",
        regularMarketChange: 2.5,
        regularMarketChangePercent: 1.6,
        marketCap: 2500000000000,
      };
      const mockQuote2 = {
        symbol: "MSFT",
        regularMarketPrice: 300.0,
        currency: "USD",
        regularMarketChange: -1.5,
        regularMarketChangePercent: -0.5,
        marketCap: 2200000000000,
      };
      yahooFinance.quote.mockResolvedValueOnce(mockQuote1);
      yahooFinance.quote.mockResolvedValueOnce(mockQuote2);

      const result = await toolHandlers.get_stock_quote("AAPL,MSFT");

      expect(yahooFinance.quote).toHaveBeenCalledWith("AAPL");
      expect(yahooFinance.quote).toHaveBeenCalledWith("MSFT");
      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe("AAPL");
      expect(result[1].symbol).toBe("MSFT");
    });
  });

  describe("get_stock_history handler", () => {
    test("should fetch historical data with default parameters", async () => {
      const mockHistory = [
        {
          date: new Date("2023-01-01"),
          open: 100,
          high: 110,
          low: 90,
          close: 105,
          volume: 1000000,
        },
      ];
      yahooFinance.historical.mockResolvedValue(mockHistory);

      const result = await toolHandlers.get_stock_history("AAPL");

      expect(yahooFinance.historical).toHaveBeenCalledWith("AAPL", {
        period1: expect.any(Date),
        period2: expect.any(Date),
        interval: "1d",
      });
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("AAPL");
      expect(result[0].data).toHaveLength(1);
    });

    test("should accept custom period and interval", async () => {
      const mockHistory = [
        {
          date: new Date("2023-01-01"),
          open: 100,
          high: 110,
          low: 90,
          close: 105,
          volume: 1000000,
        },
      ];
      yahooFinance.historical.mockResolvedValue(mockHistory);

      const result = await toolHandlers.get_stock_history("AAPL", "1y", "1wk");

      expect(yahooFinance.historical).toHaveBeenCalledWith("AAPL", {
        period1: expect.any(Date),
        period2: expect.any(Date),
        interval: "1d",
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("get_company_info handler", () => {
    test("should fetch company information", async () => {
      const mockInfo = {
        assetProfile: {
          longName: "Apple Inc.",
          industry: "Consumer Electronics",
          sector: "Technology",
          website: "https://www.apple.com",
          longBusinessSummary: "Apple Inc. designs, manufactures...",
        },
        financialData: {
          revenuePerShare: 20.5,
          profitMargins: 0.25,
        },
      };
      yahooFinance.quoteSummary.mockResolvedValue(mockInfo);

      const result = await toolHandlers.get_company_info("AAPL");

      expect(yahooFinance.quoteSummary).toHaveBeenCalledWith("AAPL", {
        modules: ["assetProfile", "recommendationTrend", "financialData"],
      });
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("AAPL");
      expect(result[0].company).toBe("Apple Inc.");
      expect(result[0].industry).toBe("Consumer Electronics");
    });
  });

  describe("search_symbols handler", () => {
    test("should search for symbols", async () => {
      const mockSearch = {
        quotes: [
          {
            symbol: "AAPL",
            shortname: "Apple Inc.",
            type: "EQUITY",
            exchange: "NMS",
            score: 10000,
          },
        ],
      };
      yahooFinance.search.mockResolvedValue(mockSearch);

      const result = await toolHandlers.search_symbols("apple");

      expect(yahooFinance.search).toHaveBeenCalledWith("apple");
      expect((result as any).query).toBe("apple");
      expect((result as any).count).toBe(1);
      expect((result as any).results).toHaveLength(1);
      expect((result as any).results[0].symbol).toBe("AAPL");
    });
  });

  describe("get_trending_symbols handler", () => {
    test("should fetch trending symbols with default region", async () => {
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

      const result = await toolHandlers.get_trending_symbols();

      expect(yahooFinance.trendingSymbols).toHaveBeenCalledWith("US");
      expect((result as any).region).toBe("US");
      expect((result as any).symbols).toHaveLength(1);
      expect((result as any).symbols[0].symbol).toBe("NVDA");
    });

    test("should accept custom region", async () => {
      const mockTrending = {
        quotes: [
          {
            symbol: "TSLA",
            shortname: "Tesla Inc",
            regularMarketPrice: 200,
            regularMarketChange: -5,
            regularMarketChangePercent: -2.4,
          },
        ],
      };
      yahooFinance.trendingSymbols.mockResolvedValue(mockTrending);

      const result = await toolHandlers.get_trending_symbols("CA");

      expect(yahooFinance.trendingSymbols).toHaveBeenCalledWith("CA");
      expect((result as any).region).toBe("CA");
    });
  });

  describe("get_stock_recommendations handler", () => {
    test("should fetch stock recommendations", async () => {
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

      const result = await toolHandlers.get_stock_recommendations("AAPL");

      expect(yahooFinance.recommendationsBySymbol).toHaveBeenCalledWith("AAPL");
      expect((result as any).baseSymbol).toBe("AAPL");
      expect((result as any).recommendations).toHaveLength(1);
    });
  });

  describe("get_stock_insights handler", () => {
    test("should fetch stock insights", async () => {
      const mockInsights = {
        recommendationTrend: { trend: [] },
        upgradeDowngradeHistory: { history: [] },
        insiderTransactions: { transactions: [] },
        insiderHolders: { holders: [] },
      };
      yahooFinance.quoteSummary.mockResolvedValue(mockInsights);

      const result = await toolHandlers.get_stock_insights("AAPL");

      expect(yahooFinance.quoteSummary).toHaveBeenCalledWith("AAPL", {
        modules: [
          "recommendationTrend",
          "upgradeDowngradeHistory",
          "insiderTransactions",
          "insiderHolders",
        ],
      });
      expect((result as any).symbol).toBe("AAPL");
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("insiderTransactions");
    });
  });

  describe("get_stock_screener handler", () => {
    test("should fetch screener results", async () => {
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

      const result = await toolHandlers.get_stock_screener("day_gainers");

      expect(yahooFinance.screener).toHaveBeenCalledWith("day_gainers");
      expect((result as any).type).toBe("day_gainers");
      expect((result as any).stocks).toHaveLength(1);
      expect((result as any).stocks[0].symbol).toBe("AMD");
    });
  });

  describe("analyze_stock_performance handler", () => {
    test("should analyze stock performance", async () => {
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

      const result = await toolHandlers.analyze_stock_performance("AAPL");

      expect((result as any).symbol).toBe("AAPL");
      expect((result as any).totalReturn).toBe("10.00");
      expect((result as any).period).toBe("1y");
    });
  });

  describe("get_financial_statement handler", () => {
    test("should fetch financial statements", async () => {
      const mockFinancials = [
        {
          date: new Date("2023-12-31"),
          totalRevenue: 1000000,
          netIncome: 200000,
        },
      ];
      yahooFinance.fundamentalsTimeSeries.mockResolvedValue(mockFinancials);

      const result = await toolHandlers.get_financial_statement(
        "AAPL",
        "income"
      );

      expect(yahooFinance.fundamentalsTimeSeries).toHaveBeenCalledWith(
        "AAPL",
        expect.objectContaining({
          type: "annual",
          module: "financials",
        })
      );
      expect((result as any).symbol).toBe("AAPL");
      expect((result as any).type).toBe("income");
      expect((result as any).statements).toHaveLength(1);
      expect((result as any).statements[0].totalRevenue).toBe(1000000);
    });
  });

  describe("get_stock_news handler", () => {
    test("should fetch stock news", async () => {
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

      const result = await toolHandlers.get_stock_news("AAPL");

      expect((result as any).symbol).toBe("AAPL");
      expect((result as any).news).toHaveLength(1);
      expect((result as any).news[0].title).toBe("News 1");
    });
  });

  describe("read_news_article handler", () => {
    test("should read news article content", async () => {
      const mockUrl = "https://finance.yahoo.com/news/test-article.html";
      newsScraper.fetchArticleContent.mockResolvedValue({
        status: 200,
        data: "<html><body><h1>Title</h1><p>Content</p></body></html>",
      });
      newsScraper.extractArticleContent.mockReturnValue({
        title: "Test Title",
        content: "Test Content",
      });

      const result = await toolHandlers.read_news_article(mockUrl);

      expect(newsScraper.fetchArticleContent).toHaveBeenCalledWith(mockUrl);
      expect(newsScraper.extractArticleContent).toHaveBeenCalled();
      expect((result as any).title).toBe("Test Title");
      expect((result as any).content).toBe("Test Content");
      expect((result as any).url).toBe(mockUrl);
    });
  });

  describe("get_etf_holdings handler", () => {
    test("should fetch ETF holdings", async () => {
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

      const result = await toolHandlers.get_etf_holdings("SPY");

      expect(yahooFinance.quoteSummary).toHaveBeenCalledWith("SPY", {
        modules: ["topHoldings", "fundProfile"],
      });
      expect((result as any).symbol).toBe("SPY");
      expect((result as any).fundName).toBe("SPDR");
      expect((result as any).topHoldings).toHaveLength(1);
      expect((result as any).topHoldings[0].symbol).toBe("AAPL");
    });
  });

  describe("get_fund_holdings handler", () => {
    test("should fetch mutual fund holdings", async () => {
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

      const result = await toolHandlers.get_fund_holdings("VFIAX");

      expect((result as any).symbol).toBe("VFIAX");
      expect((result as any).family).toBe("Vanguard");
      expect((result as any).topHoldings).toHaveLength(1);
      expect((result as any).topHoldings[0].symbol).toBe("MSFT");
    });
  });
});
