/**
 * Caching configuration module
 * Provides cache instance and configuration for the application
 */

import NodeCache from "node-cache";

/**
 * Cache enabled flag from environment (default: true).
 */
const CACHE_ENABLED = process.env.CACHE_ENABLED !== "false";

/**
 * Cache TTL (Time To Live) in seconds from environment or default.
 * Default: 300 seconds (5 minutes)
 */
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 300;

/**
 * NodeCache instance for storing cached API responses.
 */
const cache = new NodeCache({ stdTTL: CACHE_TTL });

export { cache, CACHE_ENABLED, CACHE_TTL };
