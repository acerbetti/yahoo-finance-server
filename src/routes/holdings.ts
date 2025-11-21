/**
 * Holdings Routes module
 * ETF holdings and composition endpoints
 * @module routes/holdings
 */

import { Router, Request, Response } from "express";
import yahooFinance from "../yahoo";
import { cache, CACHE_ENABLED } from "../config/cache";
import { log } from "../utils/logger";
import type {
  QuoteSummaryOptions,
  QuoteSummaryResult,
  ErrorResponse,
} from "../types";

const router = Router();

// ============================================================================
// Route Types
// ============================================================================

interface HoldingsRouteParams {
  symbol: string;
}

interface HoldingsResponseBody {
  symbol: string;
  holdings: NonNullable<QuoteSummaryResult["topHoldings"]>["holdings"];
  sectorWeightings: NonNullable<
    QuoteSummaryResult["topHoldings"]
  >["sectorWeightings"];
  equityHoldings?: NonNullable<
    QuoteSummaryResult["topHoldings"]
  >["equityHoldings"];
  cashPosition?: NonNullable<QuoteSummaryResult["topHoldings"]>["cashPosition"];
  stockPosition?: NonNullable<
    QuoteSummaryResult["topHoldings"]
  >["stockPosition"];
  bondPosition?: NonNullable<QuoteSummaryResult["topHoldings"]>["bondPosition"];
  otherPosition?: NonNullable<
    QuoteSummaryResult["topHoldings"]
  >["otherPosition"];
}

interface HoldingsFallbackResponseBody {
  fallback: true;
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  marketCap?: number;
  volume?: number;
  averageVolume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  message: string;
}

type HoldingsResponse = HoldingsResponseBody | HoldingsFallbackResponseBody;

interface FundHoldingsRouteParams {
  symbol: string;
}

type FundHoldingsResponseBody = QuoteSummaryResult;

// ============================================================================
// ETF Holdings Endpoint
// ============================================================================

/**
 * @swagger
 * /holdings/{symbol}:
 *   get:
 *     summary: Get ETF holdings
 *     description: Retrieve ETF holdings, sector allocations, and position breakdowns. Falls back to basic ETF information if detailed holdings are unavailable.
 *     tags: [Holdings]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         description: ETF symbol
 *         schema:
 *           type: string
 *           example: "SPY"
 *     responses:
 *       200:
 *         description: ETF holdings data or fallback basic information
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ETFHoldings'
 *                 - $ref: '#/components/schemas/ETFFallback'
 *             examples:
 *               detailed:
 *                 summary: Detailed holdings data
 *                 value:
 *                   holdings: [{"symbol": "AAPL", "holdingPercent": 6.61}]
 *                   sectorWeightings: [{"sector": "Technology", "percentage": 25.5}]
 *                   equityHoldings: {"priceToEarnings": 22.5}
 *               fallback:
 *                 summary: Fallback basic information
 *                 value:
 *                   fallback: true
 *                   symbol: "SPY"
 *                   shortName: "SPDR S&P 500 ETF Trust"
 *                   regularMarketPrice: 450.25
 *                   marketCap: 450000000000
 *                   message: "Detailed holdings data not available. Showing basic ETF information."
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:symbol",
  async (
    req: Request<HoldingsRouteParams>,
    res: Response<HoldingsResponse | ErrorResponse>
  ) => {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = `holdings:${symbol}`;

    log("info", `ETF holdings request for ${symbol} from ${req.ip}`);

    if (CACHE_ENABLED) {
      const cached = await cache.get<HoldingsResponse>(cacheKey);
      if (cached) {
        log("debug", `Cache hit for holdings: ${symbol}`);
        return res.json(cached);
      }
      log("debug", `Cache miss for holdings: ${symbol}`);
    }

    try {
      // Get detailed holdings data
      console.log(`Fetching holdings for ${symbol}...`);
      const topHoldingsData = await yahooFinance.quoteSummary(symbol, {
        modules: ["topHoldings"] as unknown as QuoteSummaryOptions["modules"],
      });
      console.log(`Got data for ${symbol}:`, !!topHoldingsData.topHoldings);

      // Structure the response with holdings, sector allocations, and equity metrics
      const result: HoldingsResponseBody = {
        symbol: symbol,
        holdings: topHoldingsData.topHoldings?.holdings || [],
        sectorWeightings: topHoldingsData.topHoldings?.sectorWeightings || [],
        equityHoldings: topHoldingsData.topHoldings?.equityHoldings,
        cashPosition: topHoldingsData.topHoldings?.cashPosition,
        stockPosition: topHoldingsData.topHoldings?.stockPosition,
        bondPosition: topHoldingsData.topHoldings?.bondPosition,
        otherPosition: topHoldingsData.topHoldings?.otherPosition,
      };

      console.log(
        `Structured result for ${symbol}: ${result.holdings.length} holdings`
      );

      log(
        "debug",
        `ETF holdings retrieved for ${symbol} (${result.holdings.length} holdings)`
      );

      if (CACHE_ENABLED) {
        await cache.set<HoldingsResponse>(cacheKey, result);
        log("debug", `Cached holdings for ${symbol}`);
      }

      res.json(result);
    } catch (err) {
      console.log(
        `Error fetching holdings for ${symbol}:`,
        (err as Error).message
      );
      log(
        "error",
        `Holdings endpoint error for "${symbol}": ${(err as Error).message}`,
        err
      );

      // Fallback: Get basic quote data if holdings fail
      try {
        const quoteData = await yahooFinance.quote(symbol);

        const fallbackResult: HoldingsFallbackResponseBody = {
          fallback: true,
          symbol: quoteData.symbol,
          shortName: quoteData.shortName,
          longName: quoteData.longName,
          regularMarketPrice: quoteData.regularMarketPrice,
          marketCap: quoteData.marketCap,
          volume: quoteData.volume,
          averageVolume: quoteData.averageVolume,
          fiftyTwoWeekHigh: quoteData.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: quoteData.fiftyTwoWeekLow,
          message:
            "Detailed holdings data not available. Showing basic ETF information.",
        };

        if (CACHE_ENABLED) {
          await cache.set<HoldingsResponse>(cacheKey, fallbackResult);
        }

        res.json(fallbackResult);
      } catch (fallbackErr) {
        res.status(500).json({
          error: `Failed to get data for ${symbol}: ${
            (fallbackErr as Error).message
          }`,
        });
      }
    }
  }
);

// ============================================================================
// Mutual Fund Holdings Endpoint
// ============================================================================

/**
 * @swagger
 * /holdings/{symbol}/fund:
 *   get:
 *     summary: Get mutual fund holdings
 *     description: Retrieve mutual fund holdings and composition data
 *     tags: [Holdings]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         description: Mutual fund symbol
 *         schema:
 *           type: string
 *           example: "VFIAX"
 *     responses:
 *       200:
 *         description: Mutual fund holdings data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FundHoldings'
 *             example:
 *               fundHoldings: {"holdings": []}
 *               fundProfile: {"categoryName": "Large Blend"}
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:symbol/fund",
  async (
    req: Request<FundHoldingsRouteParams>,
    res: Response<FundHoldingsResponseBody | ErrorResponse>
  ) => {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = `fund_holdings:${symbol}`;

    log("info", `Mutual fund holdings request for ${symbol} from ${req.ip}`);

    if (CACHE_ENABLED) {
      const cached = await cache.get<FundHoldingsResponseBody>(cacheKey);
      if (cached) {
        log("debug", `Cache hit for fund holdings: ${symbol}`);
        return res.json(cached);
      }
      log("debug", `Cache miss for fund holdings: ${symbol}`);
    }

    try {
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: [
          "fundHoldings",
          "fundProfile",
        ] as unknown as QuoteSummaryOptions["modules"],
      });

      log("debug", `Mutual fund holdings retrieved for ${symbol}`);

      if (CACHE_ENABLED) {
        await cache.set<FundHoldingsResponseBody>(cacheKey, result);
        log("debug", `Cached fund holdings for ${symbol}`);
      }

      res.json(result);
    } catch (err) {
      log(
        "error",
        `Fund holdings endpoint error for "${symbol}": ${
          (err as Error).message
        }`,
        err
      );
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

export default router;
