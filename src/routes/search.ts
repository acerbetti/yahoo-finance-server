/**
 * Search Routes module
 * Search functionality endpoints
 * @module routes/search
 */

import { Router, Request, Response } from "express";
import yahooFinance from "../yahoo";
import { cache, CACHE_ENABLED } from "../config/cache";
import { log } from "../utils/logger";
import type { SearchResult } from "../types";

const router = Router();

// ============================================================================
// Route Types
// ============================================================================

interface SearchRouteParams {
  query: string;
}

type SearchResponseBody = SearchResult;

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
router.get("/:query", async (
  req: Request<SearchRouteParams>,
  res: Response<SearchResponseBody>
) => {
  const query = req.params.query;
  const cacheKey = `search:${query}`;

  log("info", `Search request for "${query}" from ${req.ip}`);

  if (CACHE_ENABLED) {
    const cached = await cache.get<SearchResponseBody>(cacheKey);
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
      `Search completed for "${query}": ${result.quotes?.length || 0} quotes, ${result.news?.length || 0
      } news`
    );

    if (CACHE_ENABLED) {
      await cache.set<SearchResponseBody>(cacheKey, result);
      log("debug", `Cached search results for ${query}`);
    }

    res.json(result);
  } catch (err) {
    log("error", `Search endpoint error for "${query}": ${(err as Error).message}`, err);
    res.status(500).json({ error: (err as Error).message } as unknown as SearchResponseBody);
  }
});

export default router;
