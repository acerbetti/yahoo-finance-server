/**
 * API Routes module
 * Main router that combines all individual route modules
 * @module routes/index
 */

import { Router } from "express";

import healthRoutes from "./health";
import historyRoutes from "./history";
import marketRoutes from "./market";
import newsReaderRouter from "./newsReader";
import quotesRoutes from "./quotes";
import searchRoutes from "./search";
import ticketRoutes from "./ticket";

const router = Router();

// ============================================================================
// Mount Individual Route Modules
// ============================================================================

/**
 * Health check routes
 */
router.use("/", healthRoutes);

/**
 * Market data routes (generic market information)
 * Includes: indices, summary, sectors, currencies, commodities, sentiment, trending, screener, news
 */
router.use("/market", marketRoutes);

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
 * Ticket (consolidated ticker-specific) routes
 * Includes: company info, financials, holdings, insights, events, statistics, recommendations, and news
 */
router.use("/ticket", ticketRoutes);

/**
 * News reader routes (additional news functionality)
 */
router.use("/news-reader", newsReaderRouter);

// ============================================================================
// Backward Compatibility Redirects
// ============================================================================

/**
 * Backward compatibility: redirect old trending routes to new market routes
 */
router.get("/trending/:region", (req, res) => {
  res.redirect(301, "/market/trending/US");
});

/**
 * Backward compatibility: redirect old screener routes to new market routes
 */
router.get("/screener/:type", (req, res) => {
  const newPath = `/market/screener/${req.params.type}${
    req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : ""
  }`;
  res.redirect(301, newPath);
});

/**
 * Backward compatibility: redirect old news routes to new market routes
 */
router.get("/news", (req, res) => {
  const newPath = `/market/news${req.url}`;
  res.redirect(301, newPath);
});

export default router;
