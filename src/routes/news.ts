/**
 * News Routes module
 * News and press release endpoints
 * @module routes/news
 */

import { Router, Request, Response } from "express";

import { cache, CACHE_ENABLED } from "../config/cache";
import type { ErrorResponse } from "../types";
import { log } from "../utils/logger";
import yahooFinance from "../yahoo";

const router = Router();

// ============================================================================
// Route Types
// ============================================================================

interface NewsQueryParams {
  count?: string;
}

interface NewsArticle {
  title: string;
  publisher: string;
  link: string;
  publishedAt?: Date | number;
  type?: string;
  thumbnail?: {
    resolutions: Array<{
      url: string;
      width: number;
      height: number;
      tag: string;
    }>;
  };
  relatedTickers?: string[];
}

interface NewsResponseBody {
  count: number;
  news: NewsArticle[];
  message: string;
  dataAvailable: {
    hasNews: boolean;
  };
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
    res: Response<NewsResponseBody | ErrorResponse>
  ) => {
    const count = parseInt(req.query.count as string) || 10;
    const cacheKey = `news_general:${count}`;

    log("info", `General news request, count: ${count} from ${req.ip}`);

    if (CACHE_ENABLED) {
      const cached = await cache.get<NewsResponseBody>(cacheKey);
      if (cached) {
        log("debug", `Cache hit for general news`);
        return res.json(cached);
      }
      log("debug", `Cache miss for general news`);
    }

    try {
      // Use a broad search to get general market news
      const result = await yahooFinance.search("", { newsCount: count });

      // Format news articles
      const newsArticles: NewsArticle[] = (result.news || []).map(
        (article) => ({
          title: article.title,
          publisher: article.publisher,
          link: article.link,
          publishedAt: article.providerPublishTime as Date | number,
          type: article.type,
          thumbnail: article.thumbnail,
          relatedTickers: article.relatedTickers,
        })
      );

      const response: NewsResponseBody = {
        count: newsArticles.length,
        news: newsArticles,
        message:
          newsArticles.length > 0
            ? `Found ${newsArticles.length} general market news articles`
            : `No recent general market news found.`,
        dataAvailable: {
          hasNews: newsArticles.length > 0,
        },
      };

      if (CACHE_ENABLED) {
        await cache.set<NewsResponseBody>(cacheKey, response);
        log("debug", `Cached general news`);
      }

      res.json(response);
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
