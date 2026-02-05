/**
 * Performance Audit and Monitoring
 * Tracks API performance and identifies bottlenecks
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.slowQueries = [];
        this.thresholds = {
            SLOW_QUERY: 2000, // 2 seconds
            VERY_SLOW_QUERY: 5000 // 5 seconds
        };
    }

    // Start timing an operation
    start(operation) {
        this.metrics.set(operation, {
            startTime: performance.now(),
            url: null,
            method: null
        });
    }

    // End timing and record metrics
    end(operation, url = null, method = null) {
        const metric = this.metrics.get(operation);
        if (metric) {
            const duration = performance.now() - metric.startTime;
            const result = {
                operation,
                duration,
                url: url || metric.url,
                method: method || metric.method,
                timestamp: new Date().toISOString()
            };

            // Log slow queries
            if (duration > this.thresholds.VERY_SLOW_QUERY) {
                console.error(`🐌 VERY SLOW: ${operation} took ${duration.toFixed(2)}ms`, result);
                this.slowQueries.push(result);
            } else if (duration > this.thresholds.SLOW_QUERY) {
                console.warn(`⚠️  SLOW: ${operation} took ${duration.toFixed(2)}ms`, result);
                this.slowQueries.push(result);
            } else {
                console.log(`✅ FAST: ${operation} took ${duration.toFixed(2)}ms`);
            }

            this.metrics.delete(operation);
            return result;
        }
        return null;
    }

    // Get performance report
    getReport() {
        return {
            slowQueries: this.slowQueries,
            totalSlowQueries: this.slowQueries.length,
            averageSlowQueryTime: this.slowQueries.length > 0
                ? this.slowQueries.reduce((sum, q) => sum + q.duration, 0) / this.slowQueries.length
                : 0
        };
    }

    // Clear metrics
    clear() {
        this.metrics.clear();
        this.slowQueries = [];
    }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// API wrapper with performance monitoring
const withPerformanceMonitoring = (apiFunction) => {
    return async (...args) => {
        const operation = `${args[0]}_${args[1] || 'GET'}`;
        performanceMonitor.start(operation);

        try {
            const result = await apiFunction(...args);
            performanceMonitor.end(operation);
            return result;
        } catch (error) {
            performanceMonitor.end(operation);
            throw error;
        }
    };
};

export { performanceMonitor, withPerformanceMonitoring };
