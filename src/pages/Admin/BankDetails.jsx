import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import optimizedApi from '../../services/optimizedApi';
import { showToast } from '../../components/Toast';

const BankDetails = () => {
    const navigate = useNavigate();
    const [banks, setBanks] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        holderName: '',
        bankName: '',
        branch: '',
        accountNumber: '',
        ifscCode: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchBanks();
    }, []);

    const fetchBanks = async () => {
        try {
            const response = await optimizedApi.get('/admin/bank-details');
            if (response.data.success) {
                setBanks(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching bank details:', error);
            showToast('Failed to fetch bank details', 'error');
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const response = await optimizedApi.post('/admin/bank-details', formData);

            if (response.data.success) {
                showToast('Bank detail added successfully', 'success');
                setShowModal(false);
                setFormData({
                    holderName: '',
                    bankName: '',
                    branch: '',
                    accountNumber: '',
                    ifscCode: ''
                });
                fetchBanks();
            }
        } catch (error) {
            console.error('Error adding bank detail:', error);
            showToast(error.response?.data?.error || 'Failed to add bank detail', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Function to mask account number (show only last 4 digits)
    const maskAccountNumber = (accNo) => {
        if (!accNo) return '';
        if (accNo.length <= 4) return accNo;
        const last4 = accNo.slice(-4);
        const masked = '*'.repeat(accNo.length - 4);
        return `${masked}${last4}`;
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bank Details</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-md"
                >
                    <span className="text-xl font-bold">+</span>
                    Add Bank
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 font-semibold text-gray-700 w-1/5">Account Holder</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 w-1/5">Bank Name</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 w-1/5">Branch</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 w-1/5">Account No.</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 w-1/5">IFSC Code</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 w-1/12 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {banks.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No bank details found. Add your first bank account.
                                    </td>
                                </tr>
                            ) : (
                                banks.map((bank) => (
                                    <tr key={bank._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{bank.holderName}</td>
                                        <td className="px-6 py-4 text-gray-700">{bank.bankName}</td>
                                        <td className="px-6 py-4 text-gray-700">{bank.branch}</td>
                                        <td className="px-6 py-4 text-gray-700 font-mono tracking-wider">
                                            {maskAccountNumber(bank.accountNumber)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 font-mono">{bank.ifscCode}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => navigate(`/admin/bank-details/${bank._id}`)}
                                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                title="View Details"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Bank Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">Add Bank Detail</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                                <input
                                    type="text"
                                    name="holderName"
                                    value={formData.holderName}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    name="bankName"
                                    value={formData.bankName}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. HDFC Bank"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                                <input
                                    type="text"
                                    name="branch"
                                    value={formData.branch}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. MG Road Branch"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                                <input
                                    type="text"
                                    name="accountNumber"
                                    value={formData.accountNumber}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Enter full account number"
                                />
                                <p className="mt-1 text-xs text-gray-500">Only the last 4 digits will be shown publicly.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                                <input
                                    type="text"
                                    name="ifscCode"
                                    value={formData.ifscCode}
                                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase"
                                    placeholder="e.g. HDFC0001234"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                                >
                                    {isSubmitting ? (
                                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        'Add Bank'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankDetails;
