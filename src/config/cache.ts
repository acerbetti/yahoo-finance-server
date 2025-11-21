/**
 * Caching configuration module
 * Provides cache instance and configuration for the application
 * Supports multiple cache backends: NodeCache (in-memory), Memcached, or disabled
 */

import NodeCache from "node-cache";
import Memcached from "memcached";

/**
 * Cache mode constants
 */
const CACHE_MODE_NODECACHE = "nodecache";
const CACHE_MODE_MEMCACHED = "memcached";
const CACHE_MODE_NONE = "none";

/**
 * Cache mode from environment.
 * Options: 'nodecache' (default), 'memcached', 'none'
 */
const CACHE_MODE = process.env.CACHE_MODE || CACHE_MODE_NODECACHE;

/**
 * Cache host for memcached (default: localhost:11211)
 */
const CACHE_HOST = process.env.CACHE_HOST || "localhost:11211";

/**
 * Cache TTL (Time To Live) in seconds from environment or default.
 * Default: 300 seconds (5 minutes)
 */
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 300;

/**
 * Cache enabled flag for backward compatibility.
 * @deprecated Use CACHE_MODE instead
 */
const CACHE_ENABLED = CACHE_MODE !== CACHE_MODE_NONE;

/**
 * Unified cache interface with generic type support
 * @template T - The type of values stored in the cache
 */
interface CacheInterface<T = unknown> {
  /**
   * Get a value from the cache
   * @param key - Cache key
   * @returns Promise resolving to the cached value or undefined
   */
  // eslint-disable-next-line no-unused-vars
  get<K extends T = T>(_key: string): Promise<K | undefined>;

  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional time-to-live in seconds
   */
  // eslint-disable-next-line no-unused-vars
  set<K extends T = T>(_key: string, _value: K, _ttl?: number): Promise<void>;
}

/**
 * No-op cache implementation for when caching is disabled
 */
class NoOpCache<T = unknown> implements CacheInterface<T> {
  // eslint-disable-next-line no-unused-vars
  async get<K extends T = T>(_key: string): Promise<K | undefined> {
    return undefined;
  }

  // eslint-disable-next-line no-unused-vars
  async set<K extends T = T>(_key: string, _value: K, _ttl?: number): Promise<void> {
    // Do nothing
  }
}

/**
 * Memcached wrapper to match our interface
 */
class MemcachedCache<T = unknown> implements CacheInterface<T> {
  private client: Memcached;

  constructor(host: string) {
    this.client = new Memcached(host);
  }

  async get<K extends T = T>(key: string): Promise<K | undefined> {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data as K | undefined);
        }
      });
    });
  }

  async set<K extends T = T>(key: string, value: K, ttl?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, ttl || CACHE_TTL, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

/**
 * NodeCache wrapper to match our interface
 */
class NodeCacheWrapper<T = unknown> implements CacheInterface<T> {
  private cache: NodeCache;

  constructor(ttl: number) {
    this.cache = new NodeCache({ stdTTL: ttl });
  }

  async get<K extends T = T>(key: string): Promise<K | undefined> {
    return Promise.resolve(this.cache.get<K>(key));
  }

  async set<K extends T = T>(key: string, value: K, ttl?: number): Promise<void> {
    this.cache.set(key, value, ttl || 0);
    return Promise.resolve();
  }
}

/**
 * Cache instance based on CACHE_MODE
 * Uses unknown as the default type for maximum flexibility
 */
let cache: CacheInterface<unknown>;

switch (CACHE_MODE.toLowerCase()) {
  case CACHE_MODE_MEMCACHED:
    cache = new MemcachedCache<unknown>(CACHE_HOST);
    break;
  case CACHE_MODE_NONE:
    cache = new NoOpCache<unknown>();
    break;
  case CACHE_MODE_NODECACHE:
  default:
    cache = new NodeCacheWrapper<unknown>(CACHE_TTL);
    break;
}

export {
  cache,
  CacheInterface,
  CACHE_MODE,
  CACHE_HOST,
  CACHE_ENABLED,
  CACHE_TTL,
  CACHE_MODE_NODECACHE,
  CACHE_MODE_MEMCACHED,
  CACHE_MODE_NONE,
};
