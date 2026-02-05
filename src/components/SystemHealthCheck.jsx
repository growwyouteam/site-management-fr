/**
 * System Health Check Component
 * Monitors performance and backend connectivity
 */

import { useState } from 'react';
import connectivityChecker from '../utils/backendConnectivityCheck';
import performanceMonitor from '../utils/performanceMonitor';

const SystemHealthCheck = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState(null);
    const [componentCheck, setComponentCheck] = useState(null);

    const runFullCheck = async () => {
        setIsRunning(true);
        setResults(null);

        try {
            const checkResults = await connectivityChecker.checkAllEndpoints();
            setResults(checkResults);
        } catch (error) {
            console.error('Health check failed:', error);
            setResults({ error: error.message });
        } finally {
            setIsRunning(false);
        }
    };

    const checkComponent = async (componentName) => {
        setComponentCheck({ loading: true, component: componentName });

        try {
            const result = await connectivityChecker.checkComponent(componentName);
            setComponentCheck(result);
        } catch (error) {
            setComponentCheck({ error: error.message, component: componentName });
        }
    };

    const getPerformanceSummary = () => {
        return performanceMonitor.getSummary();
    };

    const clearMetrics = () => {
        performanceMonitor.clear();
        setResults(null);
        setComponentCheck(null);
    };

    if (isRunning) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Running system health check...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">System Health Check</h2>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button
                    onClick={runFullCheck}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    🔍 Check All Endpoints
                </button>

                <button
                    onClick={() => checkComponent('Admin Dashboard')}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                    📊 Test Dashboard
                </button>

                <button
                    onClick={clearMetrics}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                    🗑️ Clear Metrics
                </button>
            </div>

            {/* Component Quick Tests */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Component Tests</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Projects', 'Expenses', 'Stock', 'Machines', 'Site Manager Dashboard', 'Site Projects', 'Site Labours', 'Site Expenses'].map(component => (
                        <button
                            key={component}
                            onClick={() => checkComponent(component)}
                            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors"
                        >
                            Test {component}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results */}
            {results && !results.error && (
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="font-semibold text-blue-900 mb-2">📊 Connectivity Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Admin:</span> {results.summary.adminSuccess}/{results.summary.totalAdmin}
                            </div>
                            <div>
                                <span className="font-medium">Site Manager:</span> {results.summary.siteManagerSuccess}/{results.summary.totalSiteManager}
                            </div>
                            <div>
                                <span className="font-medium">Success Rate:</span> {((results.summary.adminSuccess + results.summary.siteManagerSuccess) / (results.summary.totalAdmin + results.summary.totalSiteManager) * 100).toFixed(1)}%
                            </div>
                            <div>
                                <span className="font-medium">Failed:</span>
                                {results.summary.adminFailed + results.summary.siteManagerFailed}
                            </div>
                        </div>
                    </div>

                    {/* Failed Endpoints */}
                    {(results.summary.adminFailed > 0 || results.summary.siteManagerFailed > 0) && (
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <h3 className="font-semibold text-red-900 mb-2">❌ Failed Endpoints</h3>
                            <div className="space-y-1 text-sm">
                                {Object.values(results.admin).filter(r => !r.success).map(r => (
                                    <div key={r.path} className="text-red-700">
                                        {r.description}: {r.error}
                                    </div>
                                ))}
                                {Object.values(results.siteManager).filter(r => !r.success).map(r => (
                                    <div key={r.path} className="text-red-700">
                                        {r.description}: {r.error}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Slow Endpoints */}
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Slow Endpoints (>2s)</h3>
                        <div className="space-y-1 text-sm">
                            {[...Object.values(results.admin), ...Object.values(results.siteManager)]
                                .filter(r => r.duration > 2000)
                                .map(r => (
                                    <div key={r.path} className="text-yellow-700">
                                        {r.description}: {r.duration.toFixed(2)}ms
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Component Check Results */}
            {componentCheck && !componentCheck.error && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-900 mb-2">
                        {componentCheck.success ? '✅' : '❌'} {componentCheck.component}
                    </h3>
                    <div className="text-sm space-y-1">
                        <div>Status: {componentCheck.success ? 'Working' : 'Failed'}</div>
                        <div>Total Time: {componentCheck.totalDuration?.toFixed(2)}ms</div>
                        <div>Endpoints: {componentCheck.endpoints?.length} tested</div>
                    </div>
                </div>
            )}

            {/* Performance Summary */}
            <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">🚀 Performance Summary</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <pre className="text-xs overflow-auto">
                        {JSON.stringify(getPerformanceSummary(), null, 2)}
                    </pre>
                </div>
            </div>

            {/* Error Display */}
            {(results?.error || componentCheck?.error) && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h3 className="font-semibold text-red-900 mb-2">❌ Error</h3>
                    <p className="text-red-700">{results?.error || componentCheck?.error}</p>
                </div>
            )}
        </div>
    );
};

export default SystemHealthCheck;
