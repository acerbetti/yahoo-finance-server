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

import express from "express";
import yahooFinance from "../yahoo.js";
import { log } from "../utils/logger.js";

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
        const quote = await yahooFinance.quote(symbol);
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
        const history = await yahooFinance.historical(symbol, {
          period,
          interval,
        });

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
        const info = await yahooFinance.quoteSummary(symbol, {
          modules: ["assetProfile", "recommendationTrend", "financialData"],
        });

        const profile = info.assetProfile || info.summaryProfile || {};
        const financial = info.financialData || {};

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

    const results = await yahooFinance.search(query);
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

    const trending = await yahooFinance.trendingSymbols(region);
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

    const recommendations = await yahooFinance.recommendationsBySymbol(symbol);
    const formatted = recommendations.slice(0, 10).map((item) => ({
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

    const insights = await yahooFinance.quoteSummary(symbol, {
      modules: [
        "recommendationTrend",
        "upgradeDowngradeHistory",
        "insiderTransactions",
        "insiderHolders",
      ],
    });

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

    const results = await yahooFinance.screeners(type);
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

    const history = await yahooFinance.historical(symbol, {
      period,
      interval: period === "1d" ? "1m" : "1d",
    });

    const quote = await yahooFinance.quote(symbol);

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
      result = await yahooFinance.fundamentalsTimeSeries(symbol, {
        period1: startDate.toISOString().split("T")[0],
        period2: endDate.toISOString().split("T")[0],
        type: period,
        module: moduleName,
      });
    } catch (apiError) {
      log("error", `fundamentalsTimeSeries API error: ${apiError.message}`);
      // Try with a simpler call
      try {
        result = await yahooFinance.fundamentalsTimeSeries(symbol, {
          period1: "2020-01-01",
          period2: "2024-12-31",
          type: "annual",
          module: moduleName,
        });
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
      .map((item) => {
        const formatted = {
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
      .filter((stmt) => {
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
    const searchResult = await yahooFinance.search(symbol, {
      newsCount: limitedCount,
    });

    // Get company info for context
    const info = await yahooFinance.quoteSummary(symbol, {
      modules: ["assetProfile"],
    });

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
};

// ============================================================================
// MCP HTTP API Endpoints
// ============================================================================

/**
 * List Tools Endpoint
 * GET /mcp/tools
 * Returns all available MCP tools with their schemas
 */
router.get("/tools", (req, res) => {
  log("info", "MCP: Tools list requested");
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
router.post("/call", async (req, res) => {
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
router.post("/call-stream", async (req, res) => {
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
router.get("/health", (req, res) => {
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
