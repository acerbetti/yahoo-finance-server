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
} from "yahoo-finance2/esm/src/modules/quoteSummary-iface";

export type {
  SearchResult,
  SearchNews,
} from "yahoo-finance2/esm/src/modules/search";
export type { RecommendationsBySymbolResponse } from "yahoo-finance2/esm/src/modules/recommendationsBySymbol";
export type {
  ChartResultArray,
  ChartOptions,
} from "yahoo-finance2/esm/src/modules/chart";
export type {
  HistoricalHistoryResult,
  HistoricalOptions,
} from "yahoo-finance2/esm/src/modules/historical";
export type { Quote } from "yahoo-finance2/esm/src/modules/quote";
export type { TrendingSymbolsResult } from "yahoo-finance2/esm/src/modules/trendingSymbols";
export type {
  ScreenerResult,
  PredefinedScreenerModules,
} from "yahoo-finance2/esm/src/modules/screener";

// Import yahooFinance for utility types
import yahooFinance from "./yahoo";

/**
 * Utility types derived from yahoo-finance2 function signatures
 */
export type ScreenerOptions = Parameters<typeof yahooFinance.screener>[0];
export type QuoteSummaryOptions = Parameters<
  typeof yahooFinance.quoteSummary
>[1];

/**
 * Fundamentals Time Series types
 */
export type {
  FundamentalsTimeSeriesResult,
  FundamentalsTimeSeriesResults,
  FundamentalsTimeSeriesFinancialsResult,
  FundamentalsTimeSeriesBalanceSheetResult,
  FundamentalsTimeSeriesCashFlowResult,
} from "yahoo-finance2/esm/src/modules/fundamentalsTimeSeries";

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
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}
