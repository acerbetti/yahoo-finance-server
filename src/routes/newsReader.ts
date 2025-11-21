/**
 * News Reader Routes module
 * Handles article scraping from Yahoo Finance
 * @module routes/newsReader
 */

import { Router, Request, Response } from "express";
import { cache, CACHE_ENABLED } from "../config/cache";
import { log } from "../utils/logger";

const router = Router();

// ============================================================================
// Route Types
// ============================================================================

interface NewsReaderRouteParams {
  0: string; // Wildcard parameter
}

interface NewsReaderResponseBody {
  title: string;
  content: string;
  url: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

import {
  fetchArticleContent,
  extractArticleContent,
} from "../utils/newsScraper";

// ============================================================================
// News Reader Endpoint
// ============================================================================

/**
 * @swagger
 * /news-reader/{url}:
 *   get:
 *     summary: Extract article content from Yahoo Finance news
 *     description: Scrape and extract the main title and text content from a Yahoo Finance news article
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: url
 *         required: true
 *         description: The full Yahoo Finance article URL (e.g., https://finance.yahoo.com/news/bitcoin-price-under-pressure-slips-below-92000-as-self-fulfilling-prophecy-puts-4-year-cycle-in-focus-203113535.html or https://finance.yahoo.com/m/f2290ae0-0782-32e2-94c1-0614377f3478/amazon-ford-partner-on-used.html)
 *         schema:
 *           type: string
 *         example: "https://finance.yahoo.com/news/bitcoin-price-under-pressure-slips-below-92000-as-self-fulfilling-prophecy-puts-4-year-cycle-in-focus-203113535.html"
 *     responses:
 *       200:
 *         description: Article content extracted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                   description: The article title
 *                 content:
 *                   type: string
 *                   description: The main article text content
 *                 url:
 *                   type: string
 *                   description: The full article URL
 *             example:
 *               title: "Bitcoin Price Under Pressure, Slips Below $92,000 as Self-Fulfilling Prophecy Puts 4-Year Cycle in Focus"
 *               content: "Bitcoin (BTC) fell below $92,000 on Tuesday, extending its decline from the all-time high of $100,000 reached earlier this month..."
 *               url: "https://finance.yahoo.com/news/bitcoin-price-under-pressure-slips-below-92000-as-self-fulfilling-prophecy-puts-4-year-cycle-in-focus-203113535.html"
 *       400:
 *         description: Invalid URL format - must be a full Yahoo Finance URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Article not found or unable to extract content
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error or HTTP error from Yahoo Finance
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/*", async (
  req: Request<NewsReaderRouteParams>,
  res: Response<NewsReaderResponseBody | { error: string }>
) => {
  const url = req.params[0];

  // Validate that it's a Yahoo Finance URL
  if (!url.startsWith("https://finance.yahoo.com/")) {
    return res.status(400).json({
      error:
        "Invalid URL. Must be a full Yahoo Finance URL starting with https://finance.yahoo.com/",
    });
  }

  const cacheKey = `news_reader:${url}`;

  log("info", `News reader request for ${url} from ${req.ip}`);

  if (CACHE_ENABLED) {
    const cached = await cache.get<NewsReaderResponseBody>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for news reader: ${url}`);
      return res.json(cached);
    }
    log("debug", `Cache miss for news reader: ${url}`);
  }

  try {
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
        return res.status(404).json({
          error: "Article not found. The requested URL does not exist.",
        });
      } else {
        throw new Error(`Request failed with status code ${response.status}`);
      }
    }

    // Extract article content
    const { title, content } = extractArticleContent(response.data);

    if (!title || !content) {
      log("warn", `Unable to extract content from ${finalUrl}`);
      return res.status(404).json({
        error:
          "Unable to extract article content. The article may not exist or the page structure has changed.",
      });
    }

    const result: NewsReaderResponseBody = {
      title,
      content,
      url: finalUrl,
    };

    if (CACHE_ENABLED) {
      await cache.set<NewsReaderResponseBody>(cacheKey, result);
      log("debug", `Cached article content for ${finalUrl}`);
      // Also cache under final URL if it was redirected
      if (finalUrl !== url) {
        const finalCacheKey = `news_reader:${finalUrl}`;
        await cache.set<NewsReaderResponseBody>(finalCacheKey, result);
        log("debug", `Also cached under final URL: ${finalUrl}`);
      }
    }

    res.json(result);
  } catch (err) {
    log(
      "error",
      `News reader error for "${url}": ${(err as Error).message}`,
      err
    );
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
