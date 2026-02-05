/**
 * Performance Monitor
 * Tracks and logs component loading times and API performance
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.thresholds = {
            fast: 500,      // < 500ms = fast
            medium: 1500,   // 500-1500ms = medium
            slow: 3000      // > 1500ms = slow
        };
    }

    // Start timing a component
    start(componentName) {
        this.metrics.set(componentName, {
            startTime: performance.now(),
            endTime: null,
            duration: null
        });
    }

    // End timing a component
    end(componentName) {
        const metric = this.metrics.get(componentName);
        if (metric) {
            metric.endTime = performance.now();
            metric.duration = metric.endTime - metric.startTime;

            this.logPerformance(componentName, metric.duration);
            return metric.duration;
        }
        return null;
    }

    // Log performance with emoji indicators
    logPerformance(componentName, duration) {
        let emoji = '🐢'; // Slow
        let status = 'SLOW';

        if (duration < this.thresholds.fast) {
            emoji = '🚀'; // Fast
            status = 'FAST';
        } else if (duration < this.thresholds.medium) {
            emoji = '⚡'; // Medium
            status = 'MEDIUM';
        }

        console.log(`${emoji} ${componentName}: ${duration.toFixed(2)}ms [${status}]`);

        // Store for analytics
        this.storeMetric(componentName, duration, status);
    }

    // Store metrics for analytics
    storeMetric(componentName, duration, status) {
        const key = `perf_${componentName}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({
            duration,
            status,
            timestamp: new Date().toISOString()
        });

        // Keep only last 10 entries
        if (existing.length > 10) {
            existing.shift();
        }

        localStorage.setItem(key, JSON.stringify(existing));
    }

    // Get performance summary
    getSummary() {
        const summary = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('perf_')) {
                const componentName = key.replace('perf_', '');
                const metrics = JSON.parse(localStorage.getItem(key));

                if (metrics.length > 0) {
                    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
                    const fastCount = metrics.filter(m => m.status === 'FAST').length;
                    const mediumCount = metrics.filter(m => m.status === 'MEDIUM').length;
                    const slowCount = metrics.filter(m => m.status === 'SLOW').length;

                    summary[componentName] = {
                        avgDuration: avgDuration.toFixed(2),
                        totalRequests: metrics.length,
                        performance: {
                            fast: fastCount,
                            medium: mediumCount,
                            slow: slowCount
                        }
                    };
                }
            }
        }
        return summary;
    }

    // Clear all metrics
    clear() {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key.startsWith('perf_')) {
                localStorage.removeItem(key);
            }
        }
        this.metrics.clear();
    }

    // Get current active metrics
    getActiveMetrics() {
        const active = {};
        for (const [name, metric] of this.metrics.entries()) {
            if (metric.startTime && !metric.endTime) {
                active[name] = {
                    running: true,
                    elapsed: performance.now() - metric.startTime
                };
            }
        }
        return active;
    }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// React Hook for performance monitoring
export const usePerformanceMonitor = (componentName) => {
    const startTiming = () => {
        performanceMonitor.start(componentName);
    };

    const endTiming = () => {
        return performanceMonitor.end(componentName);
    };

    return { startTiming, endTiming };
};

export default performanceMonitor;
