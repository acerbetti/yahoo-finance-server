/**
 * Quotes Routes module
 * Quote endpoints for stock data
 * @module routes/quotes
 */

import { Router, Request, Response } from "express";
import yahooFinance from "../yahoo";
import { cache, CACHE_ENABLED } from "../config/cache";
import { log } from "../utils/logger";
import type { QuoteSummaryResult } from "../types";

const router = Router();

// ============================================================================
// Route Types
// ============================================================================

interface QuoteRouteParams {
  symbols: string;
}

type QuoteResponseBody = Record<string, QuoteSummaryResult | { error: string }>;

// ============================================================================
// Quote Endpoint
// ============================================================================

/**
 * @swagger
 * /quote/{symbols}:
 *   get:
 *     summary: Get current stock quotes
 *     description: Retrieve current stock price and quote data for one or more symbols
 *     tags: [Quotes]
 *     parameters:
 *       - in: path
 *         name: symbols
 *         required: true
 *         description: Comma-separated list of stock symbols (e.g., AAPL,GOOGL,MSFT)
 *         schema:
 *           type: string
 *         example: "AAPL,GOOGL"
 *     responses:
 *       200:
 *         description: Stock quote data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 $ref: '#/components/schemas/QuoteData'
 *             example:
 *               AAPL: {"price": {"regularMarketPrice": 150.25}}
 *               GOOGL: {"price": {"regularMarketPrice": 2800.50}}
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:symbols", async (
  req: Request<QuoteRouteParams>,
  res: Response<QuoteResponseBody>
) => {
  const symbols = req.params.symbols;
  const cacheKey = `quote:${symbols}`;
  const symbolList = symbols.split(",").map((s) => s.trim());

  log(
    "info",
    `Quote request for symbols: ${symbolList.join(", ")} from ${req.ip}`
  );

  if (CACHE_ENABLED) {
    const cached = await cache.get<QuoteResponseBody>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for quote: ${symbols}`);
      return res.json(cached);
    }
    log("debug", `Cache miss for quote: ${symbols}`);
  }

  try {
    log("debug", `Fetching quote data for ${symbolList.length} symbols`);
    const promises = symbolList.map((symbol) =>
      yahooFinance.quoteSummary(symbol.trim())
    );
    const results = await Promise.allSettled(promises);

    const data: QuoteResponseBody = {};
    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      const symbol = symbolList[index];
      if (result.status === "fulfilled") {
        data[symbol] = result.value;
        successCount++;
        log("debug", `Successfully fetched quote for ${symbol}`);
      } else {
        data[symbol] = { error: result.reason.message };
        errorCount++;
        log(
          "warn",
          `Failed to fetch quote for ${symbol}: ${result.reason.message}`
        );
      }
    });

    log(
      "info",
      `Quote request completed: ${successCount} successful, ${errorCount} failed`
    );

    if (CACHE_ENABLED) {
      await cache.set<QuoteResponseBody>(cacheKey, data);
      log("debug", `Cached quote data for ${symbols}`);
    }

    res.json(data);
  } catch (err) {
    log("error", `Quote endpoint error: ${(err as Error).message}`, err);
    res.status(500).json({ error: { error: (err as Error).message } } as unknown as QuoteResponseBody);
  }
});

export default router;
