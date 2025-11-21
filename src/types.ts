/**
 * Centralized Type Definitions
 *
 * This file exports all type definitions used across the yahoo-finance-server project.
 * It re-exports types from yahoo-finance2 library and defines custom types for
 * data structures not directly exported by the library.
 *
 * @module types
 */

// Re-export types from yahoo-finance2 library
export type {
  QuoteSummaryResult,
  AssetProfile,
  FinancialData,
  FundProfile,
  TopHoldings,
  SummaryProfile,
  RecommendationTrend,
  UpgradeDowngradeHistory,
  InsiderTransactions,
} from "yahoo-finance2/esm/src/modules/quoteSummary-iface.js";

export type { SearchResult } from "yahoo-finance2/esm/src/modules/search.js";

// Import yahooFinance for utility types
import yahooFinance from "./yahoo";

/**
 * Utility types derived from yahoo-finance2 function signatures
 */
export type HistoricalOptions = Parameters<typeof yahooFinance.historical>[1];
export type ScreenerOptions = Parameters<typeof yahooFinance.screener>[0];
export type ChartOptions = Parameters<typeof yahooFinance.chart>[1];
export type QuoteSummaryOptions = Parameters<
  typeof yahooFinance.quoteSummary
>[1];

/**
 * Trending symbols result structure
 */
/**
 * Trending symbols result structure
 */
export interface TrendingResult {
  quotes: Array<{
    symbol: string;
    shortname?: string;
    regularMarketPrice?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Single recommendation item
 */
export interface Recommendation {
  symbol: string;
  shortname?: string;
  recommendationKey?: string;
  recommendationScore?: number;
  percentDowngrade?: number;
  percentHold?: number;
  percentBuy?: number;
  [key: string]: unknown;
}

/**
 * Array of recommendations
 */
export interface RecommendationsResult {
  symbol: string;
  recommendedSymbols: Array<{
    symbol: string;
    score: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Screener result structure
 */
export interface ScreenerResult {
  quotes: Array<{
    symbol: string;
    shortname?: string;
    regularMarketPrice?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    volume?: number;
    marketCap?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Single historical data row
 */
export interface HistoricalRow {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjclose?: number;
  [key: string]: unknown;
}

/**
 * Array of historical data rows
 */
export type HistoricalResult = HistoricalRow[];

/**
 * Quote result structure
 */
export interface QuoteResult {
  regularMarketPrice?: number;
  currency?: string;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  marketCap?: number;
  trailingPE?: number;
  trailingAnnualDividendRate?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  averageVolume?: number;
  [key: string]: unknown;
}

/**
 * Chart result structure
 */
export interface ChartResult {
  quotes: Array<{
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjclose?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Single fundamental data row (for financial statements)
 */
export interface FundamentalRow {
  date: Date;
  totalRevenue?: number;
  costOfRevenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  totalAssets?: number;
  totalLiabilitiesNetMinorityInterest?: number;
  totalStockholderEquity?: number;
  commonStockEquity?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  operatingCashFlow?: number;
  investingCashFlow?: number;
  financingCashFlow?: number;
  capitalExpenditure?: number;
  [key: string]: unknown;
}

/**
 * Array of fundamental data rows
 */
export type FundamentalsResult = FundamentalRow[];

/**
 * News article JSON structure (for scraping)
 */
export interface NewsJson {
  headline?: string;
  title?: string;
  body?: {
    items?: Array<{
      data?: {
        storyAtoms?: unknown[];
      };
    }>;
  };
}

/**
 * Story atom structure (for news content extraction)
 */
export interface StoryAtom {
  type: string;
  content: string;
}

/**
 * Summary profile with structured data
 */
export interface SummaryProfileData {
  previousClose?: { raw: number };
  marketCap?: { raw: number };
  trailingPE?: { raw: number };
  forwardPE?: { raw: number };
  [key: string]: unknown;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}
