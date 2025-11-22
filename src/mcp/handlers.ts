/**
 * MCP Tool Handlers
 * Implementation of all MCP tool handler functions
 *
 * @module mcp/handlers
 */

import { cache, CACHE_ENABLED } from "../config/cache";
import type {
  QuoteSummaryResult,
  AssetProfile,
  FinancialData,
  FundProfile,
  TopHoldings,
  SearchResult,
  TrendingSymbolsResult,
  RecommendationsBySymbolResponse,
  HistoricalHistoryResult,
  FundamentalsTimeSeriesResults,
  FundamentalsTimeSeriesResult,
  FundamentalsTimeSeriesFinancialsResult,
  FundamentalsTimeSeriesBalanceSheetResult,
  FundamentalsTimeSeriesCashFlowResult,
} from "../types";
import { log } from "../utils/logger";
import {
  fetchArticleContent,
  extractArticleContent,
} from "../utils/newsScraper";
import yahooFinance from "../yahoo";

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Handle stock quote requests
 */
async function handleGetStockQuote(symbols) {
  const cacheKey = `quote:${symbols}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      log("debug", `MCP: Cache hit for quote: ${symbols}`);
      return cached;
    }
    log("debug", `MCP: Cache miss for quote: ${symbols}`);
  }

  try {
    const symbolArray = symbols.split(",").map((s) => s.trim());
    log("debug", `MCP: Fetching quotes for ${symbolArray.join(", ")}`);

    const results = [];
    for (const symbol of symbolArray) {
      try {
        const result = await yahooFinance.quote(symbol);
        const quote = Array.isArray(result) ? result[0] : result;
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

    if (CACHE_ENABLED) {
      await cache.set(cacheKey, results);
      log("debug", `MCP: Cached quote data for ${symbols}`);
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
  const cacheKey = `history:${symbols}:${period}:${interval}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      log(
        "debug",
        `MCP: Cache hit for history: ${symbols} (${period}/${interval})`
      );
      return cached;
    }
    log(
      "debug",
      `MCP: Cache miss for history: ${symbols} (${period}/${interval})`
    );
  }

  try {
    const symbolArray = symbols.split(",").map((s) => s.trim());
    log("debug", `MCP: Fetching history for ${symbolArray.join(", ")}`);

    const results = [];
    for (const symbol of symbolArray) {
      try {
        const history: HistoricalHistoryResult = await yahooFinance.historical(
          symbol,
          {
            period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
            period2: new Date(),
            interval: "1d" as const,
          }
        );

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

    if (CACHE_ENABLED) {
      await cache.set(cacheKey, results);
      log(
        "debug",
        `MCP: Cached history data for ${symbols} (${period}/${interval})`
      );
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
  const cacheKey = `info:${symbols}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      log("debug", `MCP: Cache hit for info: ${symbols}`);
      return cached;
    }
    log("debug", `MCP: Cache miss for info: ${symbols}`);
  }

  try {
    const symbolArray = symbols.split(",").map((s) => s.trim());
    log("debug", `MCP: Fetching info for ${symbolArray.join(", ")}`);

    const results = [];
    for (const symbol of symbolArray) {
      try {
        const info = (await yahooFinance.quoteSummary(symbol, {
          modules: ["assetProfile", "recommendationTrend", "financialData"],
        })) as QuoteSummaryResult;

        const profile = (info.assetProfile ||
          info.summaryProfile ||
          {}) as AssetProfile;
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

    if (CACHE_ENABLED) {
      await cache.set(cacheKey, results);
      log("debug", `MCP: Cached info data for ${symbols}`);
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
  const cacheKey = `search:${query}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      log("debug", `MCP: Cache hit for search: "${query}"`);
      return cached;
    }
    log("debug", `MCP: Cache miss for search: "${query}"`);
  }

  try {
    log("debug", `MCP: Searching for "${query}"`);

    const results = (await yahooFinance.search(query)) as SearchResult;
    const formatted =
      results.quotes?.slice(0, 10).map((item) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname,
        type: item.type,
        exchange: item.exchange,
        score: item.score,
      })) || [];

    const result = {
      query,
      count: formatted.length,
      results: formatted,
    };

    if (CACHE_ENABLED) {
      await cache.set(cacheKey, result);
      log("debug", `MCP: Cached search results for "${query}"`);
    }

    return result;
  } catch (error) {
    throw new Error(`Search tool error: ${error.message}`);
  }
}

/**
 * Handle trending symbols requests
 */
async function handleGetTrendingSymbols(region = "US") {
  const cacheKey = `trending:${region}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      log("debug", `MCP: Cache hit for trending symbols: ${region}`);
      return cached;
    }
    log("debug", `MCP: Cache miss for trending symbols: ${region}`);
  }

  try {
    log("debug", `MCP: Fetching trending symbols for ${region}`);

    const trending = (await yahooFinance.trendingSymbols(
      region
    )) as TrendingSymbolsResult;
    const formatted =
      trending.quotes?.slice(0, 15).map((item) => ({
        symbol: item.symbol,
        name: item.shortname,
        price: item.regularMarketPrice,
        change: item.regularMarketChange,
        changePercent: item.regularMarketChangePercent,
      })) || [];

    const result = {
      region,
      count: formatted.length,
      symbols: formatted,
    };

    if (CACHE_ENABLED) {
      await cache.set(cacheKey, result);
      log("debug", `MCP: Cached trending symbols for ${region}`);
    }

    return result;
  } catch (error) {
    throw new Error(`Trending symbols tool error: ${error.message}`);
  }
}

/**
 * Handle recommendations requests
 */
async function handleGetStockRecommendations(symbol) {
  const cacheKey = `recommendations:${symbol}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      log("debug", `MCP: Cache hit for recommendations: ${symbol}`);
      return cached;
    }
    log("debug", `MCP: Cache miss for recommendations: ${symbol}`);
  }

  try {
    log("debug", `MCP: Fetching recommendations for ${symbol}`);

    const recommendations: RecommendationsBySymbolResponse =
      await yahooFinance.recommendationsBySymbol(symbol);
    const formatted = (recommendations.recommendedSymbols || [])
      .slice(0, 10)
      .map((item) => ({
        symbol: item.symbol,
        name: item.shortname,
        recommendationKey: item.recommendationKey,
        recommendationScore: item.recommendationScore,
        percentDowngrade: item.percentDowngrade,
        percentHold: item.percentHold,
        percentBuy: item.percentBuy,
      }));

    const result = {
      baseSymbol: symbol,
      count: formatted.length,
      recommendations: formatted,
    };

    if (CACHE_ENABLED) {
      await cache.set(cacheKey, result);
      log("debug", `MCP: Cached recommendations for ${symbol}`);
    }

    return result;
  } catch (error) {
    throw new Error(`Recommendations tool error: ${error.message}`);
  }
}

/**
 * Handle insights requests
 */
async function handleGetStockInsights(symbol) {
  const cacheKey = `ticket:insights:${symbol}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      log("debug", `MCP: Cache hit for insights: ${symbol}`);
      return cached;
    }
    log("debug", `MCP: Cache miss for insights: ${symbol}`);
  }

  try {
    log("debug", `MCP: Fetching insights for ${symbol}`);

    const insights = (await yahooFinance.quoteSummary(symbol, {
      modules: [
        "recommendationTrend",
        "upgradeDowngradeHistory",
        "insiderTransactions",
        "insiderHolders",
      ],
    })) as QuoteSummaryResult;

    const result = {
      symbol,
      recommendations: insights.recommendationTrend?.trend?.slice(0, 5) || [],
      insiderTransactions:
        insights.insiderTransactions?.transactions?.slice(0, 5) || [],
      insiderHolders: insights.insiderHolders?.holders?.slice(0, 5) || [],
      upgrades: insights.upgradeDowngradeHistory?.history?.slice(0, 5) || [],
    };

    if (CACHE_ENABLED) {
      await cache.set(cacheKey, result);
      log("debug", `MCP: Cached insights for ${symbol}`);
    }

    return result;
  } catch (error) {
    throw new Error(`Insights tool error: ${error.message}`);
  }
}

/**
 * Handle screener requests
 */
async function handleGetStockScreener(type, count = 25) {
  const cacheKey = `screener:${type}:${count}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      log("debug", `MCP: Cache hit for screener: ${type}`);
      return cached;
    }
    log("debug", `MCP: Cache miss for screener: ${type}`);
  }

  try {
    log("debug", `MCP: Fetching screener ${type}`);

    const results = await yahooFinance.screener(type);
    const formatted = (results.quotes || [])
      .slice(0, Math.min(count, 100))
      .map((item) => ({
        symbol: item.symbol,
        name: item.shortName,
        price: item.regularMarketPrice,
        change: item.regularMarketChange,
        changePercent: item.regularMarketChangePercent,
        marketCap: item.marketCap,
      }));

    const result = {
      type,
      count: formatted.length,
      stocks: formatted,
    };

    if (CACHE_ENABLED) {
      await cache.set(cacheKey, result);
      log("debug", `MCP: Cached screener results for ${type}`);
    }

    return result;
  } catch (error) {
    throw new Error(`Screener tool error: ${error.message}`);
  }
}

/**
 * Handle stock performance analysis
 */
async function handleAnalyzeStockPerformance(symbol, period = "1y") {
  const cacheKey = `performance:${symbol}:${period}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      log("debug", `MCP: Cache hit for performance analysis: ${symbol}`);
      return cached;
    }
    log("debug", `MCP: Cache miss for performance analysis: ${symbol}`);
  }

  try {
    log("debug", `MCP: Analyzing performance for ${symbol}`);

    const history: HistoricalHistoryResult = await yahooFinance.historical(
      symbol,
      {
        period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        period2: new Date(),
        interval: "1d" as const,
      }
    );
    const result = await yahooFinance.quote(symbol);
    const quote = Array.isArray(result) ? result[0] : result;

    if (history.length < 2) {
      throw new Error("Insufficient historical data");
    }

    const startPrice = history[0].open;
    const endPrice = history[history.length - 1].close;
    const highPrice = Math.max(...history.map((h) => h.high));
    const lowPrice = Math.min(...history.map((h) => h.low));

    const totalReturn = ((endPrice - startPrice) / startPrice) * 100;
    const volatility = calculateVolatility(history);

    const performanceResult = {
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

    if (CACHE_ENABLED) {
      await cache.set(cacheKey, performanceResult);
      log("debug", `MCP: Cached performance analysis for ${symbol}`);
    }

    return performanceResult;
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
  const cacheKey = `ticket:financial:${symbol}:${statementType}:${period}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      log(
        "debug",
        `MCP: Cache hit for financial statement: ${symbol} ${statementType}`
      );
      return cached;
    }
    log(
      "debug",
      `MCP: Cache miss for financial statement: ${symbol} ${statementType}`
    );
  }

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
      })) as FundamentalsTimeSeriesResults;
    } catch (apiError) {
      log("error", `fundamentalsTimeSeries API error: ${apiError.message}`);
      // Try with a simpler call
      try {
        result = (await yahooFinance.fundamentalsTimeSeries(symbol, {
          period1: "2020-01-01",
          period2: "2024-12-31",
          type: "annual",
          module: moduleName,
        })) as FundamentalsTimeSeriesResults;
        log("info", `Fallback call succeeded with ${result.length} items`);
      } catch (fallbackError) {
        log("error", `Fallback call also failed: ${fallbackError.message}`);
        throw apiError; // Re-throw original error
      }
    }

    if (!result || result.length === 0) {
      const noDataResult = {
        symbol,
        type: statementType,
        period,
        count: 0,
        statements: [],
        message: `No ${statementType} statement data available`,
        timestamp: new Date().toISOString(),
      };
      if (CACHE_ENABLED) {
        await cache.set(cacheKey, noDataResult);
      }
      return noDataResult;
    }

    // Extract statements based on type
    const statements = result
      .slice(0, 5)
      .map((item: FundamentalsTimeSeriesResult) => {
        const formatted: Record<string, unknown> = {
          endDate: item.date,
        };

        // Add statement-specific fields
        if (statementType === "income") {
          const financialItem = item as FundamentalsTimeSeriesFinancialsResult;
          formatted.totalRevenue = financialItem.totalRevenue;
          formatted.costOfRevenue = financialItem.costOfRevenue;
          formatted.grossProfit = financialItem.grossProfit;
          formatted.operatingIncome = financialItem.operatingIncome;
          formatted.netIncome = financialItem.netIncome;
        } else if (statementType === "balance") {
          const balanceItem = item as FundamentalsTimeSeriesBalanceSheetResult;
          formatted.totalAssets = balanceItem.totalAssets;
          formatted.totalLiabilities =
            balanceItem.totalLiabilitiesNetMinorityInterest;
          formatted.totalEquity =
            balanceItem.stockholdersEquity || balanceItem.commonStockEquity;
          formatted.currentAssets = balanceItem.currentAssets;
          formatted.currentLiabilities = balanceItem.currentLiabilities;
        } else if (statementType === "cashflow") {
          const cashflowItem = item as FundamentalsTimeSeriesCashFlowResult;
          formatted.operatingCashFlow = cashflowItem.operatingCashFlow;
          formatted.investingCashFlow = cashflowItem.investingCashFlow;
          formatted.financingCashFlow = cashflowItem.financingCashFlow;
          formatted.freeCashFlow =
            (cashflowItem.operatingCashFlow || 0) -
            (cashflowItem.capitalExpenditure || 0);
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

    const statementResult = {
      symbol,
      type: statementType,
      period,
      count: statements.length,
      statements,
      timestamp: new Date().toISOString(),
    };

    if (CACHE_ENABLED) {
      await cache.set(cacheKey, statementResult);
      log(
        "debug",
        `MCP: Cached financial statement for ${symbol} ${statementType}`
      );
    }

    return statementResult;
  } catch (error) {
    throw new Error(`Financial statement tool error: ${error.message}`);
  }
}

/**
 * Handle stock news requests - simplified version
 * Note: news is retrieved from general search/trending data
 */
async function handleGetStockNews(symbol, count = 10) {
  const cacheKey = `ticket:news:${symbol}:${count}`;
  if (CACHE_ENABLED) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      log("debug", `MCP: Cache hit for news: ${symbol}`);
      return cached;
    }
    log("debug", `MCP: Cache miss for news: ${symbol}`);
  }

  try {
    log("debug", `MCP: Fetching news for ${symbol}`);

    const limitedCount = Math.min(count || 10, 50);

    // Get news using search API
    const searchResult = (await yahooFinance.search(symbol, {
      newsCount: limitedCount,
    })) as SearchResult;

    // Get company info for context
    const info = (await yahooFinance.quoteSummary(symbol, {
      modules: ["assetProfile"],
    })) as QuoteSummaryResult;

    // Format news articles
    const newsArticles = (searchResult.news || []).map((article) => ({
      title: article.title,
      publisher: article.publisher,
      link: article.link,
      publishedAt: article.providerPublishTime,
      type: article.type,
      relatedTickers: article.relatedTickers,
    }));

    const newsResult = {
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

    if (CACHE_ENABLED) {
      await cache.set(cacheKey, newsResult);
      log("debug", `MCP: Cached news for ${symbol}`);
    }

    return newsResult;
  } catch (error) {
    log("warn", `Stock news fetch failed for ${symbol}: ${error.message}`);
    const errorResult = {
      symbol,
      count: 0,
      news: [],
      message: "News data temporarily unavailable",
      timestamp: new Date().toISOString(),
    };
    if (CACHE_ENABLED) {
      await cache.set(cacheKey, errorResult);
    }
    return errorResult;
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

    const holdings = (topHoldingsData.topHoldings || {}) as TopHoldings;
    const profile = (topHoldingsData.fundProfile || {}) as FundProfile;

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
    })) as QuoteSummaryResult;

    const holdings = (result.topHoldings || {}) as TopHoldings;
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
export const toolHandlers = {
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
