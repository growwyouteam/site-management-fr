// Simple sessionStorage helper for frontend-only demo data
const STORAGE_KEY = 'frontend_demo_data';

const readStore = () => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        return JSON.parse(raw);
    } catch (err) {
        console.error('Failed to read storage', err);
        return {};
    }
};

const writeStore = (data) => {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
        console.error('Failed to write storage', err);
    }
};

export const getCollection = (key, fallback = []) => {
    const data = readStore();
    return Array.isArray(data[key]) ? data[key] : fallback;
};

export const saveCollection = (key, items) => {
    const data = readStore();
    data[key] = items;
    writeStore(data);
};

// Get single item by id
export const findById = (key, id) => {
    const col = getCollection(key, []);
    return col.find((item) => item.id === id);
};

export const generateId = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Seed minimal demo data if absent
export const ensureSeedData = () => {
    const data = readStore();

    if (!Array.isArray(data.projects) || data.projects.length === 0) {
        data.projects = [
            {
                id: 'p-1',
                name: 'Residential Complex Phase 1',
                location: 'Mumbai, Maharashtra',
                budget: 5000000,
                startDate: '2024-01-05',
                endDate: '2024-12-31',
                status: 'Active'
            }
        ];
    }

    if (!Array.isArray(data.expenses)) data.expenses = [];
    if (!Array.isArray(data.stocks)) data.stocks = [];
    if (!Array.isArray(data.machines)) data.machines = [];

    // Admin / manager users
    if (!Array.isArray(data.users) || data.users.length === 0) {
        data.users = [
            {
                id: 'u-admin',
                name: 'Admin User',
                email: 'admin@example.com',
                role: 'admin',
                salary: 0,
                phone: '9999999999',
                dateOfJoining: '2024-01-01',
                createdAt: '2024-01-01'
            },
            {
                id: 'u-sm-1',
                name: 'Site Manager',
                email: 'manager@example.com',
                role: 'sitemanager',
                salary: 25000,
                phone: '8888888888',
                dateOfJoining: '2024-02-01',
                createdAt: '2024-02-01',
                assignedSites: ['p-1']
            }
        ];
    }

    if (!Array.isArray(data.vendors)) data.vendors = [];
    if (!Array.isArray(data.notifications)) data.notifications = [];

    if (!Array.isArray(data.labours)) {
        data.labours = [
            {
                id: 'l-1',
                name: 'Ravi',
                designation: 'Helper',
                dailyWage: 800,
                assignedSite: 'p-1'
            }
        ];
    }

    if (!Array.isArray(data.transfers)) data.transfers = [];
    if (!Array.isArray(data.attendanceAdmin)) data.attendanceAdmin = [];
    if (!Array.isArray(data.attendanceSite)) data.attendanceSite = [];
    if (!Array.isArray(data.labourAttendances)) data.labourAttendances = [];
    if (!Array.isArray(data.bankTransactions)) data.bankTransactions = [];
    if (!Array.isArray(data.cashTransactions)) data.cashTransactions = [];
    if (!Array.isArray(data.payments)) data.payments = [];
    if (!Array.isArray(data.gallery)) data.gallery = [];
    if (!Array.isArray(data.dailyReports)) data.dailyReports = [];
    if (!Array.isArray(data.contractors)) data.contractors = [];
    if (!Array.isArray(data.contractorPayments)) data.contractorPayments = [];
    if (!data.accounts) {
        data.accounts = { capital: 1000000 };
    }

    writeStore(data);
};
