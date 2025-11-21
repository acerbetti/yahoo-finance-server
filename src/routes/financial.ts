/**
 * Financial Routes module
 * Financial statements and data endpoints
 * @module routes/financial
 */

import { Router, Request, Response } from "express";
import yahooFinance from "../yahoo";
import { cache, CACHE_ENABLED } from "../config/cache";
import { log } from "../utils/logger";
import type { QuoteSummaryResult, QuoteSummaryOptions } from "../types";

const router = Router();

// ============================================================================
// Route Types
// ============================================================================

interface FinancialRouteParams {
  symbol: string;
  type: string;
}

interface FinancialQueryParams {
  period?: string;
}

interface FinancialResponseBody {
  symbol: string;
  type: string;
  period: string;
  data: QuoteSummaryResult;
}

interface FinancialRatiosRouteParams {
  symbol: string;
}

type FinancialRatiosResponseBody = QuoteSummaryResult;

// ============================================================================
// Financial Statements Endpoint
// ============================================================================

/**
 * @swagger
 * /financial/{symbol}/{type}:
 *   get:
 *     summary: Get financial statements by type
 *     description: Retrieve specific financial statement data for a symbol
 *     tags: [Financial]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         description: Stock symbol
 *         schema:
 *           type: string
 *           example: "AAPL"
 *       - in: path
 *         name: type
 *         required: true
 *         description: Type of financial statement
 *         schema:
 *           type: string
 *           enum: [income, balance, cashflow]
 *           example: "income"
 *       - in: query
 *         name: period
 *         description: Time period for financial data
 *         schema:
 *           type: string
 *           enum: [annual, quarterly]
 *           default: "annual"
 *         example: "annual"
 *     responses:
 *       200:
 *         description: Financial statement data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FinancialData'
 *             example:
 *               symbol: "AAPL"
 *               type: "income"
 *               period: "annual"
 *               data: {"incomeStatementHistory": []}
 *       400:
 *         description: Invalid statement type or period
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:symbol/:type", async (
  req: Request<FinancialRouteParams, unknown, unknown, FinancialQueryParams>,
  res: Response<FinancialResponseBody | { error: string }>
) => {
  const symbol = req.params.symbol.toUpperCase();
  const type = req.params.type.toLowerCase();
  const period = (req.query.period as string) || "annual";
  const cacheKey = `financial:${symbol}:${type}:${period}`;

  log(
    "info",
    `Financial request for ${symbol}, type: ${type}, period: ${period} from ${req.ip}`
  );

  // Validate statement type
  const validTypes = ["income", "balance", "cashflow"];
  if (!validTypes.includes(type)) {
    log("warn", `Invalid statement type: ${type}`);
    return res.status(400).json({
      error: `Invalid statement type: ${type}. Must be one of: ${validTypes.join(
        ", "
      )}`,
    });
  }

  // Validate period
  const validPeriods = ["annual", "quarterly"];
  if (!validPeriods.includes(period)) {
    log("warn", `Invalid period: ${period}`);
    return res.status(400).json({
      error: `Invalid period: ${period}. Must be one of: ${validPeriods.join(
        ", "
      )}`,
    });
  }

  if (CACHE_ENABLED) {
    const cached = await cache.get<FinancialResponseBody>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for financial: ${symbol}:${type}`);
      return res.json(cached);
    }
    log("debug", `Cache miss for financial: ${symbol}:${type}`);
  }

  try {
    let moduleName: string;
    switch (type) {
      case "income":
        moduleName = "incomeStatementHistory";
        break;
      case "balance":
        moduleName = "balanceSheetHistory";
        break;
      case "cashflow":
        moduleName = "cashflowStatementHistory";
        break;
      default:
        moduleName = "incomeStatementHistory";
    }

    const result = await yahooFinance.quoteSummary(symbol, {
      modules: [moduleName] as unknown as QuoteSummaryOptions['modules'],
    });

    const response: FinancialResponseBody = {
      symbol,
      type,
      period,
      data: result,
    };

    log("debug", `Financial data retrieved for ${symbol}: ${type} (${period})`);

    if (CACHE_ENABLED) {
      await cache.set<FinancialResponseBody>(cacheKey, response);
      log("debug", `Cached financial data for ${symbol}:${type}`);
    }

    res.json(response);
  } catch (err) {
    log(
      "error",
      `Financial endpoint error for "${symbol}": ${(err as Error).message}`,
      err
    );
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================================
// Financial Ratios Endpoint
// ============================================================================

/**
 * @swagger
 * /financial/{symbol}/ratios:
 *   get:
 *     summary: Get financial ratios
 *     description: Retrieve key financial ratios and metrics for a symbol
 *     tags: [Financial]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         description: Stock symbol
 *         schema:
 *           type: string
 *         example: "AAPL"
 *     responses:
 *       200:
 *         description: Financial ratios data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FinancialRatios'
 *             example:
 *               summaryDetail: {"trailingPE": 28.5, "forwardPE": 25.2}
 *               defaultKeyStatistics: {"enterpriseValue": 2500000000000}
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:symbol/ratios", async (
  req: Request<FinancialRatiosRouteParams>,
  res: Response<FinancialRatiosResponseBody | { error: string }>
) => {
  const symbol = req.params.symbol.toUpperCase();
  const cacheKey = `financial_ratios:${symbol}`;

  log("info", `Financial ratios request for ${symbol} from ${req.ip}`);

  if (CACHE_ENABLED) {
    const cached = await cache.get<FinancialRatiosResponseBody>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for financial ratios: ${symbol}`);
      return res.json(cached);
    }
    log("debug", `Cache miss for financial ratios: ${symbol}`);
  }

  try {
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: ["summaryDetail", "defaultKeyStatistics", "financialData"],
    });

    log("debug", `Financial ratios retrieved for ${symbol}`);

    if (CACHE_ENABLED) {
      await cache.set<FinancialRatiosResponseBody>(cacheKey, result);
      log("debug", `Cached financial ratios for ${symbol}`);
    }

    res.json(result);
  } catch (err) {
    log(
      "error",
      `Financial ratios endpoint error for "${symbol}": ${(err as Error).message
      }`,
      err
    );
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
