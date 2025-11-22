/**
 * API Routes module
 * Main router that combines all individual route modules
 * @module routes/index
 */

import { Router } from "express";

import healthRoutes from "./health";
import historyRoutes from "./history";
import newsRoutes from "./news";
import newsReaderRouter from "./newsReader";
import quotesRoutes from "./quotes";
import recommendationsRoutes from "./recommendations";
import screenerRoutes from "./screener";
import searchRoutes from "./search";
import ticketRoutes from "./ticket";
import trendingRoutes from "./trending";

const router = Router();

// ============================================================================
// Mount Individual Route Modules
// ============================================================================

/**
 * Health check routes
 */
router.use("/", healthRoutes);

/**
 * Stock quotes routes
 */
router.use("/quote", quotesRoutes);

/**
 * Historical data routes
 */
router.use("/history", historyRoutes);

/**
 * Search routes
 */
router.use("/search", searchRoutes);

/**
 * Trending symbols routes
 */
router.use("/trending", trendingRoutes);

/**
 * Stock recommendations routes
 */
router.use("/recommendations", recommendationsRoutes);

/**
 * Stock screener routes
 */
router.use("/screener", screenerRoutes);

/**
 * News routes
 */
router.use("/news", newsRoutes);

/**
 * Ticket (consolidated ticker-specific) routes
 * Includes: company info, financials, holdings, insights, and news
 */
router.use("/ticket", ticketRoutes);

/**
 * News reader routes (additional news functionality)
 */
router.use("/news-reader", newsReaderRouter);

export default router;
