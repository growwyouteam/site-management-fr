import { useState, useEffect } from 'react';
import optimizedApi from '../../services/optimizedApi';
import { showToast } from '../../components/Toast';
import VendorDetailModal from './VendorDetailModal';
import ContractorDetailModal from './ContractorDetailModal';

const Payments = () => {
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [managers, setManagers] = useState([]);
    const [stocks, setStocks] = useState([]); // Needed for Vendor stats
    const [machines, setMachines] = useState([]); // Needed for Contractor stats
    const [banks, setBanks] = useState([]);

    // Filter States
    const [filters, setFilters] = useState({
        type: 'all', // all, vendor, contractor, manager
        entityId: '',
        startDate: '',
        endDate: '',
        search: ''
    });

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalData, setModalData] = useState({
        paymentType: 'vendor', // vendor, contractor, manager
        entityId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        paymentMode: 'cash',
        remarks: '',
        isAdvance: false,
        slip: null,
        bankId: ''
    });

    // Detail Modal States
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [selectedContractor, setSelectedContractor] = useState(null);

    const [contractorStats, setContractorStats] = useState({});
    const [creditors, setCreditors] = useState([]);

    useEffect(() => {
        fetchInitialData();
        fetchCreditors();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [transactions, filters]);

    useEffect(() => {
        if (contractors.length > 0 && machines.length > 0) {
            calculateContractorStats();
        }
    }, [contractors, machines]);

    const fetchInitialData = async () => {
        try {
            const results = await Promise.allSettled([
                optimizedApi.get('/admin/accounts'),
                optimizedApi.get('/admin/vendors'),
                optimizedApi.get('/admin/contractors'),
                optimizedApi.get('/admin/users'),
                optimizedApi.get('/admin/stocks'),
                optimizedApi.get('/admin/machines'),
                optimizedApi.get('/admin/bank-details')
            ]);

            const [accountsRes, vendorsRes, contractorsRes, usersRes, stocksRes, machinesRes, banksRes] = results;

            if (accountsRes.status === 'fulfilled' && accountsRes.value.data.success) {
                setTransactions(accountsRes.value.data.data.transactions || []);
            }
            if (vendorsRes.status === 'fulfilled' && vendorsRes.value.data.success) setVendors(vendorsRes.value.data.data);
            if (contractorsRes.status === 'fulfilled' && contractorsRes.value.data.success) setContractors(contractorsRes.value.data.data);
            if (usersRes.status === 'fulfilled' && usersRes.value.data.success) setManagers(usersRes.value.data.data.filter(u => u.role === 'sitemanager'));
            if (stocksRes.status === 'fulfilled' && stocksRes.value.data.success) setStocks(stocksRes.value.data.data);
            if (machinesRes.status === 'fulfilled' && machinesRes.value.data.success) setMachines(machinesRes.value.data.data);
            if (banksRes.status === 'fulfilled' && banksRes.value.data.success) setBanks(banksRes.value.data.data);

            // Log any failed requests
            results.forEach((result, index) => {
                const endpoints = ['accounts', 'vendors', 'contractors', 'users', 'stocks', 'machines', 'bank-details'];
                if (result.status === 'rejected') {
                    console.error(`Failed to fetch ${endpoints[index]}:`, result.reason);
                }
            });

        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('Failed to load some payment data', 'error');
        }
    };

    // --- Stats Calculations ---

    const getVendorStats = (vendor) => {
        const vendorStocks = stocks.filter(s => {
            if (!s.vendorId) return false;
            if (typeof s.vendorId === 'object' && s.vendorId._id) return s.vendorId._id === vendor._id;
            return s.vendorId === vendor._id || s.vendorId.toString() === vendor._id;
        });

        const totalItems = vendorStocks.length;
        const recentSupplies = vendorStocks.filter(s => {
            const supplyDate = new Date(s.createdAt);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return supplyDate > thirtyDaysAgo;
        }).length;

        return {
            totalSupplied: vendor.totalSupplied || 0,
            pendingAmount: vendor.pendingAmount || 0,
            totalPaid: (vendor.totalSupplied || 0) - (vendor.pendingAmount || 0),
            totalItems,
            recentSupplies
        };
    };

    const calculateContractorStats = async () => {
        const stats = {};

        // Initial calculation with available data (Payable)
        for (const contractor of contractors) {
            const totalPayable = (contractor.distanceValue || 0) * (contractor.expensePerUnit || 0);
            stats[contractor._id] = {
                totalPayable,
                totalPaid: 0,
                pendingAmount: totalPayable,
                rentedMachinesCount: machines.filter(m => m.assignedToContractor === contractor._id && m.assignedAsRental).length
            };
        }
        setContractorStats(stats);

        // Fetch payments if in contractor view to get accurate "Total Paid"
        // We do this progressively to avoid blocking UI
        if (filters.type === 'contractor') {
            // Promise.all might be heavy but let's try batching or just fire and forget state updates
            contractors.forEach(c => {
                optimizedApi.get(`/admin/contractors/${c._id}/payments`).then(res => {
                    if (res.data.success) {
                        const payments = res.data.data;
                        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

                        setContractorStats(prev => {
                            // Re-read current stats to avoid stale closure issues if needed, 
                            // but functional update is safe for object merge if we are careful.
                            // Actually we need to recalculate pending based on current payable.
                            const currentStat = prev[c._id] || {};
                            const totalPayable = currentStat.totalPayable || ((c.distanceValue || 0) * (c.expensePerUnit || 0));

                            return {
                                ...prev,
                                [c._id]: {
                                    ...currentStat,
                                    totalPaid,
                                    pendingAmount: Math.max(0, totalPayable - totalPaid)
                                }
                            };
                        });
                    }
                }).catch(err => console.error(err));
            });
        }
    };

    useEffect(() => {
        if (filters.type === 'contractor') {
            calculateContractorStats();
        }
    }, [filters.type]);


    const applyFilters = () => {
        let result = [...transactions];

        if (filters.type !== 'all') {
            const typeMap = {
                'vendor': 'vendor_payment',
                'contractor': 'contractor_payment',
                'manager': 'wallet_allocation',
                'creditor': 'creditor_payment'
            };
            const targetCategory = typeMap[filters.type];
            if (targetCategory) {
                result = result.filter(t => t.category === targetCategory);
            }
        } else {
            const paymentCategories = ['vendor_payment', 'contractor_payment', 'wallet_allocation', 'labour_payment', 'creditor_payment'];
            result = result.filter(t => paymentCategories.includes(t.category));
        }

        if (filters.entityId) {
            let entityName = '';
            if (filters.type === 'vendor') entityName = vendors.find(v => v._id === filters.entityId)?.name;
            if (filters.type === 'contractor') entityName = contractors.find(c => c._id === filters.entityId)?.name;
            if (filters.type === 'manager') entityName = managers.find(m => m._id === filters.entityId)?.name;

            if (entityName) {
                result = result.filter(t => t.description.toLowerCase().includes(entityName.toLowerCase()));
            }
        }

        if (filters.startDate) {
            result = result.filter(t => new Date(t.date) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter(t => new Date(t.date) <= end);
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(t =>
                t.description.toLowerCase().includes(searchLower) ||
                t.category.toLowerCase().includes(searchLower) ||
                String(t.amount).includes(searchLower)
            );
        }

        setFilteredTransactions(result);
    };

    const fetchCreditors = async () => {
        try {
            console.log('🔍 Fetching creditors in Payments component...');
            const response = await optimizedApi.get('/admin/creditors');
            console.log('📦 Creditors response:', response.data);
            if (response.data.success) {
                console.log('✅ Setting creditors:', response.data.data);
                setCreditors(response.data.data);
            } else {
                console.log('❌ Response not successful:', response.data);
            }
        } catch (error) {
            console.error('❌ Error fetching creditors:', error);
        }
    };

    // Helper to get creditor stats (balance) if needed
    const getCreditorStats = (creditor) => {
        return {
            balance: creditor.currentBalance || 0
        };
    };

    const handleModalSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('amount', modalData.amount);
            formData.append('paymentMode', modalData.paymentMode);
            formData.append('remarks', modalData.remarks);
            const fullDate = new Date(`${modalData.date}T${modalData.time}`);
            formData.append('date', fullDate.toISOString());
            if (modalData.bankId) {
                formData.append('bankId', modalData.bankId);
            }
            if (modalData.creditorId) {
                formData.append('creditorId', modalData.creditorId);
            }

            if (modalData.slip) {
                formData.append(modalData.paymentType === 'vendor' ? 'receipt' : 'file', modalData.slip);
            }

            let endpoint = '';

            if (modalData.paymentType === 'vendor') {
                endpoint = '/admin/vendors/payment';
                formData.append('vendorId', modalData.entityId);
                formData.append('isAdvance', modalData.isAdvance);
                await optimizedApi.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

            } else if (modalData.paymentType === 'contractor') {
                endpoint = '/admin/contractors/payments';
                const payload = {
                    contractorId: modalData.entityId,
                    amount: modalData.amount,
                    paymentMode: modalData.paymentMode,
                    date: fullDate.toISOString(),
                    remarks: modalData.remarks,
                    date: fullDate.toISOString(),
                    remarks: modalData.remarks,
                    bankId: modalData.bankId || undefined,
                    creditorId: modalData.creditorId || undefined
                };
                await optimizedApi.post(endpoint, payload);

            } else if (modalData.paymentType === 'manager') {
                endpoint = '/admin/accounts/allocate';
                const payload = {
                    managerId: modalData.entityId,
                    amount: modalData.amount,
                    description: modalData.remarks,
                    paymentMode: modalData.paymentMode,
                    bankId: modalData.bankId || undefined
                };
                await optimizedApi.post(endpoint, payload);
            } else if (modalData.paymentType === 'manager') {
                endpoint = '/admin/accounts/allocate';
                const payload = {
                    managerId: modalData.entityId,
                    amount: modalData.amount,
                    description: modalData.remarks,
                    paymentMode: modalData.paymentMode,
                    bankId: modalData.bankId || undefined
                };
                await optimizedApi.post(endpoint, payload);
            } else if (modalData.paymentType === 'creditor') {
                endpoint = '/admin/creditors/payment';
                const payload = {
                    creditorId: modalData.entityId, // Target Creditor
                    sourceCreditorId: (modalData.paymentMode === 'cash' || modalData.paymentMode === 'credit') ? modalData.creditorId : undefined, // Source Creditor (if any)
                    amount: modalData.amount,
                    date: fullDate.toISOString(),
                    paymentMode: modalData.paymentMode,
                    remarks: modalData.remarks,
                    bankId: modalData.bankId || undefined
                };
                await optimizedApi.post(endpoint, payload);
            }

            showToast('Payment recorded successfully', 'success');
            finishSubmit();

        } catch (error) {
            console.error('Payment Error:', error);
            showToast(error.response?.data?.error || 'Failed to record payment', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const finishSubmit = () => {
        setShowModal(false);
        setModalData({
            paymentType: 'vendor',
            entityId: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
            paymentMode: 'cash',
            remarks: '',
            isAdvance: false,
            slip: null,
            bankId: ''
        });
        fetchInitialData();
    };

    const getEntityList = () => {
        switch (modalData.paymentType) {
            case 'vendor': return vendors;
            case 'contractor': return contractors;
            case 'manager': return managers;
            case 'manager': return managers;
            case 'creditor': return creditors;
            default: return [];
        }
    };

    const openPaymentModal = (type, entity) => {
        setModalData(prev => ({
            ...prev,
            paymentType: type,
            entityId: entity._id
        }));
        setShowModal(true);
    };

    const handleDelete = async (transaction) => {
        if (!confirm('Are you sure you want to delete this entry?')) return;

        try {
            let endpoint = '';
            const { _id, refModel } = transaction;

            if (refModel === 'Transaction') endpoint = `/admin/accounts/transaction/${_id}`;
            else if (refModel === 'VendorPayment') endpoint = `/admin/vendors/payments/${_id}`;
            else if (refModel === 'ContractorPayment') endpoint = `/admin/contractors/payments/${_id}`;
            else if (refModel === 'Expense') endpoint = `/admin/expenses/${_id}`;
            else {
                // Determine by category if refModel is missing (fallback)
                return showToast('Deletion not supported for this entry type', 'error');
            }

            const res = await optimizedApi.delete(endpoint);
            if (res.data.success) {
                showToast('Entry deleted successfully', 'success');
                fetchInitialData();
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast(error.response?.data?.error || 'Failed to delete entry', 'error');
        }
    };

    const renderVendorTable = () => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vendor ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Items</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Recent Supplies</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Supplied</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Pending Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {vendors.length === 0 ? (
                        <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500">No vendors found</td></tr>
                    ) : (
                        vendors.map(v => {
                            const stats = getVendorStats(v);
                            return (
                                <tr key={v._id} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-sm">{v._id?.slice(-8)}</td>
                                    <td className="px-4 py-3 font-medium">{v.name}</td>
                                    <td className="px-4 py-3">{v.contact}</td>
                                    <td className="px-4 py-3 text-blue-600 font-bold">{stats.totalItems}</td>
                                    <td className="px-4 py-3 text-purple-600 font-bold">{stats.recentSupplies}</td>
                                    <td className="px-4 py-3 text-green-600 font-bold">₹{stats.totalSupplied.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-red-600 font-bold">₹{stats.pendingAmount.toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedVendor(v)}
                                                className="px-3 py-1.5 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                                                title="View Details"
                                            >
                                                👁️
                                            </button>
                                            <button
                                                onClick={() => openPaymentModal('vendor', v)}
                                                className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                                title="Record Payment"
                                            >
                                                💰
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );

    const renderContractorTable = () => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Assigned Project(s)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Address</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Distance</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Expense</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Payable</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Paid</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Pending</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {contractors.length === 0 ? (
                        <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-500">No contractors found</td></tr>
                    ) : (
                        contractors.map(c => {
                            const stats = contractorStats[c._id] || { totalPayable: 0, totalPaid: 0, pendingAmount: 0 };
                            return (
                                <tr key={c._id} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{c.name}</td>
                                    <td className="px-4 py-3">{c.assignedProjects?.map(p => p.name).join(', ') || '-'}</td>
                                    <td className="px-4 py-3">{c.address}</td>
                                    <td className="px-4 py-3">{c.distanceValue} {c.distanceUnit}</td>
                                    <td className="px-4 py-3">₹{c.expensePerUnit}/{c.distanceUnit}</td>
                                    <td className="px-4 py-3 text-blue-600 font-semibold">₹{stats.totalPayable.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-green-600 font-semibold">₹{stats.totalPaid.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-red-600 font-semibold">₹{stats.pendingAmount.toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedContractor(c)}
                                                className="px-3 py-1.5 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                                                title="View Details"
                                            >
                                                👁️
                                            </button>
                                            <button
                                                onClick={() => openPaymentModal('contractor', c)}
                                                className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                                title="Payment"
                                            >
                                                💰
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );

    const renderTransactionsTable = () => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid By</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                    No payment records found
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.map((t, index) => (
                                <tr key={`${t.id || index}`} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <div>{new Date(t.date).toLocaleDateString()}</div>
                                        <div className="text-xs text-gray-500">{new Date(t.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {t.description}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                        {t.category ? t.category.replace('_', ' ') : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                        {t.paymentMode}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                        ₹{t.amount?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {t.source || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleDelete(t)}
                                            className="text-red-600 hover:text-red-900 transition-colors p-2 rounded-full hover:bg-red-50"
                                            title="Delete Entry"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payments</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                >
                    <span>➕</span> Record Payment
                </button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Filter Type</label>
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value, entityId: '' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Transactions</option>
                            <option value="vendor">Vendor List</option>
                            <option value="contractor">Contractor List</option>
                            <option value="manager">Manager Allocations</option>
                        </select>
                    </div>

                    {filters.type === 'manager' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Select Manager</label>
                            <select
                                value={filters.entityId}
                                onChange={(e) => setFilters({ ...filters, entityId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Managers</option>
                                {managers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className={filters.type === 'manager' ? '' : 'md:col-span-2'}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {filters.type === 'vendor' ? renderVendorTable() :
                filters.type === 'contractor' ? renderContractorTable() :
                    renderTransactionsTable()}

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h2 className="text-xl font-bold text-gray-800">Record Payment</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 font-bold text-xl">&times;</button>
                        </div>

                        <form onSubmit={handleModalSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                                        <select
                                            value={modalData.paymentType}
                                            onChange={(e) => setModalData({ ...modalData, paymentType: e.target.value, entityId: '' })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="vendor">Vendor</option>
                                            <option value="contractor">Contractor</option>
                                            <option value="manager">Project Manager</option>
                                            <option value="creditor">Creditor</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Name</label>
                                        <select
                                            required
                                            value={modalData.entityId}
                                            onChange={(e) => {
                                                const selectedId = e.target.value;
                                                let pendingAmount = '';

                                                // Auto-fill amount based on entity type
                                                if (modalData.paymentType === 'vendor') {
                                                    const vendor = vendors.find(v => v._id === selectedId);
                                                    if (vendor) {
                                                        pendingAmount = vendor.pendingAmount || 0;
                                                    }
                                                } else if (modalData.paymentType === 'contractor') {
                                                    const contractor = contractors.find(c => c._id === selectedId);
                                                    const stats = contractorStats[selectedId];
                                                    if (stats) {
                                                        pendingAmount = stats.pendingAmount || 0;
                                                    } else if (contractor) {
                                                        // Fallback calculation
                                                        const totalPayable = (contractor.distanceValue || 0) * (contractor.expensePerUnit || 0);
                                                        pendingAmount = totalPayable;
                                                    }
                                                }

                                                setModalData({
                                                    ...modalData,
                                                    entityId: selectedId,
                                                    amount: pendingAmount.toString()
                                                });
                                            }}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="">Select {modalData.paymentType}</option>
                                            {getEntityList().map(item => (
                                                <option key={item._id} value={item._id}>{item.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={modalData.amount}
                                            onChange={(e) => setModalData({ ...modalData, amount: e.target.value })}
                                            className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                                    <select
                                        value={modalData.paymentMode}
                                        onChange={(e) => setModalData({ ...modalData, paymentMode: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="cash">💵 Cash</option>
                                        <option value="online">🌐 Online / UPI</option>
                                        <option value="check">🏦 Check</option>
                                        <option value="bank">🏛️ Bank Transfer</option>
                                    </select>
                                </div>

                                {['bank', 'online', 'check'].includes(modalData.paymentMode) && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Bank Account</label>
                                        <select
                                            required
                                            value={modalData.bankId}
                                            onChange={(e) => setModalData({ ...modalData, bankId: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="">-- Select Bank Account --</option>
                                            {banks.map(bank => (
                                                <option key={bank._id} value={bank._id}>
                                                    {bank.bankName} - {bank.holderName} ({bank.accountNumber?.slice(-4)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {modalData.paymentMode === 'cash' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Creditor (Optional)</label>
                                        <select
                                            value={modalData.creditorId || ''}
                                            onChange={(e) => setModalData({ ...modalData, creditorId: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="">-- Select Creditor (Optional) --</option>
                                            {creditors.map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={modalData.date}
                                        onChange={(e) => setModalData({ ...modalData, date: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                                    <input
                                        type="time"
                                        required
                                        value={modalData.time}
                                        onChange={(e) => setModalData({ ...modalData, time: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                                    <textarea
                                        rows="3"
                                        value={modalData.remarks}
                                        onChange={(e) => setModalData({ ...modalData, remarks: e.target.value })}
                                        placeholder="Optional notes..."
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    ></textarea>
                                </div>

                                <div className="md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Slip</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => setModalData({ ...modalData, slip: e.target.files[0] })}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            disabled={modalData.paymentType !== 'vendor'}
                                        />
                                        <div className="text-gray-500">
                                            {modalData.slip ? (
                                                <span className="text-green-600 font-medium truncate block">{modalData.slip.name}</span>
                                            ) : (
                                                modalData.paymentType === 'vendor' ? (
                                                    <>
                                                        <div className="text-2xl mb-1">📎</div>
                                                        <span className="text-xs">Click to upload slip</span>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Upload not available for this type</span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-1 flex items-center">
                                    {modalData.paymentType === 'vendor' && (
                                        <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg w-full hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={modalData.isAdvance}
                                                onChange={(e) => setModalData({ ...modalData, isAdvance: e.target.checked })}
                                                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                            />
                                            <div>
                                                <span className="block font-medium text-gray-900">Mark as Advance</span>
                                                <span className="block text-xs text-gray-500">Payment made before supply</span>
                                            </div>
                                        </label>
                                    )}
                                </div>

                            </div>

                            <div className="mt-8 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Processing...' : 'Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedVendor && (
                <VendorDetailModal
                    vendor={selectedVendor}
                    onClose={() => setSelectedVendor(null)}
                    stats={getVendorStats(selectedVendor)}
                    stocks={stocks.filter(s =>
                        typeof s.vendorId === 'object' ? s.vendorId._id === selectedVendor._id : s.vendorId === selectedVendor._id
                    )}
                />
            )}

            {selectedContractor && (
                <ContractorDetailModal
                    contractor={selectedContractor}
                    onClose={() => setSelectedContractor(null)}
                    assignedMachines={machines.filter(m => m.assignedToContractor === selectedContractor._id && m.assignedAsRental)}
                />
            )}

        </div>
    );
};

export default Payments;
