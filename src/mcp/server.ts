/**
 * MCP (Model Context Protocol) Server Implementation
 * Uses official @modelcontextprotocol/sdk schemas with Express HTTP + SSE
 *
 * Provides financial data tools to LLM models with:
 * - MCP-compliant tool definitions and schemas
 * - HTTP endpoints for tool discovery and execution
 * - Server-Sent Events (SSE) for streaming responses
 * - Error handling and validation
 *
 * @module mcp/server
 */

import express, { Request, Response } from "express";
import yahooFinance from "../yahoo";
import { log } from "../utils/logger";
import { cache, CACHE_ENABLED } from "../config/cache";
import {
  fetchArticleContent,
  extractArticleContent,
} from "../utils/newsScraper";

// Import types from centralized types file
import type {
  QuoteSummaryResult,
  AssetProfile,
  FinancialData,
  FundProfile,
  TopHoldings,
  SearchResult,
  TrendingResult,
  RecommendationsResult,
  ScreenerResult,
  ScreenerOptions,
  HistoricalResult,
  HistoricalOptions,
  QuoteResult,
  FundamentalRow,
  FundamentalsResult
} from '../types';









const router = express.Router();

// ============================================================================
// Tool Definitions (MCP Compliant)
// ============================================================================

/**
 * Stock Quote Tool
 * Get current stock quotes for one or more ticker symbols
 */
const getStockQuoteTool = {
  name: "get_stock_quote",
  description:
    "Get current stock quotes for one or more ticker symbols. Returns price, currency, market cap, and other key metrics.",
  inputSchema: {
    type: "object",
    properties: {
      symbols: {
        type: "string",
        description:
          "Comma-separated list of stock ticker symbols (e.g., 'AAPL,GOOGL,MSFT')",
      },
    },
    required: ["symbols"],
  },
};

/**
 * Stock History Tool
 * Get historical price data for stocks
 */
const getStockHistoryTool = {
  name: "get_stock_history",
  description:
    "Get historical price data for a stock symbol with configurable period and interval.",
  inputSchema: {
    type: "object",
    properties: {
      symbols: {
        type: "string",
        description:
          "Comma-separated list of stock ticker symbols (e.g., 'AAPL,GOOGL')",
      },
      period: {
        type: "string",
        enum: [
          "1d",
          "5d",
          "1wk",
          "1mo",
          "3mo",
          "6mo",
          "1y",
          "2y",
          "5y",
          "10y",
          "max",
        ],
        description: "Time period for historical data (default: '1y')",
      },
      interval: {
        type: "string",
        enum: ["1m", "5m", "15m", "30m", "60m", "1d", "1wk", "1mo"],
        description: "Data interval frequency (default: '1d')",
      },
    },
    required: ["symbols"],
  },
};

/**
 * Company Info Tool
 * Get comprehensive company information
 */
const getCompanyInfoTool = {
  name: "get_company_info",
  description:
    "Get comprehensive company information including business summary, industry, website, and executives.",
  inputSchema: {
    type: "object",
    properties: {
      symbols: {
        type: "string",
        description:
          "Comma-separated list of stock ticker symbols (e.g., 'AAPL,MSFT')",
      },
    },
    required: ["symbols"],
  },
};

/**
 * Search Symbols Tool
 * Search for stocks, ETFs, and indices
 */
const searchSymbolsTool = {
  name: "search_symbols",
  description:
    "Search for stocks, ETFs, and indices by company name, symbol, or keyword. Returns matching results with company details.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (company name, symbol, or keyword)",
      },
    },
    required: ["query"],
  },
};

/**
 * Trending Symbols Tool
 * Get trending/most watched stocks by region
 */
const getTrendingSymbolsTool = {
  name: "get_trending_symbols",
  description:
    "Get trending/most watched stocks by region. Useful for market analysis and finding hot stocks.",
  inputSchema: {
    type: "object",
    properties: {
      region: {
        type: "string",
        enum: ["US", "GB", "AU", "CA", "FR", "DE", "HK", "SG", "IN"],
        description: "Region code (default: 'US')",
      },
    },
    required: [],
  },
};

/**
 * Stock Recommendations Tool
 * Get similar stock recommendations
 */
const getStockRecommendationsTool = {
  name: "get_stock_recommendations",
  description:
    "Get similar stock recommendations based on a given stock symbol. Useful for investment research and portfolio diversification.",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Stock ticker symbol (e.g., 'AAPL')",
      },
    },
    required: ["symbol"],
  },
};

/**
 * Stock Insights Tool
 * Get comprehensive stock insights
 */
const getStockInsightsTool = {
  name: "get_stock_insights",
  description:
    "Get comprehensive stock insights including research, news sentiment, insider trades, and analyst recommendations.",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Stock ticker symbol (e.g., 'AAPL')",
      },
    },
    required: ["symbol"],
  },
};

/**
 * Stock Screener Tool
 * Get lists of stocks by specific criteria
 */
const getStockScreenerTool = {
  name: "get_stock_screener",
  description:
    "Get lists of stocks by specific criteria (gainers, losers, active stocks, etc.). Useful for market analysis and trading strategies.",
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: [
          "day_gainers",
          "day_losers",
          "most_actives",
          "most_shorted",
          "growth_tech_stocks",
          "day_gainers_etf",
          "day_losers_etf",
        ],
        description: "Type of screener to retrieve",
      },
      count: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "Number of results to return (default: 25)",
      },
    },
    required: ["type"],
  },
};

/**
 * Stock Performance Analysis Tool
 * Analyze stock performance over time
 */
const analyzeStockPerformanceTool = {
  name: "analyze_stock_performance",
  description:
    "Analyze stock performance by comparing current price against historical data. Returns performance metrics and trends.",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Stock ticker symbol (e.g., 'AAPL')",
      },
      period: {
        type: "string",
        enum: ["1d", "5d", "1wk", "1mo", "3mo", "6mo", "1y", "max"],
        description: "Period for performance analysis (default: '1y')",
      },
    },
    required: ["symbol"],
  },
};

/**
 * Financial Statement Tool
 * Get financial statements (income, balance sheet, cash flow)
 */
const getFinancialStatementTool = {
  name: "get_financial_statement",
  description:
    "Get financial statements for a stock including income statement, balance sheet, and cash flow statement. Can retrieve annual or quarterly data.",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Stock ticker symbol (e.g., 'AAPL', 'MSFT')",
      },
      statementType: {
        type: "string",
        enum: ["income", "balance", "cashflow"],
        description:
          "Type of financial statement: 'income' (income statement), 'balance' (balance sheet), or 'cashflow' (cash flow statement)",
      },
      period: {
        type: "string",
        enum: ["annual", "quarterly"],
        description: "Period type: 'annual' or 'quarterly' (default: 'annual')",
      },
    },
    required: ["symbol", "statementType"],
  },
};

/**
 * Stock News Tool
 * Get latest news articles for stocks
 */
const getStockNewsTool = {
  name: "get_stock_news",
  description:
    "Get latest news articles and headlines for a stock symbol. Provides real-time market context and sentiment.",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Stock ticker symbol (e.g., 'AAPL', 'GOOGL')",
      },
      count: {
        type: "number",
        description: "Number of news articles to return (default: 10, max: 50)",
      },
    },
    required: ["symbol"],
  },
};

/**
 * ETF Holdings Tool
 * Get ETF holdings and sector weightings
 */
const getEtfHoldingsTool = {
  name: "get_etf_holdings",
  description:
    "Get ETF holdings, sector allocations, and position breakdowns. Useful for analyzing ETF composition.",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "ETF ticker symbol (e.g., 'SPY', 'QQQ')",
      },
    },
    required: ["symbol"],
  },
};

/**
 * Mutual Fund Holdings Tool
 * Get mutual fund holdings and composition
 */
const getFundHoldingsTool = {
  name: "get_fund_holdings",
  description:
    "Get mutual fund holdings and composition data. Useful for analyzing mutual fund portfolios.",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Mutual fund ticker symbol (e.g., 'VFIAX')",
      },
    },
    required: ["symbol"],
  },
};

/**
 * News Reader Tool
 * Extract content from Yahoo Finance news articles
 */
const readNewsArticleTool = {
  name: "read_news_article",
  description:
    "Extract the main title and text content from a Yahoo Finance news article URL.",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description:
          "The full Yahoo Finance article URL (must start with https://finance.yahoo.com/)",
      },
    },
    required: ["url"],
  },
};

const tools = [
  getStockQuoteTool,
  getStockHistoryTool,
  getCompanyInfoTool,
  searchSymbolsTool,
  getTrendingSymbolsTool,
  getStockRecommendationsTool,
  getStockInsightsTool,
  getStockScreenerTool,
  analyzeStockPerformanceTool,
  getFinancialStatementTool,
  getStockNewsTool,
  getEtfHoldingsTool,
  getFundHoldingsTool,
  readNewsArticleTool,
];

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Handle stock quote requests
 */
async function handleGetStockQuote(symbols) {
  try {
    const symbolArray = symbols.split(",").map((s) => s.trim());
    log("debug", `MCP: Fetching quotes for ${symbolArray.join(", ")}`);

    const results = [];
    for (const symbol of symbolArray) {
      try {
        const quote = (await yahooFinance.quote(symbol)) as unknown as QuoteResult;
        results.push({
          symbol,
          price: quote.regularMarketPrice,
          currency: quote.currency,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          marketCap: quote.marketCap,
          pe: quote.trailingPE,
          dividend: quote.trailingAnnualDividendRate,
          weekHigh52: quote.fiftyTwoWeekHigh,
          weekLow52: quote.fiftyTwoWeekLow,
          averageVolume: quote.averageVolume,
        });
      } catch (error) {
        results.push({
          symbol,
          error: `Failed to fetch quote: ${error.message}`,
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Quote tool error: ${error.message}`);
  }
}

/**
 * Handle stock history requests
 */
async function handleGetStockHistory(symbols, period = "1y", interval = "1d") {
  try {
    const symbolArray = symbols.split(",").map((s) => s.trim());
    log("debug", `MCP: Fetching history for ${symbolArray.join(", ")}`);

    const results = [];
    for (const symbol of symbolArray) {
      try {
        const history = (await yahooFinance.historical(symbol, {
          period,
          interval,
        } as unknown as HistoricalOptions)) as unknown as HistoricalResult;

        results.push({
          symbol,
          period,
          interval,
          dataPoints: history.length,
          data: history.slice(0, 10).map((point) => ({
            date: point.date,
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
            volume: point.volume,
          })),
          summary: {
            latestClose: history[history.length - 1]?.close,
            highestPrice: Math.max(...history.map((h) => h.high)),
            lowestPrice: Math.min(...history.map((h) => h.low)),
          },
        });
      } catch (error) {
        results.push({
          symbol,
          error: `Failed to fetch history: ${error.message}`,
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`History tool error: ${error.message}`);
  }
}

/**
 * Handle company info requests
 */
async function handleGetCompanyInfo(symbols) {
  try {
    const symbolArray = symbols.split(",").map((s) => s.trim());
    log("debug", `MCP: Fetching info for ${symbolArray.join(", ")}`);

    const results = [];
    for (const symbol of symbolArray) {
      try {
        const info = (await yahooFinance.quoteSummary(symbol, {
          modules: ["assetProfile", "recommendationTrend", "financialData"],
        })) as unknown as QuoteSummaryResult;

        const profile = (info.assetProfile || info.summaryProfile || {}) as AssetProfile;
        const financial = (info.financialData || {}) as FinancialData;

        results.push({
          symbol,
          company: profile.longName || symbol,
          industry: profile.industry,
          sector: profile.sector,
          website: profile.website,
          businessSummary: profile.longBusinessSummary?.substring(0, 300),
          employees: profile.fullTimeEmployees,
          country: profile.country,
          revenuePerShare: financial.revenuePerShare,
          profitMargins: financial.profitMargins,
          operatingMargins: financial.operatingMargins,
        });
      } catch (error) {
        results.push({
          symbol,
          error: `Failed to fetch info: ${error.message}`,
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Info tool error: ${error.message}`);
  }
}

/**
 * Handle search requests
 */
async function handleSearchSymbols(query) {
  try {
    log("debug", `MCP: Searching for "${query}"`);

    const results = (await yahooFinance.search(query)) as unknown as SearchResult;
    const formatted =
      results.quotes?.slice(0, 10).map((item) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname,
        type: item.type,
        exchange: item.exchange,
        score: item.score,
      })) || [];

    return {
      query,
      count: formatted.length,
      results: formatted,
    };
  } catch (error) {
    throw new Error(`Search tool error: ${error.message}`);
  }
}

/**
 * Handle trending symbols requests
 */
async function handleGetTrendingSymbols(region = "US") {
  try {
    log("debug", `MCP: Fetching trending symbols for ${region}`);

    const trending = (await yahooFinance.trendingSymbols(region)) as unknown as TrendingResult;
    const formatted =
      trending.quotes?.slice(0, 15).map((item) => ({
        symbol: item.symbol,
        name: item.shortname,
        price: item.regularMarketPrice,
        change: item.regularMarketChange,
        changePercent: item.regularMarketChangePercent,
      })) || [];

    return {
      region,
      count: formatted.length,
      symbols: formatted,
    };
  } catch (error) {
    throw new Error(`Trending symbols tool error: ${error.message}`);
  }
}

/**
 * Handle recommendations requests
 */
async function handleGetStockRecommendations(symbol) {
  try {
    log("debug", `MCP: Fetching recommendations for ${symbol}`);

    const recommendations = (await yahooFinance.recommendationsBySymbol(
      symbol
    )) as unknown as RecommendationsResult;
    const formatted = (recommendations.recommendedSymbols || []).slice(0, 10).map((item) => ({
      symbol: item.symbol,
      name: item.shortname,
      recommendationKey: item.recommendationKey,
      recommendationScore: item.recommendationScore,
      percentDowngrade: item.percentDowngrade,
      percentHold: item.percentHold,
      percentBuy: item.percentBuy,
    }));

    return {
      baseSymbol: symbol,
      count: formatted.length,
      recommendations: formatted,
    };
  } catch (error) {
    throw new Error(`Recommendations tool error: ${error.message}`);
  }
}

/**
 * Handle insights requests
 */
async function handleGetStockInsights(symbol) {
  try {
    log("debug", `MCP: Fetching insights for ${symbol}`);

    const insights = (await yahooFinance.quoteSummary(symbol, {
      modules: [
        "recommendationTrend",
        "upgradeDowngradeHistory",
        "insiderTransactions",
        "insiderHolders",
      ],
    })) as unknown as QuoteSummaryResult;

    return {
      symbol,
      recommendations: insights.recommendationTrend?.trend?.slice(0, 5) || [],
      insiderTransactions:
        insights.insiderTransactions?.transactions?.slice(0, 5) || [],
      insiderHolders: insights.insiderHolders?.holders?.slice(0, 5) || [],
      upgrades: insights.upgradeDowngradeHistory?.history?.slice(0, 5) || [],
    };
  } catch (error) {
    throw new Error(`Insights tool error: ${error.message}`);
  }
}

/**
 * Handle screener requests
 */
async function handleGetStockScreener(type, count = 25) {
  try {
    log("debug", `MCP: Fetching screener ${type}`);

    const results = (await yahooFinance.screener({
      scrIds: [type],
      count,
    } as unknown as ScreenerOptions)) as unknown as ScreenerResult;
    const formatted = (results.quotes || [])
      .slice(0, Math.min(count, 100))
      .map((item) => ({
        symbol: item.symbol,
        name: item.shortname,
        price: item.regularMarketPrice,
        change: item.regularMarketChange,
        changePercent: item.regularMarketChangePercent,
        volume: item.volume,
        marketCap: item.marketCap,
      }));

    return {
      type,
      count: formatted.length,
      stocks: formatted,
    };
  } catch (error) {
    throw new Error(`Screener tool error: ${error.message}`);
  }
}

/**
 * Handle stock performance analysis
 */
async function handleAnalyzeStockPerformance(symbol, period = "1y") {
  try {
    log("debug", `MCP: Analyzing performance for ${symbol}`);

    const history = (await yahooFinance.historical(symbol, {
      period,
      interval: period === "1d" ? "1m" : "1d",
    } as unknown as HistoricalOptions)) as unknown as HistoricalResult;

    const quote = (await yahooFinance.quote(symbol)) as unknown as QuoteResult;

    if (history.length < 2) {
      throw new Error("Insufficient historical data");
    }

    const startPrice = history[0].open;
    const endPrice = history[history.length - 1].close;
    const highPrice = Math.max(...history.map((h) => h.high));
    const lowPrice = Math.min(...history.map((h) => h.low));

    const totalReturn = ((endPrice - startPrice) / startPrice) * 100;
    const volatility = calculateVolatility(history);

    return {
      symbol,
      period,
      currentPrice: quote.regularMarketPrice,
      priceChange: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      periodStart: startPrice,
      periodEnd: endPrice,
      periodHigh: highPrice,
      periodLow: lowPrice,
      totalReturn: totalReturn.toFixed(2),
      volatility: volatility.toFixed(4),
      trend: totalReturn > 0 ? "uptrend" : "downtrend",
      dataPoints: history.length,
    };
  } catch (error) {
    throw new Error(`Performance analysis tool error: ${error.message}`);
  }
}

/**
 * Calculate volatility from historical data
 */
function calculateVolatility(history) {
  const returns = [];
  for (let i = 1; i < history.length; i++) {
    const ret =
      (history[i].close - history[i - 1].close) / history[i - 1].close;
    returns.push(ret);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const squaredDiffs = returns.map((ret) => Math.pow(ret - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  return stdDev;
}

/**
 * Handle financial statement requests
 */
async function handleGetFinancialStatement(
  symbol,
  statementType,
  period = "annual"
) {
  try {
    log("debug", `MCP: Fetching ${period} ${statementType} for ${symbol}`);

    // Map statement type to fundamentalsTimeSeries module
    const moduleMap = {
      income: "financials",
      balance: "balance-sheet",
      cashflow: "cash-flow",
    };

    const moduleName = moduleMap[statementType];
    if (!moduleName) {
      throw new Error(
        `Invalid statement type: ${statementType}. Must be 'income', 'balance', or 'cashflow'`
      );
    }

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    if (period === "annual") {
      startDate.setFullYear(endDate.getFullYear() - 10); // Last 10 years
    } else {
      startDate.setMonth(endDate.getMonth() - 40); // Last 40 quarters (10 years)
    }

    let result = [];
    try {
      result = (await yahooFinance.fundamentalsTimeSeries(symbol, {
        period1: startDate.toISOString().split("T")[0],
        period2: endDate.toISOString().split("T")[0],
        type: period,
        module: moduleName,
      })) as unknown as FundamentalsResult;
    } catch (apiError) {
      log("error", `fundamentalsTimeSeries API error: ${apiError.message}`);
      // Try with a simpler call
      try {
        result = (await yahooFinance.fundamentalsTimeSeries(symbol, {
          period1: "2020-01-01",
          period2: "2024-12-31",
          type: "annual",
          module: moduleName,
        })) as unknown as FundamentalsResult;
        log("info", `Fallback call succeeded with ${result.length} items`);
      } catch (fallbackError) {
        log("error", `Fallback call also failed: ${fallbackError.message}`);
        throw apiError; // Re-throw original error
      }
    }

    if (!result || result.length === 0) {
      return {
        symbol,
        type: statementType,
        period,
        count: 0,
        statements: [],
        message: `No ${statementType} statement data available`,
        timestamp: new Date().toISOString(),
      };
    }

    // Extract statements based on type
    const statements = result
      .slice(0, 5)
      .map((item: FundamentalRow) => {
        const formatted: Record<string, unknown> = {
          endDate: item.date,
        };

        // Add statement-specific fields
        if (statementType === "income") {
          formatted.totalRevenue = item.totalRevenue;
          formatted.costOfRevenue = item.costOfRevenue;
          formatted.grossProfit = item.grossProfit;
          formatted.operatingIncome = item.operatingIncome;
          formatted.netIncome = item.netIncome;
        } else if (statementType === "balance") {
          formatted.totalAssets = item.totalAssets;
          formatted.totalLiabilities = item.totalLiabilitiesNetMinorityInterest;
          formatted.totalEquity =
            item.totalStockholderEquity || item.commonStockEquity;
          formatted.currentAssets = item.currentAssets;
          formatted.currentLiabilities = item.currentLiabilities;
        } else if (statementType === "cashflow") {
          formatted.operatingCashFlow = item.operatingCashFlow;
          formatted.investingCashFlow = item.investingCashFlow;
          formatted.financingCashFlow = item.financingCashFlow;
          formatted.freeCashFlow =
            (item.operatingCashFlow || 0) - (item.capitalExpenditure || 0);
        }

        return formatted;
      })
      .filter((stmt: Record<string, unknown>) => {
        // Filter out statements that don't have meaningful financial data
        if (statementType === "income")
          return stmt.totalRevenue || stmt.netIncome;
        if (statementType === "balance")
          return stmt.totalAssets || stmt.totalLiabilities;
        if (statementType === "cashflow")
          return stmt.operatingCashFlow !== undefined;
        return true;
      });

    return {
      symbol,
      type: statementType,
      period,
      count: statements.length,
      statements,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`Financial statement tool error: ${error.message}`);
  }
}

/**
 * Handle stock news requests - simplified version
 * Note: news is retrieved from general search/trending data
 */
async function handleGetStockNews(symbol, count = 10) {
  try {
    log("debug", `MCP: Fetching news for ${symbol}`);

    const limitedCount = Math.min(count || 10, 50);

    // Get news using search API
    const searchResult = (await yahooFinance.search(symbol, {
      newsCount: limitedCount,
    })) as unknown as SearchResult;

    // Get company info for context
    const info = (await yahooFinance.quoteSummary(symbol, {
      modules: ["assetProfile"],
    })) as unknown as QuoteSummaryResult;

    // Format news articles
    const newsArticles = (searchResult.news || []).map((article) => ({
      title: article.title,
      publisher: article.publisher,
      link: article.link,
      publishedAt: article.providerPublishTime,
      type: article.type,
      relatedTickers: article.relatedTickers,
    }));

    return {
      symbol,
      count: newsArticles.length,
      news: newsArticles,
      companyInfo: {
        longName: info.assetProfile?.longName,
        sector: info.assetProfile?.sector,
        industry: info.assetProfile?.industry,
      },
      message:
        newsArticles.length > 0
          ? `Found ${newsArticles.length} news articles for ${symbol}`
          : `No recent news found for ${symbol}`,
      dataAvailable: {
        hasAssetProfile: !!info.assetProfile,
        hasNews: newsArticles.length > 0,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    log("warn", `Stock news fetch failed for ${symbol}: ${error.message}`);
    return {
      symbol,
      count: 0,
      news: [],
      message: "News data temporarily unavailable",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Handle ETF holdings requests
 */
async function handleGetEtfHoldings(symbol) {
  try {
    const cacheKey = `holdings:${symbol}`;
    if (CACHE_ENABLED) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        log("debug", `MCP: Cache hit for ETF holdings: ${symbol}`);
        return cached;
      }
    }

    log("debug", `MCP: Fetching ETF holdings for ${symbol}`);

    const topHoldingsData = await yahooFinance.quoteSummary(symbol, {
      modules: ["topHoldings", "fundProfile"],
    });

    const holdings = (topHoldingsData.topHoldings || {}) as unknown as TopHoldings;
    const profile = (topHoldingsData.fundProfile || {}) as unknown as FundProfile;

    const formatted = {
      symbol,
      fundName: profile.family,
      topHoldings: (holdings.holdings || []).map((h) => ({
        symbol: h.symbol,
        name: h.holdingName,
        percent: h.holdingPercent,
      })),
      sectorWeightings: (holdings.sectorWeightings || []).map((s) => {
        const [sector, weight] = Object.entries(s)[0];
        return { sector, weight };
      }),
      equityHoldings: holdings.equityHoldings || {},
      assetAllocation: {
        stocks: holdings.stockPosition,
        bonds: holdings.bondPosition,
        cash: holdings.cashPosition,
        other: holdings.otherPosition,
      },
    };

    if (CACHE_ENABLED) {
      await cache.set(cacheKey, formatted);
    }

    return formatted;
  } catch (error) {
    throw new Error(`ETF holdings tool error: ${error.message}`);
  }
}

/**
 * Handle mutual fund holdings requests
 */
async function handleGetFundHoldings(symbol) {
  try {
    const cacheKey = `fund_holdings:${symbol}`;
    if (CACHE_ENABLED) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        log("debug", `MCP: Cache hit for fund holdings: ${symbol}`);
        return cached;
      }
    }

    log("debug", `MCP: Fetching fund holdings for ${symbol}`);

    const result = (await yahooFinance.quoteSummary(symbol, {
      modules: ["topHoldings", "fundProfile"],
    })) as unknown as QuoteSummaryResult;

    const holdings = (result.topHoldings || {}) as unknown as TopHoldings;
    const profile = (result.fundProfile || {}) as FundProfile;

    const formatted = {
      symbol,
      family: profile.family,
      category: profile.categoryName,
      legalType: profile.legalType,
      expenseRatio: profile.feesExpensesInvestment?.annualReportExpenseRatio,
      totalAssets: profile.feesExpensesInvestment?.totalNetAssets,
      topHoldings: (holdings.holdings || []).map((h) => ({
        symbol: h.symbol,
        name: h.holdingName,
        percent: h.holdingPercent,
      })),
      sectorWeightings: (holdings.sectorWeightings || []).map((s) => {
        const [sector, weight] = Object.entries(s)[0];
        return { sector, weight };
      }),
      assetAllocation: {
        stocks: holdings.stockPosition,
        bonds: holdings.bondPosition,
        cash: holdings.cashPosition,
        other: holdings.otherPosition,
      },
    };

    if (CACHE_ENABLED) {
      cache.set(cacheKey, formatted);
    }

    return formatted;
  } catch (error) {
    throw new Error(`Fund holdings tool error: ${error.message}`);
  }
}

/**
 * Handle news reader requests
 */
async function handleReadNewsArticle(url) {
  try {
    // Validate URL
    if (!url.startsWith("https://finance.yahoo.com/")) {
      throw new Error(
        "Invalid URL. Must be a full Yahoo Finance URL starting with https://finance.yahoo.com/"
      );
    }

    const cacheKey = `news_reader:${url}`;
    if (CACHE_ENABLED) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        log("debug", `MCP: Cache hit for news reader: ${url}`);
        return cached;
      }
    }

    log("debug", `MCP: Reading news article from ${url}`);

    // Fetch article content with redirect handling
    let response = await fetchArticleContent(url);
    let redirectCount = 0;
    let finalUrl = url;

    // Handle redirects
    while (
      (response.status === 301 || response.status === 302) &&
      redirectCount < 5
    ) {
      const location = response.headers.location;
      if (!location) {
        throw new Error(`Redirect response missing Location header`);
      }

      // Handle relative URLs
      const redirectUrl = location.startsWith("http")
        ? location
        : `https://finance.yahoo.com${location}`;
      log("info", `Following redirect from ${finalUrl} to ${redirectUrl}`);

      finalUrl = redirectUrl;
      response = await fetchArticleContent(finalUrl, ++redirectCount);
    }

    if (response.status !== 200) {
      if (response.status === 404) {
        throw new Error("Article not found. The requested URL does not exist.");
      } else {
        throw new Error(`Request failed with status code ${response.status}`);
      }
    }

    // Extract article content
    const { title, content } = extractArticleContent(response.data);

    if (!title || !content) {
      throw new Error(
        "Unable to extract article content. The article may not exist or the page structure has changed."
      );
    }

    const result = {
      title,
      content,
      url: finalUrl,
    };

    if (CACHE_ENABLED) {
      cache.set(cacheKey, result);
      // Also cache under final URL if it was redirected
      if (finalUrl !== url) {
        const finalCacheKey = `news_reader:${finalUrl}`;
        cache.set(finalCacheKey, result);
      }
    }

    return result;
  } catch (error) {
    throw new Error(`News reader tool error: ${error.message}`);
  }
}

// ============================================================================
// Tool Handler Registry
// ============================================================================

/**
 * Map tool names to their handler functions
 */
const toolHandlers = {
  get_stock_quote: handleGetStockQuote,
  get_stock_history: handleGetStockHistory,
  get_company_info: handleGetCompanyInfo,
  search_symbols: handleSearchSymbols,
  get_trending_symbols: handleGetTrendingSymbols,
  get_stock_recommendations: handleGetStockRecommendations,
  get_stock_insights: handleGetStockInsights,
  get_stock_screener: handleGetStockScreener,
  analyze_stock_performance: handleAnalyzeStockPerformance,
  get_financial_statement: handleGetFinancialStatement,
  get_stock_news: handleGetStockNews,
  get_etf_holdings: handleGetEtfHoldings,
  get_fund_holdings: handleGetFundHoldings,
  read_news_article: handleReadNewsArticle,
};

// ============================================================================
// MCP HTTP API Endpoints
// ============================================================================

/**
 * List Tools Endpoint
 * GET /mcp/tools
 * Returns all available MCP tools with their schemas
 */
router.get("/tools", (req: Request, res: Response) => {
  const format = req.query.format;
  log("info", `MCP: Tools list requested (format: ${format || "standard"})`);

  if (format === "openai") {
    const openAiTools = tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
    return res.json({ tools: openAiTools });
  }

  res.json({
    tools,
  });
});

/**
 * Call Tool Endpoint (JSON Response)
 * POST /mcp/call
 * Executes a tool with provided arguments and returns JSON response
 *
 * Request body:
 * {
 *   "name": "tool_name",
 *   "arguments": { ...tool arguments... }
 * }
 */
router.post("/call", async (req: Request, res: Response) => {
  const { name, arguments: args } = req.body;

  if (!name || !args) {
    return res.status(400).json({
      error: "Missing required fields: name and arguments",
    });
  }

  if (!toolHandlers[name]) {
    return res.status(404).json({
      error: `Unknown tool: ${name}`,
      availableTools: Object.keys(toolHandlers),
    });
  }

  try {
    log("info", `MCP: Executing tool '${name}'`, args);

    const handler = toolHandlers[name];
    const result = await handler(...Object.values(args));

    res.json({
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    });
  } catch (error) {
    log("error", `MCP: Tool execution error for '${name}':`, error);
    res.status(500).json({
      content: [
        {
          type: "text",
          text: `Error executing tool '${name}': ${error.message}`,
          isError: true,
        },
      ],
    });
  }
});

/**
 * Call Tool Endpoint (SSE Streaming)
 * POST /mcp/call-stream
 * Executes a tool and streams the execution progress via Server-Sent Events
 *
 * Request body:
 * {
 *   "name": "tool_name",
 *   "arguments": { ...tool arguments... }
 * }
 *
 * Response: Streams multiple SSE events
 * - event_start: Tool execution started
 * - event_arguments: Arguments received and validated
 * - event_processing: Processing is underway
 * - event_data: Result data chunk
 * - event_complete: Execution completed
 * - event_error: Error occurred
 */
router.post("/call-stream", async (req: Request, res: Response) => {
  const { name, arguments: args } = req.body;

  if (!name || !args) {
    res.status(400).json({
      error: "Missing required fields: name and arguments",
    });
    return;
  }

  if (!toolHandlers[name]) {
    res.status(404).json({
      error: `Unknown tool: ${name}`,
      availableTools: Object.keys(toolHandlers),
    });
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    log("info", `MCP: SSE Stream started for tool '${name}'`);

    // Send start event
    sendSSEEvent(res, "event_start", {
      tool: name,
      timestamp: new Date().toISOString(),
      message: `Executing MCP tool: ${name}`,
    });

    // Send arguments event
    sendSSEEvent(res, "event_arguments", {
      tool: name,
      arguments: args,
      timestamp: new Date().toISOString(),
    });

    // Send processing event
    sendSSEEvent(res, "event_processing", {
      tool: name,
      status: "in_progress",
      message: "Fetching data from Yahoo Finance...",
      timestamp: new Date().toISOString(),
    });

    // Execute the tool
    const handler = toolHandlers[name];
    const result = await handler(...Object.values(args));

    // Send data event with result
    sendSSEEvent(res, "event_data", {
      tool: name,
      result,
      resultType: typeof result,
      timestamp: new Date().toISOString(),
    });

    // Send completion event
    sendSSEEvent(res, "event_complete", {
      tool: name,
      status: "success",
      timestamp: new Date().toISOString(),
      message: `Tool '${name}' completed successfully`,
    });

    res.write(":\n\n"); // keepalive
    res.end();

    log("info", `MCP: SSE Stream completed for tool '${name}'`);
  } catch (error) {
    log("error", `MCP: Stream error for tool '${name}':`, error);

    // Send error event
    sendSSEEvent(res, "event_error", {
      tool: name,
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    // Send completion event
    sendSSEEvent(res, "event_complete", {
      tool: name,
      status: "error",
      timestamp: new Date().toISOString(),
      message: `Tool '${name}' failed`,
    });

    res.write(":\n\n"); // keepalive
    res.end();
  }
});

/**
 * MCP Health Check Endpoint
 * GET /mcp/health
 * Returns server status and available tools
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "MCP Server",
    version: "1.0.0",
    toolsAvailable: tools.length,
    tools: tools.map((t) => t.name),
    features: ["json-response", "sse-streaming"],
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * tags:
 *   - name: MCP
 *     description: Model Context Protocol endpoints for LLM integration
 */

/**
 * @swagger
 * /mcp/health:
 *   get:
 *     summary: MCP server health check
 *     description: Returns MCP server status and available tools
 *     tags: [MCP]
 *     responses:
 *       200:
 *         description: MCP server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 service:
 *                   type: string
 *                   example: "MCP Server"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 toolsAvailable:
 *                   type: integer
 *                   example: 14
 *                 tools:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["get_stock_quote", "get_stock_history"]
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["json-response", "sse-streaming"]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */

/**
 * @swagger
 * /mcp/tools:
 *   get:
 *     summary: List all available MCP tools
 *     description: Returns all available MCP tools with their schemas and descriptions
 *     tags: [MCP]
 *     parameters:
 *       - in: query
 *         name: format
 *         description: Response format
 *         schema:
 *           type: string
 *           enum: [standard, openai]
 *           default: standard
 *         example: "standard"
 *     responses:
 *       200:
 *         description: List of MCP tools
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tools:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "get_stock_quote"
 *                       description:
 *                         type: string
 *                         example: "Get current stock quotes for one or more ticker symbols"
 *                       inputSchema:
 *                         type: object
 *                         description: JSON schema for tool input parameters
 */

/**
 * @swagger
 * /mcp/call:
 *   post:
 *     summary: Execute MCP tool (JSON response)
 *     description: Executes an MCP tool with provided arguments and returns JSON response
 *     tags: [MCP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tool name to execute
 *                 example: "get_stock_quote"
 *               arguments:
 *                 type: object
 *                 description: Tool arguments
 *                 example: {"symbols": "AAPL,GOOGL"}
 *             required:
 *               - name
 *               - arguments
 *     responses:
 *       200:
 *         description: Tool execution successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: "text"
 *                       text:
 *                         type: string
 *                         description: Tool execution result as JSON string
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Unknown tool
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Tool execution error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /mcp/call-stream:
 *   post:
 *     summary: Execute MCP tool (SSE streaming)
 *     description: Executes an MCP tool and streams the execution progress via Server-Sent Events
 *     tags: [MCP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tool name to execute
 *                 example: "get_stock_quote"
 *               arguments:
 *                 type: object
 *                 description: Tool arguments
 *                 example: {"symbols": "AAPL,GOOGL"}
 *             required:
 *               - name
 *               - arguments
 *     responses:
 *       200:
 *         description: Tool execution streaming response
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-Sent Events stream with execution progress
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Unknown tool
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Tool execution error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Send Server-Sent Event
 * Formats and sends SSE messages to client
 *
 * Format:
 * event: eventType\n
 * data: JSON.stringify(data)\n\n
 */
function sendSSEEvent(res, eventType, data) {
  try {
    const eventLine = `event: ${eventType}\n`;
    const dataLine = `data: ${JSON.stringify(data)}\n\n`;
    res.write(eventLine + dataLine);
  } catch (error) {
    log("error", `Failed to send SSE event '${eventType}':`, error);
  }
}

// ============================================================================
// Export
// ============================================================================

export default router;
