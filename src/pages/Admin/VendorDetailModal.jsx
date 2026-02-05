import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const VendorDetailModal = ({ vendor, onClose, stats, stocks }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'payments') {
            fetchPayments();
        }
    }, [activeTab]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/vendors/${vendor._id}/payments`);
            if (res.data.success) {
                setPayments(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-0 max-w-4xl w-full h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{vendor.name}</h3>
                        <p className="text-sm text-gray-500">ID: {vendor.vendorId || vendor._id}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        className={`px-6 py-3 font-medium text-sm ${activeTab === 'overview' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`px-6 py-3 font-medium text-sm ${activeTab === 'supplies' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('supplies')}
                    >
                        Supply History
                    </button>
                    <button
                        className={`px-6 py-3 font-medium text-sm ${activeTab === 'payments' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('payments')}
                    >
                        Payment History
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-900">Contact Details</h4>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-2">
                                    <div><span className="font-medium text-gray-500">Contact:</span> {vendor.contact}</div>
                                    <div><span className="font-medium text-gray-500">Email:</span> {vendor.email || 'N/A'}</div>
                                    <div><span className="font-medium text-gray-500">Address:</span> {vendor.address || 'N/A'}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-900">Financial Summary</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                        <div className="text-sm text-gray-500">Total Supplied</div>
                                        <div className="text-xl font-bold text-green-600">₹{stats.totalSupplied.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                        <div className="text-sm text-gray-500">Pending Amount</div>
                                        <div className="text-xl font-bold text-red-600">₹{stats.pendingAmount.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                        <div className="text-sm text-gray-500">Total Paid</div>
                                        <div className="text-xl font-bold text-blue-600">₹{stats.totalPaid.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                        <div className="text-sm text-gray-500">Total Items</div>
                                        <div className="text-xl font-bold text-purple-600">{stats.totalItems}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'supplies' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Material</th>
                                        <th className="px-4 py-3">Quantity</th>
                                        <th className="px-4 py-3">Price</th>
                                        <th className="px-4 py-3">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {stocks.length === 0 ? (
                                        <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No supplies found</td></tr>
                                    ) : (
                                        stocks.map((stock) => (
                                            <tr key={stock._id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">{new Date(stock.createdAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 font-medium">{stock.materialName}</td>
                                                <td className="px-4 py-3">{stock.quantity} {stock.unit}</td>
                                                <td className="px-4 py-3">₹{stock.unitPrice}</td>
                                                <td className="px-4 py-3 font-bold">₹{stock.totalPrice?.toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            {loading ? (
                                <div className="p-8 text-center text-gray-500">Loading payments...</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3">Date & Time</th>
                                            <th className="px-4 py-3">Amount</th>
                                            <th className="px-4 py-3">Mode</th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {payments.length === 0 ? (
                                            <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No payment records found</td></tr>
                                        ) : (
                                            payments.map((payment) => (
                                                <tr key={payment._id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        {new Date(payment.date).toLocaleDateString()} <span className="text-gray-400">|</span> {new Date(payment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-green-600">₹{payment.amount.toLocaleString()}</td>
                                                    <td className="px-4 py-3 capitalize">{payment.paymentMode.replace('_', ' ')}</td>
                                                    <td className="px-4 py-3">
                                                        {payment.isAdvance ? (
                                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Advance</span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">Regular</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{payment.remarks || '-'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VendorDetailModal;
