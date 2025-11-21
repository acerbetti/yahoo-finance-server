/**
 * Recommendations Routes module
 * Stock recommendations endpoints
 * @module routes/recommendations
 */

import { Router, Request, Response } from "express";
import yahooFinance from "../yahoo";
import { cache, CACHE_ENABLED } from "../config/cache";
import { log } from "../utils/logger";
import type { RecommendationsResult, ErrorResponse } from "../types";

const router = Router();

// ============================================================================
// Route Types
// ============================================================================

interface RecommendationsRouteParams {
  symbol: string;
}

type RecommendationsResponseBody = RecommendationsResult;

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
router.get(
  "/:symbol",
  async (
    req: Request<RecommendationsRouteParams>,
    res: Response<RecommendationsResponseBody | ErrorResponse>
  ) => {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = `recommendations:${symbol}`;

    log("info", `Recommendations request for symbol: ${symbol} from ${req.ip}`);

    if (CACHE_ENABLED) {
      const cached = await cache.get<RecommendationsResponseBody>(cacheKey);
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
        await cache.set<RecommendationsResponseBody>(cacheKey, result);
        log("debug", `Cached recommendations for ${symbol}`);
      }

      res.json(result);
    } catch (err) {
      log(
        "error",
        `Recommendations endpoint error for "${symbol}": ${
          (err as Error).message
        }`,
        err
      );
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

export default router;
