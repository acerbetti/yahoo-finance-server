/**
 * History Routes module
 * Historical stock data endpoints
 * @module routes/history
 */

import { Router, Request, Response } from "express";
import yahooFinance from "../yahoo";
import { cache, CACHE_ENABLED } from "../config/cache";
import { log } from "../utils/logger";
import type { ChartOptions, ChartResult } from "../types";

const router = Router();

// ============================================================================
// Route Types
// ============================================================================

interface HistoryRouteParams {
  symbols: string;
}

interface HistoryQueryParams {
  period?: string;
  interval?: string;
}

type HistoryResponseBody = Record<string, ChartResult['quotes'] | { error: string }>;

// ============================================================================
// History Endpoint
// ============================================================================

/**
 * @swagger
 * /history/{symbols}:
 *   get:
 *     summary: Get historical stock data
 *     description: Retrieve historical price data for one or more symbols with configurable period and interval
 *     tags: [Historical Data]
 *     parameters:
 *       - in: path
 *         name: symbols
 *         required: true
 *         description: Comma-separated list of stock symbols
 *         schema:
 *           type: string
 *         example: "AAPL,GOOGL"
 *       - in: query
 *         name: period
 *         description: Time period for historical data
 *         schema:
 *           type: string
 *           enum: [1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max]
 *           default: "1y"
 *         example: "1y"
 *       - in: query
 *         name: interval
 *         description: Data interval
 *         schema:
 *           type: string
 *           enum: [1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo]
 *           default: "1d"
 *         example: "1d"
 *     responses:
 *       200:
 *         description: Historical price data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 $ref: '#/components/schemas/HistoricalData'
 *             example:
 *               AAPL: {"chart":{"result":[{"meta":{"symbol":"AAPL"}}]}}
 *               GOOGL: {"chart":{"result":[{"meta":{"symbol":"GOOGL"}}]}}
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:symbols", async (
  req: Request<HistoryRouteParams, unknown, unknown, HistoryQueryParams>,
  res: Response<HistoryResponseBody>
) => {
  const symbols = req.params.symbols;
  const { period = "1y", interval = "1d" } = req.query;
  const cacheKey = `history:${symbols}:${period}:${interval}`;
  const symbolList = symbols.split(",").map((s) => s.trim());

  log(
    "info",
    `History request for symbols: ${symbolList.join(
      ", "
    )}, period: ${period}, interval: ${interval} from ${req.ip}`
  );

  if (CACHE_ENABLED) {
    const cached = await cache.get<HistoryResponseBody>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for history: ${symbols} (${period}/${interval})`);
      return res.json(cached);
    }
    log("debug", `Cache miss for history: ${symbols} (${period}/${interval})`);
  }

  try {
    // Convert period to period1/period2 for chart API
    const now = new Date();
    let period1;
    switch (period) {
      case "1d":
        period1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "5d":
        period1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        break;
      case "1mo":
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3mo":
        period1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6mo":
        period1 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "2y":
        period1 = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
        break;
      case "5y":
        period1 = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        break;
      case "10y":
        period1 = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000);
        break;
      case "ytd":
        period1 = new Date(now.getFullYear(), 0, 1);
        break;
      case "max":
        period1 = new Date(1970, 0, 1);
        break;
      default:
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // default to 1y
    }

    log(
      "debug",
      `Fetching historical data for ${symbolList.length} symbols from ${period1.toISOString().split("T")[0]
      } to ${now.toISOString().split("T")[0]}`
    );


    const promises = symbolList.map((symbol) =>
      yahooFinance.chart(symbol, {
        period1: Math.floor(period1.getTime() / 1000),
        period2: Math.floor(now.getTime() / 1000),
        interval: interval as ChartOptions['interval'],
      })
    );
    const results = await Promise.allSettled(promises);

    const data: HistoryResponseBody = {};
    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      const symbol = symbolList[index];
      if (result.status === "fulfilled") {
        const value = result.value as unknown as ChartResult;
        data[symbol] = value.quotes;
        successCount++;
        log(
          "debug",
          `Successfully fetched history for ${symbol} (${value.quotes?.length || 0
          } data points)`
        );
      } else {
        data[symbol] = { error: result.reason.message };
        errorCount++;
        log(
          "warn",
          `Failed to fetch history for ${symbol}: ${result.reason.message}`
        );
      }
    });

    log(
      "info",
      `History request completed: ${successCount} successful, ${errorCount} failed`
    );

    if (CACHE_ENABLED) {
      await cache.set<HistoryResponseBody>(cacheKey, data);
      log(
        "debug",
        `Cached history data for ${symbols} (${period}/${interval})`
      );
    }

    res.json(data);
  } catch (err) {
    log("error", `History endpoint error: ${(err as Error).message}`, err);
    res.status(500).json({ error: { error: (err as Error).message } } as unknown as HistoryResponseBody);
  }
});

export default router;
