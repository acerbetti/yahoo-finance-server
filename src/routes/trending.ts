/**
 * Trending Routes module
 * Trending symbols endpoints
 * @module routes/trending
 */

import { Router, Request, Response } from "express";

import { cache, CACHE_ENABLED } from "../config/cache";
import type { TrendingSymbolsResult, ErrorResponse } from "../types";
import { log } from "../utils/logger";
import yahooFinance from "../yahoo";

const router = Router();

// ============================================================================
// Route Types
// ============================================================================

interface TrendingRouteParams {
  region: string;
}

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
 *               $ref: '#/components/schemas/TrendingSymbolsResult'
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
router.get(
  "/:region",
  async (
    req: Request<TrendingRouteParams>,
    res: Response<TrendingSymbolsResult | ErrorResponse>
  ) => {
    const region = req.params.region || "US";
    const cacheKey = `trending:${region}`;

    log(
      "info",
      `Trending symbols request for region: ${region} from ${req.ip}`
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
      log(
        "error",
        `Trending symbols endpoint error for "${region}": ${
          (err as Error).message
        }`,
        err
      );
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

export default router;
