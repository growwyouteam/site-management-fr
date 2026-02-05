import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';

const Creditors = () => {
    const [creditors, setCreditors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingCreditor, setEditingCreditor] = useState(null);
    const [viewingCreditor, setViewingCreditor] = useState(null); // For Transaction History

    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        address: ''
    });

    useEffect(() => {
        fetchCreditors();
    }, []);

    const fetchCreditors = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/creditors');
            if (response.data.success) {
                setCreditors(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching creditors:', error);
            toast.error('Failed to fetch creditors');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCreditor) {
                await api.put(`/admin/creditors/${editingCreditor._id}`, formData);
                showToast('Creditor updated successfully', 'success');
            } else {
                await api.post('/admin/creditors', formData);
                showToast('Creditor added successfully', 'success');
            }
            setShowModal(false);
            setEditingCreditor(null);
            setFormData({ name: '', mobile: '', address: '' });
            fetchCreditors();
        } catch (error) {
            console.error('Error saving creditor:', error);
            showToast(error.response?.data?.error || 'Failed to save creditor', 'error');
        }
    };

    const handleEdit = (creditor) => {
        setEditingCreditor(creditor);
        setFormData({
            name: creditor.name,
            mobile: creditor.mobile,
            address: creditor.address || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this creditor?')) {
            try {
                await api.delete(`/admin/creditors/${id}`);
                showToast('Creditor deleted successfully', 'success');
                fetchCreditors();
            } catch (error) {
                console.error('Error deleting creditor:', error);
                showToast('Failed to delete creditor', 'error');
            }
        }
    };

    const handleView = (creditor) => {
        setViewingCreditor(creditor);
    };

    // Filter creditors
    const filteredCreditors = creditors.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mobile.includes(searchQuery)
    );

    // If viewing a creditor, show the full page details view
    if (viewingCreditor) {
        return (
            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-fadeIn">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => setViewingCreditor(null)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Back to List"
                    >
                        ⬅️
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{viewingCreditor.name}</h1>
                        <p className="text-gray-500">{viewingCreditor.mobile} • {viewingCreditor.address || 'No Address'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Current Balance Due</p>
                        <p className={`text-2xl font-bold ${viewingCreditor.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{(viewingCreditor.currentBalance || 0).toLocaleString()}
                        </p>
                    </div>
                    {/* Calculate Totals */}
                    {(() => {
                        const totalCredit = (viewingCreditor.transactions || [])
                            .filter(t => t.type === 'credit')
                            .reduce((sum, t) => sum + (t.amount || 0), 0);

                        const totalDebit = (viewingCreditor.transactions || [])
                            .filter(t => t.type === 'debit')
                            .reduce((sum, t) => sum + (t.amount || 0), 0);

                        return (
                            <>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                    <p className="text-sm text-gray-500 mb-1">Total Borrowed (Credit)</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        ₹{totalCredit.toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                    <p className="text-sm text-gray-500 mb-1">Total Paid (Debit)</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        ₹{totalDebit.toLocaleString()}
                                    </p>
                                </div>
                            </>
                        );
                    })()}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-800">Transaction History</h3>
                    </div>

                    <div className="overflow-x-auto">
                        {viewingCreditor.transactions && viewingCreditor.transactions.length > 0 ? (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Type</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Source</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {[...viewingCreditor.transactions].reverse().map((t, idx) => {
                                        const isCredit = t.type === 'credit';
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-gray-600">
                                                    {new Date(t.date).toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-800">{t.description || '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isCredit
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {isCredit ? 'Credit' : 'Debit'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {t.refModel === 'VendorPayment' ? 'Vendor' :
                                                        t.refModel === 'Expense' ? 'Expense' :
                                                            t.refModel === 'ContractorPayment' ? 'Contractor' : 'Other'}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-bold ${isCredit ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {isCredit ? '+' : '-'}₹{t.amount.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-center text-gray-500">Admin</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-center text-gray-500 py-12">No transactions yet.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Credit Accounts</h1>

            {/* Top Bar: Button & Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <button
                    onClick={() => {
                        setEditingCreditor(null);
                        setFormData({ name: '', mobile: '', address: '' });
                        setShowModal(true);
                    }}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                    <span>➕</span> Add Account
                </button>

                <div className="relative flex-1 sm:max-w-md">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                        type="text"
                        placeholder="Search accounts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Creditors Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mobile</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Balance (Due)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : filteredCreditors.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No credit accounts found</td>
                                </tr>
                            ) : (
                                filteredCreditors.map((creditor) => (
                                    <tr key={creditor._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{creditor.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{creditor.mobile}</td>
                                        <td className="px-6 py-4 text-gray-600">{creditor.address || '-'}</td>
                                        <td className="px-6 py-4 text-right font-bold text-red-600">
                                            ₹{(creditor.currentBalance || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleView(creditor)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Transactions"
                                                >
                                                    👁️
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(creditor)}
                                                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(creditor._id)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">
                                {editingCreditor ? 'Edit Account' : 'Add Credit Account'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Enter name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                                <input
                                    type="text"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Enter mobile number"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Enter address"
                                    rows="3"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    {editingCreditor ? 'Update' : 'Save Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Creditors;
