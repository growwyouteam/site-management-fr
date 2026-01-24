import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import optimizedApi from '../../services/optimizedApi';
import { showToast } from '../../components/Toast';

const BankDetailData = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [bank, setBank] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBankDetails();
    }, [id]);

    const fetchBankDetails = async () => {
        try {
            setLoading(true);
            const response = await optimizedApi.get(`/admin/bank-details/${id}`);
            if (response.data.success) {
                setBank(response.data.data.bank);
                setTransactions(response.data.data.transactions);
            }
        } catch (error) {
            console.error('Error fetching bank details:', error);
            showToast('Failed to fetch bank details', 'error');
            navigate('/admin/bank-details');
        } finally {
            setLoading(false);
        }
    };

    const maskAccountNumber = (accNo) => {
        if (!accNo) return '';
        if (accNo.length <= 4) return accNo;
        const last4 = accNo.slice(-4);
        const masked = '*'.repeat(accNo.length - 4);
        return `${masked}${last4}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Calculate running balance (simple version, assuming initial 0 or handled elsewhere)
    // For now, just showing in/out
    const calculateTotalIn = () => {
        return transactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
    };

    const calculateTotalOut = () => {
        return transactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!bank) return null;

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/admin/bank-details')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{bank.bankName} Details</h1>
            </div>

            {/* Bank Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Account Holder</p>
                        <p className="font-semibold text-gray-900 text-lg">{bank.holderName}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Account Number</p>
                        <p className="font-mono font-semibold text-gray-900 text-lg tracking-wider">
                            {maskAccountNumber(bank.accountNumber)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">IFSC Code</p>
                        <p className="font-mono font-semibold text-gray-900 text-lg">{bank.ifscCode}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Branch</p>
                        <p className="font-semibold text-gray-900 text-lg">{bank.branch}</p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                    <p className="text-sm text-green-600 font-medium mb-1">Total Credit (In)</p>
                    <p className="text-2xl font-bold text-green-700">₹{calculateTotalIn().toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                    <p className="text-sm text-red-600 font-medium mb-1">Total Debit (Out)</p>
                    <p className="text-2xl font-bold text-red-700">₹{calculateTotalOut().toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-600 font-medium mb-1">Net Balance</p>
                    <p className="text-2xl font-bold text-blue-700">₹{(calculateTotalIn() - calculateTotalOut()).toLocaleString('en-IN')}</p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Transaction History</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 font-semibold text-gray-700">Date</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Description</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Type</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Category</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Amount</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No transactions found for this bank account.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((t) => (
                                    <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                            {formatDate(t.date)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">
                                            {t.description}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${t.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 capitalize">
                                            {t.category?.replace('_', ' ')}
                                        </td>
                                        <td className={`px-6 py-4 font-mono font-medium text-right
                                            ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'credit' ? '+' : '-'}₹{t.amount?.toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">
                                            {t.addedBy?.name || 'System'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BankDetailData;
