/**
 * News Reader Routes module
 * Handles article scraping from Yahoo Finance
 * @module routes/newsReader
 */

import { Router } from "express";
import axios from "axios";
import { load as cheerioLoad } from "cheerio";
import https from "https";
import { get } from "https";
import { cache, CACHE_ENABLED } from "../config/cache.js";
import { log } from "../utils/logger.js";

const router = Router();

// ============================================================================
// News Reader Endpoint
// ============================================================================

/**
 * @swagger
 * /news_reader/{url}:
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
router.get("/news_reader/*", async (req, res) => {
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
    const cached = cache.get(cacheKey);
    if (cached) {
      log("debug", `Cache hit for news reader: ${url}`);
      return res.json(cached);
    }
    log("debug", `Cache miss for news reader: ${url}`);
  }

  try {
    log("debug", `Fetching article content from ${url}`);

    // Fetch the HTML content using native https module
    const response = await new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        timeout: 10000,
        maxHeaderSize: 131072, // 128KB header limit
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ data, status: res.statusCode });
        });
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.end();
    });

    if (response.status !== 200) {
      if (response.status === 404) {
        return res.status(404).json({
          error: "Article not found. The requested URL does not exist.",
        });
      } else {
        throw new Error(`Request failed with status code ${response.status}`);
      }
    }

    const $ = cheerioLoad(response.data);

    // Debug: log the title tag and some content
    log("debug", `HTML title tag: ${$("title").text()}`);
    log("debug", `H1 tags found: ${$("h1").length}`);
    log("debug", `H1.caas-title found: ${$("h1.caas-title").length}`);

    // Extract title - try JSON data first (for /m/ URLs), then HTML selectors
    let title = "";

    // First, try to extract title from JSON data in script tags (for /m/ URLs)
    const scriptTags = $('script[type="application/json"]');
    log("debug", `Found ${scriptTags.length} JSON script tags`);

    for (let i = 0; i < scriptTags.length; i++) {
      try {
        const scriptContent = $(scriptTags[i]).html();
        if (scriptContent && scriptContent.includes("storyAtoms")) {
          const jsonData = JSON.parse(scriptContent);
          // Try to extract title from JSON data
          if (jsonData.headline || jsonData.title) {
            title = jsonData.headline || jsonData.title;
            log("debug", `Title extracted from JSON: "${title}"`);
            break;
          }
        }
      } catch (e) {
        log("debug", `Failed to parse JSON script tag ${i}: ${e.message}`);
      }
    }

    // Fallback: try HTML selectors if title not found in JSON
    if (!title) {
      title = $("h1").first().text().trim();
      if (!title) {
        title = $("h1.caas-title").text().trim();
      }
      if (!title) {
        title = $("title").text().trim();
      }
    }

    log("debug", `Final extracted title: "${title}"`);

    // Extract main content - try multiple selectors and JSON data
    let content = "";

    // First, try to extract from JSON data in script tags (for /m/ URLs)
    for (let i = 0; i < scriptTags.length; i++) {
      try {
        const scriptContent = $(scriptTags[i]).html();
        if (scriptContent && scriptContent.includes("storyAtoms")) {
          const jsonData = JSON.parse(scriptContent);
          if (
            jsonData.body &&
            jsonData.body.items &&
            jsonData.body.items[0] &&
            jsonData.body.items[0].data &&
            jsonData.body.items[0].data.storyAtoms
          ) {
            const storyAtoms = jsonData.body.items[0].data.storyAtoms;
            const textAtoms = storyAtoms.filter((atom) => atom.type === "text");
            content = textAtoms.map((atom) => atom.content).join("\n\n");
            log(
              "debug",
              `Content extracted from JSON: ${content.substring(0, 100)}...`
            );
            if (content) break;
          }
        }
      } catch (e) {
        log("debug", `Failed to parse JSON script tag ${i}: ${e.message}`);
      }
    }

    // Fallback: try the main article body selectors (for /news/ URLs)
    if (!content) {
      const bodySelectors = [
        "div.caas-body",
        'div[data-testid="article-body"]',
        "div.article-body",
        "div.content",
        "article",
      ];

      for (const selector of bodySelectors) {
        const element = $(selector);
        log(
          "debug",
          `Trying selector "${selector}": found ${element.length} elements`
        );
        if (element.length > 0) {
          // Get all paragraphs within the body
          const paragraphs = element
            .find("p")
            .map((i, el) => $(el).text().trim())
            .get();
          content = paragraphs.join("\n\n");
          log(
            "debug",
            `Content from selector "${selector}": ${content.substring(
              0,
              100
            )}...`
          );
          if (content) break;
        }
      }
    }

    // Fallback: get all paragraphs if no specific body found
    if (!content) {
      const allParagraphs = $("p")
        .map((i, el) => $(el).text().trim())
        .get();
      content = allParagraphs.slice(0, 20).join("\n\n"); // Limit to first 20 paragraphs
    }

    if (!title || !content) {
      log("warn", `Unable to extract content from ${url}`);
      return res.status(404).json({
        error:
          "Unable to extract article content. The article may not exist or the page structure has changed.",
      });
    }

    const result = {
      title,
      content,
      url,
    };

    if (CACHE_ENABLED) {
      cache.set(cacheKey, result);
      log("debug", `Cached article content for ${url}`);
    }

    res.json(result);
  } catch (err) {
    log("error", `News reader error for "${url}": ${err.message}`, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
