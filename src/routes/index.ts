/**
 * API Routes module
 * Main router that combines all individual route modules
 * @module routes/index
 */

import { Router } from "express";
import healthRoutes from "./health";
import quotesRoutes from "./quotes";
import historyRoutes from "./history";
import infoRoutes from "./info";
import searchRoutes from "./search";
import trendingRoutes from "./trending";
import recommendationsRoutes from "./recommendations";
import insightsRoutes from "./insights";
import screenerRoutes from "./screener";
import financialRoutes from "./financial";
import newsRoutes from "./news";
import holdingsRoutes from "./holdings";
import newsReaderRouter from "./newsReader";

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
 * Company information routes
 */
router.use("/info", infoRoutes);

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
 * Comprehensive insights routes
 */
router.use("/insights", insightsRoutes);

/**
 * Stock screener routes
 */
router.use("/screener", screenerRoutes);

/**
 * Financial statements routes
 */
router.use("/financial", financialRoutes);

/**
 * News routes
 */
router.use("/news", newsRoutes);

/**
 * News reader routes (additional news functionality)
 */
router.use("/news-reader", newsReaderRouter);

/**
 * ETF holdings routes
 */
router.use("/holdings", holdingsRoutes);

export default router;
