/**
 * Optimized API Service with Caching
 * Reduces API calls and improves performance
 */

import api from './api';
import dataCache from '../utils/dataCache';

// Cache keys
const CACHE_KEYS = {
    PROJECTS: 'projects',
    STOCKS: 'stocks',
    VENDORS: 'vendors',
    EXPENSES: 'expenses',
    CONTRACTORS: 'contractors',
    MACHINES: 'machines',
    USERS: 'users',
    DASHBOARD: 'dashboard',
    ACCOUNTS: 'accounts'
};

// Optimized API functions with caching
const optimizedApi = {
    // Get with cache
    async getWithCache(url, cacheKey, customTimeout = null) {
        // Check cache first
        const cachedData = dataCache.get(cacheKey);
        if (cachedData) {
            console.log(`📦 Cache hit for ${cacheKey}`);
            return { data: { success: true, data: cachedData } };
        }

        // Fetch from API
        console.log(`🌐 Fetching ${cacheKey} from API...`);
        const response = await api.get(url);

        // Cache the response
        if (response.data.success) {
            dataCache.set(cacheKey, response.data.data, customTimeout);
        }

        return response;
    },

    // Batch fetch multiple endpoints
    async batchFetch(requests) {
        const startTime = Date.now();

        try {
            const responses = await Promise.allSettled(
                requests.map(req => api.get(req.url))
            );

            const results = responses.map((response, index) => {
                if (response.status === 'fulfilled') {
                    return {
                        url: requests[index].url,
                        success: true,
                        data: response.value.data
                    };
                } else {
                    return {
                        url: requests[index].url,
                        success: false,
                        error: response.reason.message || response.reason
                    };
                }
            });

            const duration = Date.now() - startTime;
            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;

            console.log(`⚡ Batch fetch completed in ${duration}ms (${successCount}/${requests.length} successful)`);

            // Log failed requests for debugging
            if (failCount > 0) {
                console.warn('❌ Failed requests:', results.filter(r => !r.success));
            }

            return results;
        } catch (error) {
            console.error('❌ Batch fetch failed:', error);
            throw error;
        }
    },

    // Optimized endpoints
    async getProjects() {
        return this.getWithCache('/admin/projects', CACHE_KEYS.PROJECTS);
    },

    async getStocks() {
        return this.getWithCache('/admin/stocks', CACHE_KEYS.STOCKS);
    },

    async getVendors() {
        return this.getWithCache('/admin/vendors', CACHE_KEYS.VENDORS);
    },

    async getExpenses() {
        return this.getWithCache('/admin/expenses', CACHE_KEYS.EXPENSES);
    },

    async getContractors() {
        return this.getWithCache('/admin/contractors', CACHE_KEYS.CONTRACTORS);
    },

    async getMachines() {
        return this.getWithCache('/admin/machines', CACHE_KEYS.MACHINES);
    },

    async getUsers() {
        return this.getWithCache('/admin/users', CACHE_KEYS.USERS);
    },

    async getDashboard() {
        return this.getWithCache('/admin/dashboard', CACHE_KEYS.DASHBOARD, 2 * 60 * 1000); // 2 minutes cache
    },

    async getAccounts() {
        return this.getWithCache('/admin/accounts', CACHE_KEYS.ACCOUNTS);
    },

    // Batch fetch for dashboard data
    async fetchDashboardData() {
        const requests = [
            { url: '/admin/dashboard' },
            { url: '/admin/projects' },
            { url: '/admin/stocks' },
            { url: '/admin/expenses' },
            { url: '/admin/users' }
        ];

        return this.batchFetch(requests);
    },

    // Batch fetch for stock page
    async fetchStockPageData() {
        try {
            // Fetch stocks separately with shorter timeout
            console.log('🔄 Fetching stocks separately...');
            const stocksPromise = api.get('/admin/stocks', { timeout: 15000 }); // 15 second timeout

            // Fetch projects and vendors together
            console.log('🔄 Fetching projects and vendors...');
            const othersPromise = Promise.all([
                api.get('/admin/projects', { timeout: 10000 }), // 10 second timeout
                api.get('/admin/vendors', { timeout: 10000 })  // 10 second timeout
            ]);

            // Wait for all requests
            const allResponses = await Promise.allSettled([
                stocksPromise,
                othersPromise
            ]);

            const stocksResponse = allResponses[0];
            const othersResponse = allResponses[1];

            // Extract projects and vendors from the nested Promise.all
            let projectsResponse, vendorsResponse;

            if (othersResponse.status === 'fulfilled') {
                // othersResponse.value is an array with [projectsResult, vendorsResult]
                const othersData = othersResponse.value;
                if (Array.isArray(othersData) && othersData.length === 2) {
                    projectsResponse = { status: 'fulfilled', value: { data: othersData[0].data } };
                    vendorsResponse = { status: 'fulfilled', value: { data: othersData[1].data } };
                } else {
                    projectsResponse = { status: 'rejected', reason: new Error('Invalid response format') };
                    vendorsResponse = { status: 'rejected', reason: new Error('Invalid response format') };
                }
            } else {
                projectsResponse = othersResponse;
                vendorsResponse = othersResponse;
            }

            // Format results
            const results = [];

            // Handle stocks
            if (stocksResponse.status === 'fulfilled') {
                results.push({
                    url: '/admin/stocks',
                    success: true,
                    data: stocksResponse.value.data
                });
                console.log('📦 Stocks loaded successfully');
            } else {
                results.push({
                    url: '/admin/stocks',
                    success: false,
                    error: stocksResponse.reason.message || 'Stocks fetch failed'
                });
                console.error('❌ Stocks failed:', stocksResponse.reason.message);
            }

            // Handle projects
            if (projectsResponse.status === 'fulfilled') {
                results.push({
                    url: '/admin/projects',
                    success: true,
                    data: projectsResponse.value.data
                });
                console.log('🏗️ Projects loaded successfully');
            } else {
                results.push({
                    url: '/admin/projects',
                    success: false,
                    error: projectsResponse.reason.message || 'Projects fetch failed'
                });
                console.error('❌ Projects failed:', projectsResponse.reason.message);
            }

            // Handle vendors
            if (vendorsResponse.status === 'fulfilled') {
                results.push({
                    url: '/admin/vendors',
                    success: true,
                    data: vendorsResponse.value.data
                });
                console.log('🏪 Vendors loaded successfully');
            } else {
                results.push({
                    url: '/admin/vendors',
                    success: false,
                    error: vendorsResponse.reason.message || 'Vendors fetch failed'
                });
                console.error('❌ Vendors failed:', vendorsResponse.reason.message);
            }

            return results;
        } catch (error) {
            console.error('❌ Stock page data fetch failed:', error);
            throw error;
        }
    },

    // Invalidate cache
    invalidateCache(key) {
        dataCache.clear(key);
        console.log(`🗑️ Cache invalidated for ${key}`);
    },

    // Clear all cache
    clearAllCache() {
        dataCache.clear();
        console.log('🗑️ All cache cleared');
    },

    // Standard API methods (non-cached)
    post: api.post.bind(api),
    put: api.put.bind(api),
    delete: api.delete.bind(api),
    get: api.get.bind(api)
};

export default optimizedApi;
