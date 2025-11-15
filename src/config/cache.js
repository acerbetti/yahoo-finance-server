/**
 * Caching configuration module
 * Provides cache instance and configuration for the application
 * @module config/cache
 */

import NodeCache from "node-cache";

/**
 * Cache enabled flag from environment (default: true)
 * @const {boolean} CACHE_ENABLED
 */
const CACHE_ENABLED = process.env.CACHE_ENABLED !== "false";

/**
 * Cache TTL (Time To Live) in seconds from environment or default
 * Default: 300 seconds (5 minutes)
 * @const {number} CACHE_TTL
 */
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 300;

/**
 * NodeCache instance for storing cached API responses
 * @type {NodeCache}
 */
const cache = new NodeCache({ stdTTL: CACHE_TTL });

export { cache, CACHE_ENABLED, CACHE_TTL };
