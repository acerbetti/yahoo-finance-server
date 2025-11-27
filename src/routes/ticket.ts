/**
 * Ticket Routes module
 * Consolidated ticker-specific endpoints
 * @module routes/ticket
 */

import { Router, Request, Response } from "express";

import { cache, CACHE_ENABLED } from "../config/cache";
import type { QuoteSummaryResult, ErrorResponse, SearchNews } from "../types";
import { log } from "../utils/logger";
import yahooFinance from "../yahoo";

const router = Router();

// ============================================================================
// Route Types
// ============================================================================

interface TicketRouteParams {
  ticket: string;
}

interface FinancialQueryParams {
  period?: "annual" | "quarterly";
}

interface NewsQueryParams {
  count?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate if a ticker symbol appears to be valid
 */
function isValidSymbol(symbol: string): boolean {
  // Basic validation: 1-10 characters, letters/numbers/dots only, no underscores
  return /^[A-Z0-9.]{1,10}$/.test(symbol) && !symbol.includes("_");
}

/**
 * Handle standardized error responses for ticket endpoints
 */
function handleTicketError(
  res: Response<ErrorResponse>,
  ticket: string,
  endpointName: string,
  err: unknown,
  additionalErrorChecks: string[] = []
): void {
  const errorMessage = err instanceof Error ? err.message : String(err);
  log(
    "error",
    `Ticket ${endpointName} endpoint error for ${ticket}: ${errorMessage}`,
    err
  );

  // Check for invalid symbol errors (404) or other errors (500)
  const invalidSymbolPatterns = [
    "No fundamentals data found for symbol",
    "Quote not found for symbol",
    ...additionalErrorChecks,
  ];

  const isInvalidSymbol = invalidSymbolPatterns.some((pattern) =>
    errorMessage.includes(pattern)
  );

  if (isInvalidSymbol) {
    res.status(404).json({ error: `Symbol '${ticket}' not found or invalid` });
  } else {
    res.status(500).json({ error: errorMessage });
  }
}

/**
 * Get company info for a single ticket
 */
async function getTicketInfo(ticket: string): Promise<QuoteSummaryResult> {
  const cacheKey = `ticket:info:${ticket}`;

  if (CACHE_ENABLED) {
    const cached = await cache.get<QuoteSummaryResult>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for ticket info: ${ticket}`);
      return cached;
    }
  }

  log("debug", `Fetching company info for ${ticket}`);
  const result = await yahooFinance.quoteSummary(ticket, {
    modules: ["assetProfile"],
  });

  if (CACHE_ENABLED) {
    await cache.set<QuoteSummaryResult>(cacheKey, result);
  }

  return result;
}

/**
 * Get financial statements for a ticket
 */
async function getTicketFinancials(
  ticket: string,
  type: "income" | "balance" | "cashflow",
  period: "annual" | "quarterly" = "annual"
): Promise<QuoteSummaryResult> {
  const moduleMap: Record<string, string> = {
    income: "incomeStatementHistory",
    balance: "balanceSheetHistory",
    cashflow: "cashflowStatementHistory",
  };

  if (!moduleMap[type]) {
    throw new Error(
      `Invalid financial type: ${type}. Must be 'income', 'balance', or 'cashflow'`
    );
  }

  const cacheKey = `ticket:financial:${ticket}:${type}:${period}`;

  if (CACHE_ENABLED) {
    const cached = await cache.get<QuoteSummaryResult>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for ticket financial: ${ticket}:${type}`);
      return cached;
    }
  }

  log("debug", `Fetching ${period} ${type} for ${ticket}`);

  const moduleName = moduleMap[type];
  const options: Record<string, string[]> = {
    modules: [moduleName],
  };

  const result = await yahooFinance.quoteSummary(ticket, options);

  if (CACHE_ENABLED) {
    await cache.set<QuoteSummaryResult>(cacheKey, result);
  }

  return result;
}

/**
 * Get holdings for a ticket
 */
async function getTicketHoldings(ticket: string): Promise<QuoteSummaryResult> {
  const cacheKey = `ticket:holdings:${ticket}`;

  if (CACHE_ENABLED) {
    const cached = await cache.get<QuoteSummaryResult>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for ticket holdings: ${ticket}`);
      return cached;
    }
  }

  log("debug", `Fetching holdings for ${ticket}`);

  try {
    const result = await yahooFinance.quoteSummary(ticket, {
      modules: ["topHoldings", "fundProfile"],
    });

    if (CACHE_ENABLED) {
      await cache.set<QuoteSummaryResult>(cacheKey, result);
    }

    return result;
  } catch (error) {
    log(
      "warn",
      `Holdings fetch failed for ${ticket}, trying fallback: ${
        (error as Error).message
      }`
    );
    // Fallback to basic quote data
    const fallback = await yahooFinance.quote(ticket);
    return fallback as unknown as QuoteSummaryResult;
  }
}

/**
 * Get insights for a ticket
 */
async function getTicketInsights(ticket: string): Promise<QuoteSummaryResult> {
  const cacheKey = `ticket:insights:${ticket}`;

  if (CACHE_ENABLED) {
    const cached = await cache.get<QuoteSummaryResult>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for ticket insights: ${ticket}`);
      return cached;
    }
  }

  log("debug", `Fetching insights for ${ticket}`);

  const result = await yahooFinance.quoteSummary(ticket, {
    modules: [
      "recommendationTrend",
      "upgradeDowngradeHistory",
      "insiderTransactions",
      "insiderHolders",
    ],
  });

  if (CACHE_ENABLED) {
    await cache.set<QuoteSummaryResult>(cacheKey, result);
  }

  return result;
}

/**
 * Get news for a ticket
 */
async function getTicketNews(
  ticket: string,
  count: number = 10
): Promise<SearchNews[]> {
  const limitedCount = Math.min(count || 10, 50);
  const cacheKey = `ticket:news:${ticket}:${limitedCount}`;

  if (CACHE_ENABLED) {
    const cached = await cache.get<SearchNews[]>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for ticket news: ${ticket}`);
      return cached;
    }
  }

  log("debug", `Fetching news for ${ticket}`);

  const searchResult = await yahooFinance.search(ticket, {
    newsCount: limitedCount,
  });

  const result = searchResult.news || [];

  if (CACHE_ENABLED) {
    await cache.set<SearchNews[]>(cacheKey, result);
  }

  return result;
}

/**
 * Get calendar events for a ticket
 */
async function getTicketEvents(ticket: string): Promise<QuoteSummaryResult> {
  const cacheKey = `ticket:events:${ticket}`;

  if (CACHE_ENABLED) {
    const cached = await cache.get<QuoteSummaryResult>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for ticket events: ${ticket}`);
      return cached;
    }
  }

  log("debug", `Fetching calendar events for ${ticket}`);

  const result = await yahooFinance.quoteSummary(ticket, {
    modules: ["calendarEvents", "earnings", "earningsHistory"],
  });

  if (CACHE_ENABLED) {
    await cache.set<QuoteSummaryResult>(cacheKey, result);
  }

  return result;
}

/**
 * Get key statistics for a ticket
 */
async function getTicketStatistics(
  ticket: string
): Promise<QuoteSummaryResult> {
  const cacheKey = `ticket:statistics:${ticket}`;

  if (CACHE_ENABLED) {
    const cached = await cache.get<QuoteSummaryResult>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for ticket statistics: ${ticket}`);
      return cached;
    }
  }

  log("debug", `Fetching key statistics for ${ticket}`);

  const result = await yahooFinance.quoteSummary(ticket, {
    modules: ["defaultKeyStatistics", "financialData"],
  });

  if (CACHE_ENABLED) {
    await cache.set<QuoteSummaryResult>(cacheKey, result);
  }

  return result;
}

// ============================================================================
// Endpoints
// ============================================================================

/**
 * @swagger
 * /ticket/{ticket}/holdings:
 *   get:
 *     summary: Get holdings data
 *     description: Retrieve holdings and composition data for a ticket
 *     tags: [Ticket]
 *     parameters:
 *       - in: path
 *         name: ticket
 *         required: true
 *         description: Stock ticker symbol (ETF or mutual fund)
 *         schema:
 *           type: string
 *         example: "SPY"
 *     responses:
 *       200:
 *         description: Holdings data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HoldingsData'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:ticket/holdings",
  async (
    req: Request<TicketRouteParams>,
    res: Response<QuoteSummaryResult | ErrorResponse>
  ) => {
    const ticket = req.params.ticket.toUpperCase();

    // Validate symbol format
    if (!isValidSymbol(ticket)) {
      return res
        .status(404)
        .json({ error: `Symbol '${ticket}' not found or invalid` });
    }

    log("info", `Ticket holdings request for: ${ticket} from ${req.ip}`);

    try {
      const result = await getTicketHoldings(ticket);
      res.json(result);
    } catch (err) {
      handleTicketError(res, ticket, "holdings", err);
    }
  }
);

/**
 * @swagger
 * /ticket/{ticket}/insights:
 *   get:
 *     summary: Get stock insights
 *     description: Retrieve comprehensive insights and analysis for a ticket
 *     tags: [Ticket]
 *     parameters:
 *       - in: path
 *         name: ticket
 *         required: true
 *         description: Stock ticker symbol
 *         schema:
 *           type: string
 *         example: "AAPL"
 *     responses:
 *       200:
 *         description: Stock insights
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InsightsData'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:ticket/insights",
  async (
    req: Request<TicketRouteParams>,
    res: Response<QuoteSummaryResult | ErrorResponse>
  ) => {
    const ticket = req.params.ticket.toUpperCase();

    // Validate symbol format
    if (!isValidSymbol(ticket)) {
      return res
        .status(404)
        .json({ error: `Symbol '${ticket}' not found or invalid` });
    }

    log("info", `Ticket insights request for: ${ticket} from ${req.ip}`);

    try {
      const result = await getTicketInsights(ticket);
      res.json(result);
    } catch (err) {
      handleTicketError(res, ticket, "insights", err);
    }
  }
);

/**
 * @swagger
 * /ticket/{ticket}/news:
 *   get:
 *     summary: Get news for a ticket
 *     description: Retrieve latest news articles for a ticket
 *     tags: [Ticket]
 *     parameters:
 *       - in: path
 *         name: ticket
 *         required: true
 *         description: Stock ticker symbol
 *         schema:
 *           type: string
 *         example: "AAPL"
 *       - in: query
 *         name: count
 *         description: Number of news articles to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: News articles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SearchNews'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:ticket/news",
  async (
    req: Request<TicketRouteParams, SearchNews[], unknown, NewsQueryParams>,
    res: Response<SearchNews[] | ErrorResponse>
  ) => {
    const ticket = req.params.ticket.toUpperCase();
    const count = parseInt(req.query.count || "10", 10);

    // Validate symbol format
    if (!isValidSymbol(ticket)) {
      return res
        .status(404)
        .json({ error: `Symbol '${ticket}' not found or invalid` });
    }

    log("info", `Ticket news request for: ${ticket} from ${req.ip}`);

    try {
      const result = await getTicketNews(ticket, count);
      res.json(result);
    } catch (err) {
      handleTicketError(res, ticket, "news", err, [
        "Missing required query parameter",
      ]);
    }
  }
);

/**
 * @swagger
 * /ticket/{ticket}/events:
 *   get:
 *     summary: Get calendar events for a ticket
 *     description: Retrieve important dates and events for a ticket including earnings dates, dividend dates, and earnings estimates
 *     tags: [Ticket]
 *     parameters:
 *       - in: path
 *         name: ticket
 *         required: true
 *         description: Stock ticker symbol
 *         schema:
 *           type: string
 *         example: "AAPL"
 *     responses:
 *       200:
 *         description: Calendar events and important dates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalendarEvents'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:ticket/events",
  async (
    req: Request<TicketRouteParams>,
    res: Response<QuoteSummaryResult | ErrorResponse>
  ) => {
    const ticket = req.params.ticket.toUpperCase();

    // Validate symbol format
    if (!isValidSymbol(ticket)) {
      return res
        .status(404)
        .json({ error: `Symbol '${ticket}' not found or invalid` });
    }

    log("info", `Ticket events request for: ${ticket} from ${req.ip}`);

    try {
      const result = await getTicketEvents(ticket);
      res.json(result);
    } catch (err) {
      handleTicketError(res, ticket, "events", err);
    }
  }
);

/**
 * @swagger
 * /ticket/{ticket}/statistics:
 *   get:
 *     summary: Get key statistics for a ticket
 *     description: Retrieve key financial statistics and metrics for a ticket
 *     tags: [Ticket]
 *     parameters:
 *       - in: path
 *         name: ticket
 *         required: true
 *         description: Stock ticker symbol
 *         schema:
 *           type: string
 *         example: "AAPL"
 *     responses:
 *       200:
 *         description: Key statistics and financial metrics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KeyStatistics'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:ticket/statistics",
  async (
    req: Request<TicketRouteParams>,
    res: Response<QuoteSummaryResult | ErrorResponse>
  ) => {
    const ticket = req.params.ticket.toUpperCase();

    // Validate symbol format
    if (!isValidSymbol(ticket)) {
      return res
        .status(404)
        .json({ error: `Symbol '${ticket}' not found or invalid` });
    }

    log("info", `Ticket statistics request for: ${ticket} from ${req.ip}`);

    try {
      const result = await getTicketStatistics(ticket);
      res.json(result);
    } catch (err) {
      handleTicketError(res, ticket, "statistics", err);
    }
  }
);

/**
 * @swagger
 * /ticket/{ticket}/{type}:
 *   get:
 *     summary: Get financial statements
 *     description: Retrieve financial statements for a ticket
 *     tags: [Ticket]
 *     parameters:
 *       - in: path
 *         name: ticket
 *         required: true
 *         description: Stock ticker symbol
 *         schema:
 *           type: string
 *         example: "AAPL"
 *       - in: path
 *         name: type
 *         required: true
 *         description: Type of financial statement
 *         schema:
 *           type: string
 *           enum: [income, balance, cashflow]
 *       - in: query
 *         name: period
 *         description: Time period for financial data
 *         schema:
 *           type: string
 *           enum: [annual, quarterly]
 *           default: "annual"
 *     responses:
 *       200:
 *         description: Financial statement data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FinancialData'
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
router.get(
  "/:ticket/:type",
  async (
    req: Request<
      TicketRouteParams & { type: string },
      Record<string, unknown>,
      unknown,
      FinancialQueryParams
    >,
    res: Response<QuoteSummaryResult | ErrorResponse>
  ) => {
    const ticket = req.params.ticket.toUpperCase();
    const type = req.params.type.toLowerCase();
    const period = (req.query.period || "annual") as "annual" | "quarterly";

    // Validate symbol format
    if (!isValidSymbol(ticket)) {
      return res
        .status(404)
        .json({ error: `Symbol '${ticket}' not found or invalid` });
    }

    log(
      "info",
      `Ticket financial request for: ${ticket}/${type} from ${req.ip}`
    );

    // Validate type
    if (!["income", "balance", "cashflow"].includes(type)) {
      log("warn", `Invalid financial type requested: ${type}`);
      return res.status(400).json({
        error: `Invalid statement type: ${type}. Must be 'income', 'balance', or 'cashflow'`,
      });
    }

    // Validate period
    if (!["annual", "quarterly"].includes(period)) {
      log("warn", `Invalid period requested: ${period}`);
      return res.status(400).json({
        error: `Invalid period: ${period}. Must be 'annual' or 'quarterly'`,
      });
    }

    try {
      const result = await getTicketFinancials(
        ticket,
        type as "income" | "balance" | "cashflow",
        period
      );
      res.json(result);
    } catch (err) {
      handleTicketError(res, ticket, "financial", err);
    }
  }
);

/**
 * @swagger
 * /ticket/{ticket}:
 *   get:
 *     summary: Get company information
 *     description: Retrieve company information and profile for a ticket
 *     tags: [Ticket]
 *     parameters:
 *       - in: path
 *         name: ticket
 *         required: true
 *         description: Stock ticker symbol
 *         schema:
 *           type: string
 *         example: "AAPL"
 *     responses:
 *       200:
 *         description: Company information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyInfo'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:ticket",
  async (
    req: Request<TicketRouteParams>,
    res: Response<QuoteSummaryResult | ErrorResponse>
  ) => {
    const ticket = req.params.ticket.toUpperCase();

    // Validate symbol format
    if (!isValidSymbol(ticket)) {
      return res
        .status(404)
        .json({ error: `Symbol '${ticket}' not found or invalid` });
    }

    log("info", `Ticket info request for: ${ticket} from ${req.ip}`);

    try {
      const result = await getTicketInfo(ticket);
      res.json(result);
    } catch (err) {
      handleTicketError(res, ticket, "info", err);
    }
  }
);

export default router;

// Export for testing
export { handleTicketError };
