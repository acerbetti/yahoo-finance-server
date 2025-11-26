/**
 * News Routes module
 * News and press release endpoints
 * @module routes/news
 */

import { Router, Request, Response } from "express";

import { cache, CACHE_ENABLED } from "../config/cache";
import type { ErrorResponse, SearchNews } from "../types";
import { log } from "../utils/logger";
import yahooFinance from "../yahoo";

const router = Router();

// ============================================================================
// Route Types
// ============================================================================

interface NewsQueryParams {
  count?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

// ============================================================================
// General News Endpoint
// ============================================================================

/**
 * @swagger
 * /news:
 *   get:
 *     summary: Get general market news
 *     description: Retrieve latest general market news articles
 *     tags: [News]
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
 *             example:
 *               data: [{"title": "Market update", "link": "https://..."}]
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/",
  async (
    req: Request<unknown, unknown, unknown, NewsQueryParams>,
    res: Response<SearchNews[] | ErrorResponse>
  ) => {
    const count = parseInt(req.query.count as string) || 10;
    const cacheKey = `news_general:${count}`;

    log("info", `General news request, count: ${count} from ${req.ip}`);

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
      log(
        "error",
        `General news endpoint error: ${(err as Error).message}`,
        err
      );
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

export default router;
