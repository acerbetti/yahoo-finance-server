/**
 * Ticket Routes module
 * Consolidated ticker-specific endpoints
 * @module routes/ticket
 */

import { Router, Request, Response } from "express";

import { cache, CACHE_ENABLED } from "../config/cache";
import type { QuoteSummaryResult, ErrorResponse } from "../types";
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
): Promise<{
  symbol: string;
  count: number;
  news: Array<{
    title: string;
    publisher: string;
    link: string;
    publishedAt?: Date | number;
    type?: string;
    relatedTickers?: string[];
  }>;
  companyInfo?: {
    longName?: string;
    sector?: string;
    industry?: string;
    website?: string;
  };
  summaryInfo?: {
    previousClose?: number;
    marketCap?: number;
    trailingPE?: number;
    forwardPE?: number;
  };
  message: string;
  dataAvailable: {
    hasAssetProfile?: boolean;
    hasSummaryProfile?: boolean;
    hasNews: boolean;
  };
}> {
  const limitedCount = Math.min(count || 10, 50);
  const cacheKey = `ticket:news:${ticket}:${limitedCount}`;

  if (CACHE_ENABLED) {
    const cached = await cache.get<ReturnType<typeof getTicketNews>>(cacheKey);
    if (cached) {
      log("debug", `Cache hit for ticket news: ${ticket}`);
      return cached;
    }
  }

  log("debug", `Fetching news for ${ticket}`);

  const searchResult = await yahooFinance.search(ticket, {
    newsCount: limitedCount,
  });

  interface SearchArticle {
    title: string;
    publisher: string;
    link: string;
    providerPublishTime?: Date | number;
    type?: string;
    relatedTickers?: string[];
  }

  const newsArticles =
    searchResult.news?.map((article: SearchArticle) => ({
      title: article.title,
      publisher: article.publisher,
      link: article.link,
      publishedAt: article.providerPublishTime,
      type: article.type,
      relatedTickers: article.relatedTickers,
    })) || [];

  let assetProfile: unknown;
  let summaryProfile: unknown;
  const dataAvailable: Record<string, boolean> = {
    hasAssetProfile: false,
    hasSummaryProfile: false,
    hasNews: newsArticles.length > 0,
  };

  try {
    const info = await yahooFinance.quoteSummary(ticket, {
      modules: ["assetProfile", "summaryProfile"],
    });
    assetProfile = info.assetProfile;
    summaryProfile = info.summaryProfile;
    dataAvailable.hasAssetProfile = !!assetProfile;
    dataAvailable.hasSummaryProfile = !!summaryProfile;
  } catch (error) {
    log(
      "debug",
      `Could not fetch profile info for ${ticket}: ${(error as Error).message}`
    );
  }

  const assetProfileData = assetProfile as Record<string, unknown> | undefined;
  const summaryProfileData = summaryProfile as
    | Record<string, unknown>
    | undefined;

  const result = {
    symbol: ticket,
    count: newsArticles.length,
    news: newsArticles,
    companyInfo: {
      longName:
        typeof assetProfileData?.longName === "string"
          ? (assetProfileData.longName as string)
          : undefined,
      sector:
        typeof assetProfileData?.sector === "string"
          ? (assetProfileData.sector as string)
          : undefined,
      industry:
        typeof assetProfileData?.industry === "string"
          ? (assetProfileData.industry as string)
          : undefined,
      website:
        typeof assetProfileData?.website === "string"
          ? (assetProfileData.website as string)
          : undefined,
    },
    summaryInfo: {
      previousClose:
        typeof summaryProfileData?.previousClose === "number"
          ? (summaryProfileData.previousClose as number)
          : undefined,
      marketCap:
        typeof summaryProfileData?.marketCap === "number"
          ? (summaryProfileData.marketCap as number)
          : undefined,
      trailingPE:
        typeof summaryProfileData?.trailingPE === "number"
          ? (summaryProfileData.trailingPE as number)
          : undefined,
      forwardPE:
        typeof summaryProfileData?.forwardPE === "number"
          ? (summaryProfileData.forwardPE as number)
          : undefined,
    },
    message:
      newsArticles.length > 0
        ? `Found ${newsArticles.length} news articles for ${ticket}`
        : `No recent news found for ${ticket}`,
    dataAvailable: {
      hasAssetProfile: dataAvailable.hasAssetProfile,
      hasSummaryProfile: dataAvailable.hasSummaryProfile,
      hasNews: dataAvailable.hasNews,
    },
  };

  if (CACHE_ENABLED) {
    await cache.set(cacheKey, result);
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

    log("info", `Ticket holdings request for: ${ticket} from ${req.ip}`);

    try {
      const result = await getTicketHoldings(ticket);
      res.json(result);
    } catch (err) {
      log(
        "error",
        `Ticket holdings endpoint error for ${ticket}: ${
          (err as Error).message
        }`,
        err
      );
      res.status(500).json({ error: (err as Error).message });
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

    log("info", `Ticket insights request for: ${ticket} from ${req.ip}`);

    try {
      const result = await getTicketInsights(ticket);
      res.json(result);
    } catch (err) {
      log(
        "error",
        `Ticket insights endpoint error for ${ticket}: ${
          (err as Error).message
        }`,
        err
      );
      res.status(500).json({ error: (err as Error).message });
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
 *               $ref: '#/components/schemas/NewsData'
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
    req: Request<
      TicketRouteParams,
      Record<string, unknown>,
      unknown,
      NewsQueryParams
    >,
    res: Response<unknown>
  ) => {
    const ticket = req.params.ticket.toUpperCase();
    const count = parseInt(req.query.count || "10", 10);

    log("info", `Ticket news request for: ${ticket} from ${req.ip}`);

    try {
      const result = await getTicketNews(ticket, count);
      res.json(result);
    } catch (err) {
      log(
        "error",
        `Ticket news endpoint error for ${ticket}: ${(err as Error).message}`,
        err
      );
      res.status(500).json({ error: (err as Error).message });
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
      log(
        "error",
        `Ticket financial endpoint error for ${ticket}/${type}: ${
          (err as Error).message
        }`,
        err
      );
      res.status(500).json({ error: (err as Error).message });
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

    log("info", `Ticket info request for: ${ticket} from ${req.ip}`);

    try {
      const result = await getTicketInfo(ticket);
      res.json(result);
    } catch (err) {
      log(
        "error",
        `Ticket info endpoint error for ${ticket}: ${(err as Error).message}`,
        err
      );
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

export default router;
