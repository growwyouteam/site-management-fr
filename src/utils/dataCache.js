/**
 * Data Caching System
 * Reduces API calls by caching frequently accessed data
 */

class DataCache {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Get cached data
    get(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    // Set cached data
    set(key, data, customTimeout = null) {
        const expiry = Date.now() + (customTimeout || this.cacheTimeout);
        this.cache.set(key, { data, expiry });
    }

    // Clear cache
    clear(key = null) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    // Check if data is cached and valid
    isValid(key) {
        const cached = this.cache.get(key);
        return cached && Date.now() < cached.expiry;
    }

    // Get cache size
    size() {
        return this.cache.size;
    }

    // Clean expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now >= value.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

// Create singleton instance
const dataCache = new DataCache();

// Auto-cleanup every 2 minutes
setInterval(() => dataCache.cleanup(), 2 * 60 * 1000);

export default dataCache;
