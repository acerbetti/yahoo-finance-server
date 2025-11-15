/**
 * API Routes module
 * Defines all API endpoints with Swagger documentation
 * @module routes/index
 */

import { Router } from "express";
import yahooFinance from "../yahoo.js";
import { cache, CACHE_ENABLED } from "../config/cache.js";
import { log } from "../utils/logger.js";

const router = Router();

// ============================================================================
// Health Check Endpoint
// ============================================================================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Verify server status and availability
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: "ok"
 */
router.get("/health", (req, res) => {
  log("debug", `Health check requested from ${req.ip}`);
  res.json({ status: "ok" });
});

// ============================================================================
// Quote Endpoint
// ============================================================================

/**
 * @swagger
 * /quote/{symbols}:
 *   get:
 *     summary: Get current stock quotes
 *     description: Retrieve current stock price and quote data for one or more symbols
 *     tags: [Quotes]
 *     parameters:
 *       - in: path
 *         name: symbols
 *         required: true
 *         description: Comma-separated list of stock symbols (e.g., AAPL,GOOGL,MSFT)
 *         schema:
 *           type: string
 *         example: "AAPL,GOOGL"
 *     responses:
 *       200:
 *         description: Stock quote data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 $ref: '#/components/schemas/QuoteData'
 *             example:
 *               AAPL: {"price": {"regularMarketPrice": 150.25}}
 *               GOOGL: {"price": {"regularMarketPrice": 2800.50}}
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/quote/:symbols", async (req, res) => {
  const symbols = req.params.symbols;
  const cacheKey = `quote:${symbols}`;
  const symbolList = symbols.split(",").map((s) => s.trim());

  log(
    "info",
    `Quote request for symbols: ${symbolList.join(", ")} from ${req.ip}`
  );

  if (CACHE_ENABLED) {
    const cached = cache.get(cacheKey);
    if (cached) {
      log("debug", `Cache hit for quote: ${symbols}`);
      return res.json(cached);
    }
    log("debug", `Cache miss for quote: ${symbols}`);
  }

  try {
    log("debug", `Fetching quote data for ${symbolList.length} symbols`);
    const promises = symbolList.map((symbol) =>
      yahooFinance.quoteSummary(symbol.trim())
    );
    const results = await Promise.allSettled(promises);

    const data = {};
    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      const symbol = symbolList[index];
      if (result.status === "fulfilled") {
        data[symbol] = result.value;
        successCount++;
        log("debug", `Successfully fetched quote for ${symbol}`);
      } else {
        data[symbol] = { error: result.reason.message };
        errorCount++;
        log(
          "warn",
          `Failed to fetch quote for ${symbol}: ${result.reason.message}`
        );
      }
    });

    log(
      "info",
      `Quote request completed: ${successCount} successful, ${errorCount} failed`
    );

    if (CACHE_ENABLED) {
      cache.set(cacheKey, data);
      log("debug", `Cached quote data for ${symbols}`);
    }

    res.json(data);
  } catch (err) {
    log("error", `Quote endpoint error: ${err.message}`, err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// History Endpoint
// ============================================================================

/**
 * @swagger
 * /history/{symbols}:
 *   get:
 *     summary: Get historical stock data
 *     description: Retrieve historical price data for one or more symbols with configurable period and interval
 *     tags: [Historical Data]
 *     parameters:
 *       - in: path
 *         name: symbols
 *         required: true
 *         description: Comma-separated list of stock symbols
 *         schema:
 *           type: string
 *         example: "AAPL,GOOGL"
 *       - in: query
 *         name: period
 *         description: Time period for historical data
 *         schema:
 *           type: string
 *           enum: [1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max]
 *           default: "1y"
 *         example: "1y"
 *       - in: query
 *         name: interval
 *         description: Data interval
 *         schema:
 *           type: string
 *           enum: [1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo]
 *           default: "1d"
 *         example: "1d"
 *     responses:
 *       200:
 *         description: Historical price data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 $ref: '#/components/schemas/HistoricalData'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/history/:symbols", async (req, res) => {
  const symbols = req.params.symbols;
  const { period = "1y", interval = "1d" } = req.query;
  const cacheKey = `history:${symbols}:${period}:${interval}`;
  const symbolList = symbols.split(",").map((s) => s.trim());

  log(
    "info",
    `History request for symbols: ${symbolList.join(
      ", "
    )}, period: ${period}, interval: ${interval} from ${req.ip}`
  );

  if (CACHE_ENABLED) {
    const cached = cache.get(cacheKey);
    if (cached) {
      log("debug", `Cache hit for history: ${symbols} (${period}/${interval})`);
      return res.json(cached);
    }
    log("debug", `Cache miss for history: ${symbols} (${period}/${interval})`);
  }

  try {
    // Convert period to period1/period2 for chart API
    const now = new Date();
    let period1;
    switch (period) {
      case "1d":
        period1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "5d":
        period1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        break;
      case "1mo":
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3mo":
        period1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6mo":
        period1 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "2y":
        period1 = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
        break;
      case "5y":
        period1 = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        break;
      case "10y":
        period1 = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000);
        break;
      case "ytd":
        period1 = new Date(now.getFullYear(), 0, 1);
        break;
      case "max":
        period1 = new Date(1970, 0, 1);
        break;
      default:
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // default to 1y
    }

    log(
      "debug",
      `Fetching historical data for ${symbolList.length} symbols from ${
        period1.toISOString().split("T")[0]
      } to ${now.toISOString().split("T")[0]}`
    );

    const promises = symbolList.map((symbol) =>
      yahooFinance.chart(symbol, {
        period1: Math.floor(period1.getTime() / 1000),
        period2: Math.floor(now.getTime() / 1000),
        interval,
      })
    );
    const results = await Promise.allSettled(promises);

    const data = [];
    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      const symbol = symbolList[index];
      if (result.status === "fulfilled") {
        data.push(result.value.quotes);
        successCount++;
        log(
          "debug",
          `Successfully fetched history for ${symbol} (${
            result.value.quotes?.length || 0
          } data points)`
        );
      } else {
        data.push(null);
        errorCount++;
        log(
          "warn",
          `Failed to fetch history for ${symbol}: ${result.reason.message}`
        );
      }
    });

    log(
      "info",
      `History request completed: ${successCount} successful, ${errorCount} failed`
    );

    if (CACHE_ENABLED) {
      cache.set(cacheKey, data);
      log(
        "debug",
        `Cached history data for ${symbols} (${period}/${interval})`
      );
    }

    res.json(data);
  } catch (err) {
    log("error", `History endpoint error: ${err.message}`, err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Company Info Endpoint
// ============================================================================

/**
 * @swagger
 * /info/{symbols}:
 *   get:
 *     summary: Get company information
 *     description: Retrieve detailed company information and profiles for one or more symbols
 *     tags: [Company Info]
 *     parameters:
 *       - in: path
 *         name: symbols
 *         required: true
 *         description: Comma-separated list of stock symbols
 *         schema:
 *           type: string
 *         example: "AAPL,MSFT"
 *     responses:
 *       200:
 *         description: Company information data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 $ref: '#/components/schemas/CompanyInfo'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/info/:symbols", async (req, res) => {
  const symbols = req.params.symbols;
  const cacheKey = `info:${symbols}`;
  const symbolList = symbols.split(",").map((s) => s.trim());

  log(
    "info",
    `Info request for symbols: ${symbolList.join(", ")} from ${req.ip}`
  );

  if (CACHE_ENABLED) {
    const cached = cache.get(cacheKey);
    if (cached) {
      log("debug", `Cache hit for info: ${symbols}`);
      return res.json(cached);
    }
    log("debug", `Cache miss for info: ${symbols}`);
  }

  try {
    log("debug", `Fetching company info for ${symbolList.length} symbols`);
    const promises = symbolList.map((symbol) =>
      yahooFinance.quoteSummary(symbol, {
        modules: ["assetProfile", "summaryProfile"],
      })
    );
    const results = await Promise.allSettled(promises);

    const data = [];
    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      const symbol = symbolList[index];
      if (result.status === "fulfilled") {
        data.push(result.value);
        successCount++;
        log("debug", `Successfully fetched info for ${symbol}`);
      } else {
        data.push(null);
        errorCount++;
        log(
          "warn",
          `Failed to fetch info for ${symbol}: ${result.reason.message}`
        );
      }
    });

    log(
      "info",
      `Info request completed: ${successCount} successful, ${errorCount} failed`
    );

    if (CACHE_ENABLED) {
      cache.set(cacheKey, data);
      log("debug", `Cached info data for ${symbols}`);
    }

    res.json(data);
  } catch (err) {
    log("error", `Info endpoint error: ${err.message}`, err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Search Endpoint
// ============================================================================

/**
 * @swagger
 * /search/{query}:
 *   get:
 *     summary: Search for symbols and news
 *     description: Search for stock symbols, news articles, and financial data
 *     tags: [Search]
 *     parameters:
 *       - in: path
 *         name: query
 *         required: true
 *         description: Search term (company name, symbol, etc.)
 *         schema:
 *           type: string
 *         example: "apple"
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResult'
 *             example:
 *               quotes: [{"symbol": "AAPL", "shortname": "Apple Inc."}]
 *               news: [{"title": "Apple Inc. news", "publisher": "Yahoo Finance"}]
 *               count: 1
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/search/:query", async (req, res) => {
  const query = req.params.query;
  const cacheKey = `search:${query}`;

  log("info", `Search request for "${query}" from ${req.ip}`);

  if (CACHE_ENABLED) {
    const cached = cache.get(cacheKey);
    if (cached) {
      log("debug", `Cache hit for search: ${query}`);
      return res.json(cached);
    }
    log("debug", `Cache miss for search: ${query}`);
  }

  try {
    const result = await yahooFinance.search(query);
    log(
      "debug",
      `Search completed for "${query}": ${result.quotes?.length || 0} quotes, ${
        result.news?.length || 0
      } news`
    );

    if (CACHE_ENABLED) {
      cache.set(cacheKey, result);
      log("debug", `Cached search results for ${query}`);
    }

    res.json(result);
  } catch (err) {
    log("error", `Search endpoint error for "${query}": ${err.message}`, err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Trending Endpoint
// ============================================================================

/**
 * @swagger
 * /trending/{region}:
 *   get:
 *     summary: Get trending symbols
 *     description: Retrieve currently trending stock symbols for a specific region
 *     tags: [Trending]
 *     parameters:
 *       - in: path
 *         name: region
 *         required: true
 *         description: Region code (US, CA, UK, DE, FR, etc.)
 *         schema:
 *           type: string
 *         example: "US"
 *     responses:
 *       200:
 *         description: Trending symbols data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrendingResult'
 *             example:
 *               count: 5
 *               quotes: [{"symbol": "AAPL"}, {"symbol": "TSLA"}]
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/trending/:region", async (req, res) => {
  const region = req.params.region || "US";
  const cacheKey = `trending:${region}`;

  log("info", `Trending symbols request for region: ${region} from ${req.ip}`);

  if (CACHE_ENABLED) {
    const cached = cache.get(cacheKey);
    if (cached) {
      log("debug", `Cache hit for trending: ${region}`);
      return res.json(cached);
    }
    log("debug", `Cache miss for trending: ${region}`);
  }

  try {
    const result = await yahooFinance.trendingSymbols(region);
    log(
      "debug",
      `Trending symbols for ${region}: ${result.quotes?.length || 0} symbols`
    );

    if (CACHE_ENABLED) {
      cache.set(cacheKey, result);
      log("debug", `Cached trending symbols for ${region}`);
    }

    res.json(result);
  } catch (err) {
    log(
      "error",
      `Trending symbols endpoint error for "${region}": ${err.message}`,
      err
    );
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Recommendations Endpoint
// ============================================================================

/**
 * @swagger
 * /recommendations/{symbol}:
 *   get:
 *     summary: Get similar stock recommendations
 *     description: Retrieve recommended similar stocks for a given symbol
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         description: Stock symbol to get recommendations for
 *         schema:
 *           type: string
 *         example: "AAPL"
 *     responses:
 *       200:
 *         description: Stock recommendations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecommendationsResult'
 *             example:
 *               symbol: "AAPL"
 *               recommendedSymbols: [{"symbol": "MSFT", "score": 0.9999}]
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/recommendations/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const cacheKey = `recommendations:${symbol}`;

  log("info", `Recommendations request for symbol: ${symbol} from ${req.ip}`);

  if (CACHE_ENABLED) {
    const cached = cache.get(cacheKey);
    if (cached) {
      log("debug", `Cache hit for recommendations: ${symbol}`);
      return res.json(cached);
    }
    log("debug", `Cache miss for recommendations: ${symbol}`);
  }

  try {
    const result = await yahooFinance.recommendationsBySymbol(symbol);
    log(
      "debug",
      `Recommendations for ${symbol}: ${
        result.recommendedSymbols?.length || 0
      } symbols`
    );

    if (CACHE_ENABLED) {
      cache.set(cacheKey, result);
      log("debug", `Cached recommendations for ${symbol}`);
    }

    res.json(result);
  } catch (err) {
    log(
      "error",
      `Recommendations endpoint error for "${symbol}": ${err.message}`,
      err
    );
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Insights Endpoint
// ============================================================================

/**
 * @swagger
 * /insights/{symbol}:
 *   get:
 *     summary: Get comprehensive stock insights
 *     description: Retrieve detailed insights and analysis for a stock symbol including company snapshot, recommendations, and events
 *     tags: [Insights]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         description: Stock symbol to get insights for
 *         schema:
 *           type: string
 *         example: "AAPL"
 *     responses:
 *       200:
 *         description: Comprehensive stock insights
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InsightsResult'
 *             example:
 *               symbol: "AAPL"
 *               companySnapshot: {"sectorInfo": "Technology"}
 *               recommendation: {"targetPrice": 250.0, "rating": "BUY"}
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/insights/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const cacheKey = `insights:${symbol}`;

  log("info", `Insights request for symbol: ${symbol} from ${req.ip}`);

  if (CACHE_ENABLED) {
    const cached = cache.get(cacheKey);
    if (cached) {
      log("debug", `Cache hit for insights: ${symbol}`);
      return res.json(cached);
    }
    log("debug", `Cache miss for insights: ${symbol}`);
  }

  try {
    const result = await yahooFinance.insights(symbol);
    log("debug", `Insights retrieved for ${symbol}`);

    if (CACHE_ENABLED) {
      cache.set(cacheKey, result);
      log("debug", `Cached insights for ${symbol}`);
    }

    res.json(result);
  } catch (err) {
    log(
      "error",
      `Insights endpoint error for "${symbol}": ${err.message}`,
      err
    );
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Screener Endpoint
// ============================================================================

/**
 * @swagger
 * /screener/{type}:
 *   get:
 *     summary: Get stock screener results
 *     description: Retrieve stock screening results for different categories like gainers, losers, and most active
 *     tags: [Screener]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         description: Screener type
 *         schema:
 *           type: string
 *           enum: [day_gainers, day_losers, most_actives, most_shorted]
 *         example: "day_gainers"
 *       - in: query
 *         name: count
 *         description: Number of results to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 25
 *         example: 25
 *     responses:
 *       200:
 *         description: Stock screener results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScreenerResult'
 *             example:
 *               quotes: [{"symbol": "AAPL", "regularMarketChangePercent": 5.2}]
 *               total: 100
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/screener/:type", async (req, res) => {
  const type = req.params.type;
  const count = parseInt(req.query.count) || 25;
  const cacheKey = `screener:${type}:${count}`;

  log(
    "info",
    `Screener request for type: ${type}, count: ${count} from ${req.ip}`
  );

  if (CACHE_ENABLED) {
    const cached = cache.get(cacheKey);
    if (cached) {
      log("debug", `Cache hit for screener: ${type}`);
      return res.json(cached);
    }
    log("debug", `Cache miss for screener: ${type}`);
  }

  try {
    let scrIds;
    switch (type) {
      case "day_gainers":
        scrIds = "day_gainers";
        break;
      case "day_losers":
        scrIds = "day_losers";
        break;
      case "most_actives":
        scrIds = "most_actives";
        break;
      case "most_shorted":
        scrIds = "most_shorted_stocks";
        break;
      default:
        scrIds = type; // Allow custom screener IDs
    }

    const result = await yahooFinance.screener({ scrIds, count });
    log(
      "debug",
      `Screener results for ${type}: ${result.quotes?.length || 0} symbols`
    );

    if (CACHE_ENABLED) {
      cache.set(cacheKey, result);
      log("debug", `Cached screener results for ${type}`);
    }

    res.json(result);
  } catch (err) {
    log("error", `Screener endpoint error for "${type}": ${err.message}`, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
