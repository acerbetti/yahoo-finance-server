/**
 * Screener Routes module
 * Stock screener endpoints
 * @module routes/screener
 */

import { Router, Request, Response } from "express";
import yahooFinance from "../yahoo";
import { cache, CACHE_ENABLED } from "../config/cache";
import { log } from "../utils/logger";
import type { ScreenerOptions, ScreenerResult } from "../types";

const router = Router();

// ============================================================================
// Route Types
// ============================================================================

interface ScreenerRouteParams {
  type: string;
}

interface ScreenerQueryParams {
  count?: string;
}

type ScreenerResponseBody = ScreenerResult;

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
router.get("/:type", async (
  req: Request<ScreenerRouteParams, unknown, unknown, ScreenerQueryParams>,
  res: Response<ScreenerResponseBody>
) => {
  const type = req.params.type;
  const count = parseInt(req.query.count as string) || 25;
  const cacheKey = `screener:${type}:${count}`;

  log(
    "info",
    `Screener request for type: ${type}, count: ${count} from ${req.ip}`
  );

  if (CACHE_ENABLED) {
    const cached = await cache.get<ScreenerResponseBody>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for screener: ${type}`);
      return res.json(cached);
    }
    log("debug", `Cache miss for screener: ${type}`);
  }

  try {
    const result = await yahooFinance.screener({
      scrIds: [type],
      count,
    } as unknown as ScreenerOptions);
    log(
      "debug",
      `Screener results for ${type}: ${result.quotes?.length || 0} symbols`
    );

    if (CACHE_ENABLED) {
      await cache.set<ScreenerResponseBody>(cacheKey, result as unknown as ScreenerResponseBody);
      log("debug", `Cached screener results for ${type}`);
    }

    res.json(result as unknown as ScreenerResponseBody);
  } catch (err) {
    log(
      "error",
      `Screener endpoint error for "${type}": ${(err as Error).message}`,
      err
    );
    res.status(500).json({ error: (err as Error).message } as unknown as ScreenerResponseBody);
  }
});

export default router;
