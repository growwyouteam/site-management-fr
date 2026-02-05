/**
 * Backend Connectivity Checker
 * Tests all admin and site manager endpoints
 */

import api from '../services/api';

const ADMIN_ENDPOINTS = [
    { method: 'GET', path: '/admin/dashboard', description: 'Admin Dashboard' },
    { method: 'GET', path: '/admin/projects', description: 'Projects List' },
    { method: 'GET', path: '/admin/expenses', description: 'Expenses List' },
    { method: 'GET', path: '/admin/stocks', description: 'Stock List' },
    { method: 'GET', path: '/admin/machines', description: 'Machines List' },
    { method: 'GET', path: '/admin/vendors', description: 'Vendors List' },
    { method: 'GET', path: '/admin/contractors', description: 'Contractors List' },
    { method: 'GET', path: '/admin/users', description: 'Users List' },
    { method: 'GET', path: '/admin/labours', description: 'Labours List' },
    { method: 'GET', path: '/admin/notifications', description: 'Notifications' },
    { method: 'GET', path: '/admin/attendance', description: 'Attendance' },
    { method: 'GET', path: '/admin/accounts', description: 'Accounts' },
    { method: 'GET', path: '/admin/reports', description: 'Reports' },
    { method: 'GET', path: '/admin/transfers', description: 'Transfers' }
];

const SITE_MANAGER_ENDPOINTS = [
    { method: 'GET', path: '/site/dashboard', description: 'Site Manager Dashboard' },
    { method: 'GET', path: '/site/projects', description: 'Assigned Projects' },
    { method: 'GET', path: '/site/labours', description: 'Labours List' },
    { method: 'GET', path: '/site/expenses', description: 'Expenses List' },
    { method: 'GET', path: '/site/stocks', description: 'Stock List' },
    { method: 'GET', path: '/site/vendors', description: 'Vendors List' },
    { method: 'GET', path: '/site/attendance', description: 'My Attendance' },
    { method: 'GET', path: '/site/labour-attendance', description: 'Labour Attendance' },
    { method: 'GET', path: '/site/transfers', description: 'Transfers' },
    { method: 'GET', path: '/site/payments', description: 'Payments' },
    { method: 'GET', path: '/site/notifications', description: 'Notifications' },
    { method: 'GET', path: '/site/profile', description: 'Profile' },
    { method: 'GET', path: '/site/daily-reports', description: 'Daily Reports' },
    { method: 'GET', path: '/site/gallery', description: 'Gallery' }
];

class BackendConnectivityChecker {
    constructor() {
        this.results = {
            admin: {},
            siteManager: {},
            summary: {
                totalAdmin: ADMIN_ENDPOINTS.length,
                totalSiteManager: SITE_MANAGER_ENDPOINTS.length,
                adminSuccess: 0,
                adminFailed: 0,
                siteManagerSuccess: 0,
                siteManagerFailed: 0
            }
        };
    }

    async checkEndpoint(endpoint, type) {
        const startTime = performance.now();

        try {
            console.log(`🔍 Testing ${type}: ${endpoint.description} (${endpoint.method} ${endpoint.path})`);

            let response;
            switch (endpoint.method) {
                case 'GET':
                    response = await api.get(endpoint.path);
                    break;
                case 'POST':
                    response = await api.post(endpoint.path, {});
                    break;
                default:
                    throw new Error(`Unsupported method: ${endpoint.method}`);
            }

            const duration = performance.now() - startTime;
            const success = response.data && response.data.success;

            const result = {
                ...endpoint,
                type,
                success,
                duration,
                timestamp: new Date().toISOString(),
                error: success ? null : (response.data?.error || 'Unknown error'),
                dataSize: success ? JSON.stringify(response.data.data || {}).length : 0
            };

            if (success) {
                console.log(`✅ ${endpoint.description} - ${duration.toFixed(2)}ms`);
                this.results.summary[`${type}Success`]++;
            } else {
                console.error(`❌ ${endpoint.description} - ${response.data?.error || 'Failed'}`);
                this.results.summary[`${type}Failed`]++;
            }

            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            console.error(`❌ ${endpoint.description} - ${error.message}`);

            this.results.summary[`${type}Failed`]++;

            return {
                ...endpoint,
                type,
                success: false,
                duration,
                timestamp: new Date().toISOString(),
                error: error.message,
                dataSize: 0
            };
        }
    }

    async checkAdminEndpoints() {
        console.log('🚀 Checking Admin Endpoints...');
        const startTime = performance.now();

        const results = await Promise.all(
            ADMIN_ENDPOINTS.map(endpoint => this.checkEndpoint(endpoint, 'admin'))
        );

        this.results.admin = results.reduce((acc, result) => {
            acc[result.path] = result;
            return acc;
        }, {});

        const duration = performance.now() - startTime;
        console.log(`⚡ Admin endpoints checked in ${duration.toFixed(2)}ms`);

        return results;
    }

    async checkSiteManagerEndpoints() {
        console.log('🚀 Checking Site Manager Endpoints...');
        const startTime = performance.now();

        const results = await Promise.all(
            SITE_MANAGER_ENDPOINTS.map(endpoint => this.checkEndpoint(endpoint, 'siteManager'))
        );

        this.results.siteManager = results.reduce((acc, result) => {
            acc[result.path] = result;
            return acc;
        }, {});

        const duration = performance.now() - startTime;
        console.log(`⚡ Site Manager endpoints checked in ${duration.toFixed(2)}ms`);

        return results;
    }

    async checkAllEndpoints() {
        console.log('🔍 Starting Full Backend Connectivity Check...');
        const overallStartTime = performance.now();

        // Check admin endpoints
        await this.checkAdminEndpoints();

        // Check site manager endpoints
        await this.checkSiteManagerEndpoints();

        const overallDuration = performance.now() - overallStartTime;

        console.log('\n📊 CONNECTIVITY SUMMARY:');
        console.log(`⏱️  Total time: ${overallDuration.toFixed(2)}ms`);
        console.log(`👨‍💼 Admin: ${this.results.summary.adminSuccess}/${this.results.summary.totalAdmin} working`);
        console.log(`👷 Site Manager: ${this.results.summary.siteManagerSuccess}/${this.results.summary.totalSiteManager} working`);
        console.log(`📈 Success rate: ${((this.results.summary.adminSuccess + this.results.summary.siteManagerSuccess) / (this.results.summary.totalAdmin + this.results.summary.totalSiteManager) * 100).toFixed(1)}%`);

        return this.results;
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.results.summary,
            failedEndpoints: {
                admin: Object.values(this.results.admin).filter(r => !r.success),
                siteManager: Object.values(this.results.siteManager).filter(r => !r.success)
            },
            slowEndpoints: {
                admin: Object.values(this.results.admin).filter(r => r.duration > 2000),
                siteManager: Object.values(this.results.siteManager).filter(r => r.duration > 2000)
            }
        };

        return report;
    }

    // Check specific component connectivity
    async checkComponent(componentName) {
        const componentEndpoints = {
            'Admin Dashboard': ['/admin/dashboard'],
            'Projects': ['/admin/projects'],
            'Expenses': ['/admin/expenses', '/admin/contractors'],
            'Stock': ['/admin/stocks', '/admin/projects', '/admin/vendors'],
            'Machines': ['/admin/machines'],
            'Vendors': ['/admin/vendors'],
            'Contractors': ['/admin/contractors'],
            'Users': ['/admin/users'],
            'Site Manager Dashboard': ['/site/dashboard'],
            'Site Projects': ['/site/projects'],
            'Site Labours': ['/site/labours'],
            'Site Expenses': ['/site/expenses']
        };

        const endpoints = componentEndpoints[componentName];
        if (!endpoints) {
            console.error(`❌ Unknown component: ${componentName}`);
            return null;
        }

        console.log(`🔍 Checking ${componentName} connectivity...`);
        const results = await Promise.all(
            endpoints.map(path => this.checkEndpoint({ method: 'GET', path, description: path }, 'component'))
        );

        return {
            component: componentName,
            success: results.every(r => r.success),
            endpoints: results,
            totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
        };
    }
}

// Create singleton instance
const connectivityChecker = new BackendConnectivityChecker();

export default connectivityChecker;
