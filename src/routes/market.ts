/**
 * Market Routes module
 * Generic market data endpoints (no specific ticker required)
 * @module routes/market
 */

import { Router, Request, Response } from "express";

import { cache, CACHE_ENABLED } from "../config/cache";
import type {
  Quote,
  ScreenerResult,
  PredefinedScreenerModules,
  TrendingSymbolsResult,
  SearchNews,
  ErrorResponse,
} from "../types";
import { log } from "../utils/logger";
import yahooFinance from "../yahoo";

const router = Router();

// ============================================================================
// Route Types
// ============================================================================

interface TrendingRouteParams {
  region: string;
}

interface ScreenerRouteParams {
  type: PredefinedScreenerModules;
}

interface MarketQueryParams {
  count?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Handle standardized error responses for market endpoints
 */
function handleMarketError(
  res: Response<ErrorResponse>,
  endpointName: string,
  err: unknown,
  additionalErrorChecks: string[] = []
): void {
  const errorMessage = err instanceof Error ? err.message : String(err);
  log("error", `Market ${endpointName} endpoint error: ${errorMessage}`, err);

  // Check for specific error patterns that might indicate different status codes
  const clientErrorPatterns = [
    "Invalid region",
    "Invalid screener type",
    ...additionalErrorChecks,
  ];

  const isClientError = clientErrorPatterns.some((pattern) =>
    errorMessage.includes(pattern)
  );

  if (isClientError) {
    res.status(400).json({ error: errorMessage });
  } else {
    res.status(500).json({ error: errorMessage });
  }
}

// ============================================================================
// Market Indices Endpoint
// ============================================================================

/**
 * @swagger
 * /market/indices:
 *   get:
 *     summary: Get major market indices
 *     description: Retrieve current data for major market indices (S&P 500, Dow Jones, NASDAQ, Russell 2000)
 *     tags: [Market]
 *     responses:
 *       200:
 *         description: Market indices data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 indices:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Quote'
 *             example:
 *               indices: [
 *                 {"symbol": "^GSPC", "regularMarketPrice": 4500.25, "regularMarketChangePercent": 1.25},
 *                 {"symbol": "^DJI", "regularMarketPrice": 35000.50, "regularMarketChangePercent": 0.85}
 *               ]
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/indices",
  async (req: Request, res: Response<{ indices: Quote[] } | ErrorResponse>) => {
    const cacheKey = "market_indices";

    log("info", `Market indices request from ${req.ip}`);

    if (CACHE_ENABLED) {
      const cached = await cache.get<{ indices: Quote[] }>(cacheKey);
      if (cached) {
        log("debug", `Cache hit for market indices`);
        return res.json(cached);
      }
      log("debug", `Cache miss for market indices`);
    }

    try {
      // Major market indices
      const indices = [
        "^GSPC", // S&P 500
        "^DJI", // Dow Jones Industrial Average
        "^IXIC", // NASDAQ Composite
        "^RUT", // Russell 2000
        "^VIX", // CBOE Volatility Index
      ];

      const results = await Promise.allSettled(
        indices.map((symbol) => yahooFinance.quote(symbol))
      );

      const validIndices: Quote[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          validIndices.push({
            ...result.value,
            symbol: indices[index], // Ensure symbol is included
          });
        }
      });

      const response = { indices: validIndices };

      if (CACHE_ENABLED) {
        await cache.set<{ indices: Quote[] }>(cacheKey, response);
        log("debug", `Cached market indices`);
      }

      log("debug", `Market indices: ${validIndices.length} indices retrieved`);
      res.json(response);
    } catch (err) {
      handleMarketError(res, "indices", err);
    }
  }
);

// ============================================================================
// Market Summary Endpoint
// ============================================================================

/**
 * @swagger
 * /market/summary:
 *   get:
 *     summary: Get comprehensive market summary
 *     description: Retrieve a comprehensive market overview including indices, trending symbols, gainers/losers counts, and recent news
 *     tags: [Market]
 *     responses:
 *       200:
 *         description: Market summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 indices:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Quote'
 *                 trending:
 *                   $ref: '#/components/schemas/TrendingSymbolsResult'
 *                 gainers:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                     quotes:
 *                       type: array
 *                       items:
 *                         type: object
 *                 losers:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                     quotes:
 *                       type: array
 *                       items:
 *                         type: object
 *                 news:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SearchNews'
 *             example:
 *               indices: [{"symbol": "^GSPC", "regularMarketPrice": 4500.25}]
 *               trending: {"count": 20, "quotes": []}
 *               gainers: {"count": 100, "quotes": []}
 *               losers: {"count": 80, "quotes": []}
 *               news: [{"title": "Market Update", "link": "https://..."}]
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/summary",
  async (
    req: Request,
    res: Response<
      | {
          indices: Quote[];
          trending: TrendingSymbolsResult;
          gainers: { count: number; quotes: Quote[] };
          losers: { count: number; quotes: Quote[] };
          news: SearchNews[];
        }
      | ErrorResponse
    >
  ) => {
    const cacheKey = "market_summary";

    log("info", `Market summary request from ${req.ip}`);

    if (CACHE_ENABLED) {
      const cached = await cache.get<{
        indices: Quote[];
        trending: TrendingSymbolsResult;
        gainers: { count: number; quotes: Quote[] };
        losers: { count: number; quotes: Quote[] };
        news: SearchNews[];
      }>(cacheKey);
      if (cached) {
        log("debug", `Cache hit for market summary`);
        return res.json(cached);
      }
      log("debug", `Cache miss for market summary`);
    }

    try {
      // Fetch all market data in parallel
      const [
        indicesResult,
        trendingResult,
        gainersResult,
        losersResult,
        newsResult,
      ] = await Promise.allSettled([
        // Get major indices
        Promise.all([
          yahooFinance.quote("^GSPC"),
          yahooFinance.quote("^DJI"),
          yahooFinance.quote("^IXIC"),
        ]).catch(() => []),

        // Get trending symbols
        yahooFinance.trendingSymbols("US").catch(() => ({
          count: 0,
          quotes: [],
          jobTimestamp: 0,
          startInterval: 0,
        })),

        // Get top gainers
        yahooFinance.screener("day_gainers").catch(() => ({ quotes: [] })),

        // Get top losers
        yahooFinance.screener("day_losers").catch(() => ({ quotes: [] })),

        // Get market news
        yahooFinance
          .search("market", { newsCount: 5 })
          .catch(() => ({ news: [] })),
      ]);

      const response = {
        indices:
          indicesResult.status === "fulfilled" ? indicesResult.value : [],
        trending:
          trendingResult.status === "fulfilled"
            ? trendingResult.value
            : ({
                count: 0,
                quotes: [],
                jobTimestamp: 0,
                startInterval: 0,
              } as TrendingSymbolsResult),
        gainers: {
          count:
            gainersResult.status === "fulfilled"
              ? gainersResult.value.quotes?.length || 0
              : 0,
          quotes:
            gainersResult.status === "fulfilled"
              ? (gainersResult.value.quotes || []).slice(0, 5)
              : [],
        },
        losers: {
          count:
            losersResult.status === "fulfilled"
              ? losersResult.value.quotes?.length || 0
              : 0,
          quotes:
            losersResult.status === "fulfilled"
              ? (losersResult.value.quotes || []).slice(0, 5)
              : [],
        },
        news:
          newsResult.status === "fulfilled" ? newsResult.value.news || [] : [],
      };

      if (CACHE_ENABLED) {
        await cache.set(cacheKey, response);
        log("debug", `Cached market summary`);
      }

      res.json(response);
    } catch (err) {
      handleMarketError(res, "summary", err);
    }
  }
);

// ============================================================================
// Sector Performance Endpoint
// ============================================================================

/**
 * @swagger
 * /market/sectors:
 *   get:
 *     summary: Get sector performance
 *     description: Retrieve performance data for major market sectors via sector ETFs
 *     tags: [Market]
 *     responses:
 *       200:
 *         description: Sector performance data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sectors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       symbol:
 *                         type: string
 *                       name:
 *                         type: string
 *                       performance:
 *                         $ref: '#/components/schemas/Quote'
 *             example:
 *               sectors: [
 *                 {"symbol": "QQQ", "name": "Technology", "performance": {"regularMarketChangePercent": 2.1}},
 *                 {"symbol": "XLF", "name": "Financials", "performance": {"regularMarketChangePercent": -0.5}}
 *               ]
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/sectors",
  async (
    req: Request,
    res: Response<
      | {
          sectors: Array<{
            symbol: string;
            name: string;
            performance: Quote;
          }>;
        }
      | ErrorResponse
    >
  ) => {
    const cacheKey = "market_sectors";

    log("info", `Market sectors request from ${req.ip}`);

    if (CACHE_ENABLED) {
      const cached = await cache.get<{
        sectors: Array<{
          symbol: string;
          name: string;
          performance: Quote;
        }>;
      }>(cacheKey);
      if (cached) {
        log("debug", `Cache hit for market sectors`);
        return res.json(cached);
      }
      log("debug", `Cache miss for market sectors`);
    }

    try {
      // Major sector ETFs
      const sectors = [
        { symbol: "QQQ", name: "Technology" },
        { symbol: "XLF", name: "Financials" },
        { symbol: "XLV", name: "Healthcare" },
        { symbol: "XLE", name: "Energy" },
        { symbol: "XLY", name: "Consumer Discretionary" },
        { symbol: "XLP", name: "Consumer Staples" },
        { symbol: "XLK", name: "Technology" },
        { symbol: "XLU", name: "Utilities" },
        { symbol: "XLRE", name: "Real Estate" },
        { symbol: "XLI", name: "Industrials" },
        { symbol: "XLC", name: "Communication Services" },
        { symbol: "XLB", name: "Materials" },
      ];

      const results = await Promise.allSettled(
        sectors.map((sector) => yahooFinance.quote(sector.symbol))
      );

      const validSectors: Array<{
        symbol: string;
        name: string;
        performance: Quote;
      }> = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          validSectors.push({
            symbol: sectors[index].symbol,
            name: sectors[index].name,
            performance: result.value,
          });
        }
      });

      const response = { sectors: validSectors };

      if (CACHE_ENABLED) {
        await cache.set(cacheKey, response);
        log("debug", `Cached market sectors`);
      }

      res.json(response);
    } catch (err) {
      handleMarketError(res, "sectors", err);
    }
  }
);

// ============================================================================
// Currency Exchange Rates Endpoint
// ============================================================================

/**
 * @swagger
 * /market/currencies:
 *   get:
 *     summary: Get major currency exchange rates
 *     description: Retrieve current exchange rates for major currency pairs
 *     tags: [Market]
 *     responses:
 *       200:
 *         description: Currency exchange rates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currencies:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Quote'
 *             example:
 *               currencies: [
 *                 {"symbol": "EURUSD=X", "regularMarketPrice": 1.0850, "regularMarketChangePercent": 0.25},
 *                 {"symbol": "GBPUSD=X", "regularMarketPrice": 1.2750, "regularMarketChangePercent": -0.15}
 *               ]
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/currencies",
  async (
    req: Request,
    res: Response<{ currencies: Quote[] } | ErrorResponse>
  ) => {
    const cacheKey = "market_currencies";

    log("info", `Market currencies request from ${req.ip}`);

    if (CACHE_ENABLED) {
      const cached = await cache.get<{ currencies: Quote[] }>(cacheKey);
      if (cached) {
        log("debug", `Cache hit for market currencies`);
        return res.json(cached);
      }
      log("debug", `Cache miss for market currencies`);
    }

    try {
      // Major currency pairs
      const currencies = [
        "EURUSD=X", // EUR/USD
        "GBPUSD=X", // GBP/USD
        "USDJPY=X", // USD/JPY
        "USDCHF=X", // USD/CHF
        "USDCAD=X", // USD/CAD
        "AUDUSD=X", // AUD/USD
        "NZDUSD=X", // NZD/USD
        "USDCNY=X", // USD/CNY
      ];

      const results = await Promise.allSettled(
        currencies.map((symbol) => yahooFinance.quote(symbol))
      );

      const validCurrencies: Quote[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          validCurrencies.push({
            ...result.value,
            symbol: currencies[index], // Ensure symbol is included
          });
        }
      });

      const response = { currencies: validCurrencies };

      if (CACHE_ENABLED) {
        await cache.set<{ currencies: Quote[] }>(cacheKey, response);
        log("debug", `Cached market currencies`);
      }

      res.json(response);
    } catch (err) {
      handleMarketError(res, "currencies", err);
    }
  }
);

// ============================================================================
// Commodity Prices Endpoint
// ============================================================================

/**
 * @swagger
 * /market/commodities:
 *   get:
 *     summary: Get commodity prices
 *     description: Retrieve current prices for major commodities
 *     tags: [Market]
 *     responses:
 *       200:
 *         description: Commodity prices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 commodities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       symbol:
 *                         type: string
 *                       name:
 *                         type: string
 *                       price:
 *                         $ref: '#/components/schemas/Quote'
 *             example:
 *               commodities: [
 *                 {"symbol": "GC=F", "name": "Gold", "price": {"regularMarketPrice": 2050.50}},
 *                 {"symbol": "CL=F", "name": "Crude Oil", "price": {"regularMarketPrice": 78.25}}
 *               ]
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/commodities",
  async (
    req: Request,
    res: Response<
      | {
          commodities: Array<{
            symbol: string;
            name: string;
            price: Quote;
          }>;
        }
      | ErrorResponse
    >
  ) => {
    const cacheKey = "market_commodities";

    log("info", `Market commodities request from ${req.ip}`);

    if (CACHE_ENABLED) {
      const cached = await cache.get<{
        commodities: Array<{
          symbol: string;
          name: string;
          price: Quote;
        }>;
      }>(cacheKey);
      if (cached) {
        log("debug", `Cache hit for market commodities`);
        return res.json(cached);
      }
      log("debug", `Cache miss for market commodities`);
    }

    try {
      // Major commodities
      const commodities = [
        { symbol: "GC=F", name: "Gold" },
        { symbol: "SI=F", name: "Silver" },
        { symbol: "CL=F", name: "Crude Oil" },
        { symbol: "NG=F", name: "Natural Gas" },
        { symbol: "HG=F", name: "Copper" },
        { symbol: "ZC=F", name: "Corn" },
        { symbol: "ZW=F", name: "Wheat" },
        { symbol: "ZS=F", name: "Soybeans" },
      ];

      const results = await Promise.allSettled(
        commodities.map((commodity) => yahooFinance.quote(commodity.symbol))
      );

      const validCommodities: Array<{
        symbol: string;
        name: string;
        price: Quote;
      }> = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          validCommodities.push({
            symbol: commodities[index].symbol,
            name: commodities[index].name,
            price: result.value,
          });
        }
      });

      const response = { commodities: validCommodities };

      if (CACHE_ENABLED) {
        await cache.set(cacheKey, response);
        log("debug", `Cached market commodities`);
      }

      res.json(response);
    } catch (err) {
      handleMarketError(res, "commodities", err);
    }
  }
);

// ============================================================================
// Market Breadth Indicators Endpoint
// ============================================================================

/**
 * @swagger
 * /market/breadth:
 *   get:
 *     summary: Get market breadth indicators
 *     description: Retrieve market breadth indicators like advance-decline data and new highs/lows
 *     tags: [Market]
 *     responses:
 *       200:
 *         description: Market breadth data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 breadth:
 *                   type: object
 *                   properties:
 *                     gainers:
 *                       type: integer
 *                       description: Number of stocks that gained today
 *                     losers:
 *                       type: integer
 *                       description: Number of stocks that lost today
 *                     unchanged:
 *                       type: integer
 *                       description: Number of stocks unchanged today
 *                     ratio:
 *                       type: number
 *                       description: Advancers to Decliners ratio
 *             example:
 *               breadth: {
 *                 "gainers": 1500,
 *                 "losers": 1200,
 *                 "unchanged": 300,
 *                 "ratio": 1.25
 *               }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/breadth",
  async (
    req: Request,
    res: Response<
      | {
          breadth: {
            gainers: number;
            losers: number;
            unchanged: number;
            ratio: number;
          };
        }
      | ErrorResponse
    >
  ) => {
    const cacheKey = "market_breadth";

    log("info", `Market breadth request from ${req.ip}`);

    if (CACHE_ENABLED) {
      const cached = await cache.get<{
        breadth: {
          gainers: number;
          losers: number;
          unchanged: number;
          ratio: number;
        };
      }>(cacheKey);
      if (cached) {
        log("debug", `Cache hit for market breadth`);
        return res.json(cached);
      }
      log("debug", `Cache miss for market breadth`);
    }

    try {
      // Get gainers and losers data
      const [gainersResult, losersResult] = await Promise.all([
        yahooFinance.screener("day_gainers").catch(() => ({ quotes: [] })),
        yahooFinance.screener("day_losers").catch(() => ({ quotes: [] })),
      ]);

      const gainers = gainersResult.quotes?.length || 0;
      const losers = losersResult.quotes?.length || 0;
      const ratio = losers > 0 ? gainers / losers : gainers;

      const response = {
        breadth: {
          gainers,
          losers,
          unchanged: 0, // Would need more complex logic to calculate unchanged
          ratio: Math.round(ratio * 100) / 100,
        },
      };

      if (CACHE_ENABLED) {
        await cache.set(cacheKey, response);
        log("debug", `Cached market breadth`);
      }

      res.json(response);
    } catch (err) {
      handleMarketError(res, "breadth", err);
    }
  }
);

// ============================================================================
// Market Sentiment Endpoint
// ============================================================================

/**
 * @swagger
 * /market/sentiment:
 *   get:
 *     summary: Get market sentiment indicators
 *     description: Retrieve market sentiment data including VIX, put/call ratio, and other sentiment indicators
 *     tags: [Market]
 *     responses:
 *       200:
 *         description: Market sentiment data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sentiment:
 *                   type: object
 *                   properties:
 *                     vix:
 *                       $ref: '#/components/schemas/Quote'
 *                     fearGreedIndex:
 *                       type: object
 *                       description: Fear & Greed Index data (when available)
 *             example:
 *               sentiment: {
 *                 "vix": {"symbol": "^VIX", "regularMarketPrice": 18.50},
 *                 "fearGreedIndex": {}
 *               }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/sentiment",
  async (
    req: Request,
    res: Response<
      | {
          sentiment: {
            vix: Quote | null;
            fearGreedIndex: Record<string, unknown>;
          };
        }
      | ErrorResponse
    >
  ) => {
    const cacheKey = "market_sentiment";

    log("info", `Market sentiment request from ${req.ip}`);

    if (CACHE_ENABLED) {
      const cached = await cache.get<{
        sentiment: {
          vix: Quote | null;
          fearGreedIndex: Record<string, unknown>;
        };
      }>(cacheKey);
      if (cached) {
        log("debug", `Cache hit for market sentiment`);
        return res.json(cached);
      }
      log("debug", `Cache miss for market sentiment`);
    }

    try {
      // Get VIX data
      const vixResult = await yahooFinance.quote("^VIX").catch(() => null);

      const response = {
        sentiment: {
          vix: vixResult,
          fearGreedIndex: {}, // Would need external API for Fear & Greed Index
        },
      };

      if (CACHE_ENABLED) {
        await cache.set(cacheKey, response);
        log("debug", `Cached market sentiment`);
      }

      res.json(response);
    } catch (err) {
      handleMarketError(res, "sentiment", err);
    }
  }
);

// ============================================================================
// Moved Endpoints (for backward compatibility)
// ============================================================================

// Trending Symbols (moved from /trending/:region)
/**
 * @swagger
 * /market/trending/{region}:
 *   get:
 *     summary: Get trending symbols (moved from /trending)
 *     description: Retrieve currently trending stock symbols for a specific region
 *     tags: [Market]
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
 *               $ref: '#/components/schemas/TrendingSymbolsResult'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/trending/:region",
  async (
    req: Request<TrendingRouteParams>,
    res: Response<TrendingSymbolsResult | ErrorResponse>
  ) => {
    const region = req.params.region || "US";
    const cacheKey = `trending:${region}`;

    log(
      "info",
      `Market trending symbols request for region: ${region} from ${req.ip}`
    );

    if (CACHE_ENABLED) {
      const cached = await cache.get<TrendingSymbolsResult>(cacheKey);
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
        await cache.set<TrendingSymbolsResult>(cacheKey, result);
        log("debug", `Cached trending symbols for ${region}`);
      }

      res.json(result);
    } catch (err) {
      handleMarketError(res, "trending", err, ["Invalid region"]);
    }
  }
);

// Stock Screener (moved from /screener/:type)
/**
 * @swagger
 * /market/screener/{type}:
 *   get:
 *     summary: Get stock screener results (moved from /screener)
 *     description: Retrieve stock screening results for different categories like gainers, losers, and most active
 *     tags: [Market]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         description: Screener type
 *         schema:
 *           type: string
 *           enum: [day_gainers, day_losers, most_actives]
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/screener/:type",
  async (
    req: Request<ScreenerRouteParams, unknown, unknown, { count?: string }>,
    res: Response<ScreenerResult | ErrorResponse>
  ) => {
    const type = req.params.type;

    // Validate that type is a valid PredefinedScreenerModules
    const validTypes: PredefinedScreenerModules[] = [
      "day_gainers",
      "day_losers",
      "most_actives",
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid screener type: ${type}. Valid types are: ${validTypes.join(
          ", "
        )}`,
      });
    }
    const count = parseInt(req.query.count as string) || 25;
    const cacheKey = `screener:${type}:${count}`;

    log(
      "info",
      `Market screener request for type: ${type}, count: ${count} from ${req.ip}`
    );

    if (CACHE_ENABLED) {
      const cached = await cache.get<ScreenerResult>(cacheKey);
      if (cached) {
        log("debug", `Cache hit for screener: ${type}`);
        return res.json(cached);
      }
      log("debug", `Cache miss for screener: ${type}`);
    }

    try {
      const result = await yahooFinance.screener(type);
      log(
        "debug",
        `Screener results for ${type}: ${result.quotes?.length || 0} symbols`
      );

      // Slice results based on count parameter
      const slicedResult: ScreenerResult = {
        ...result,
        quotes: (result.quotes || []).slice(0, Math.min(count, 100)),
      };

      if (CACHE_ENABLED) {
        await cache.set<ScreenerResult>(cacheKey, slicedResult);
        log("debug", `Cached screener results for ${type}`);
      }

      res.json(slicedResult);
    } catch (err) {
      handleMarketError(res, "screener", err, ["Invalid screener type"]);
    }
  }
);

// General News (moved from /news)
/**
 * @swagger
 * /market/news:
 *   get:
 *     summary: Get general market news (moved from /news)
 *     description: Retrieve latest general market news articles
 *     tags: [Market]
 *     parameters:
 *       - in: query
 *         name: count
 *         description: Number of news articles to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         example: 10
 *     responses:
 *       200:
 *         description: General market news articles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NewsResult'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/news",
  async (
    req: Request<unknown, unknown, unknown, MarketQueryParams>,
    res: Response<SearchNews[] | ErrorResponse>
  ) => {
    const count = parseInt(req.query.count as string) || 10;
    const cacheKey = `news_general:${count}`;

    log("info", `Market general news request, count: ${count} from ${req.ip}`);

    if (CACHE_ENABLED) {
      const cached = await cache.get<SearchNews[]>(cacheKey);
      if (cached) {
        log("debug", `Cache hit for general news`);
        return res.json(cached);
      }
      log("debug", `Cache miss for general news`);
    }

    try {
      // Use a broad search to get general market news
      const result = await yahooFinance.search("market", { newsCount: count });

      if (CACHE_ENABLED) {
        await cache.set<SearchNews[]>(cacheKey, result.news || []);
        log("debug", `Cached general news`);
      }

      res.json(result.news || []);
    } catch (err) {
      handleMarketError(res, "news", err);
    }
  }
);

export default router;

// Export for testing
export { handleMarketError };
