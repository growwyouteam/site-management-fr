import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';
import { showToast } from '../../components/Toast';

const SMContractors = () => {
    const { user } = useAuth();
    const { selectedProject } = useSiteManager();
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        address: '',
        distanceValue: '',
        distanceUnit: 'km',
        expensePerUnit: '',
        assignedProjectId: ''
    });

    // Details Modal State
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedContractor, setSelectedContractor] = useState(null);
    const [detailsData, setDetailsData] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [activeTab, setActiveTab] = useState('machines'); // 'machines' or 'payments'

    useEffect(() => {
        if (selectedProject) {
            setFormData(prev => ({ ...prev, assignedProjectId: selectedProject._id }));
        }
        fetchContractors();
    }, [selectedProject]);

    const fetchContractors = async () => {
        try {
            const response = await api.get('/site/site-contractors');
            if (response.data.success) {
                setContractors(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching contractors:', error);
            showToast('Failed to fetch contractors', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchContractorDetails = async (id) => {
        setLoadingDetails(true);
        try {
            const projectId = selectedProject ? selectedProject._id : '';
            const response = await api.get(`/site/contractors/${id}/details?projectId=${projectId}`);
            if (response.data.success) {
                setDetailsData(response.data.data);
                setShowDetailsModal(true);
            }
        } catch (error) {
            showToast('Failed to load details', 'error');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const payload = {
                ...formData,
                assignedProjectId: selectedProject?._id // Ensure current project is used
            };

            if (!payload.assignedProjectId) {
                showToast('Please select a project first', 'error');
                return;
            }

            const response = await api.post('/site/contractors', payload);
            if (response.data.success) {
                showToast(response.data.message, 'success');
                setShowAddModal(false);
                setFormData({
                    name: '', mobile: '', address: '',
                    distanceValue: '', distanceUnit: 'km', expensePerUnit: '',
                    assignedProjectId: selectedProject?._id
                });
                fetchContractors();
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to add contractor', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading contractors...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Has Assigned Contractors</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    + Add New Contractor
                </button>
            </div>

            {contractors.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                    No contractors found assigned to your projects.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contractors.map(contractor => (
                        <div key={contractor._id} className="bg-white rounded-lg shadow p-6 border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{contractor.name}</h3>
                                    <p className="text-sm text-gray-500">{contractor.mobile}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${contractor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {contractor.status}
                                </span>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                                <p>Address: <span className="text-gray-900">{contractor.address || 'N/A'}</span></p>
                                <p>Distance: <span className="text-gray-900">{contractor.distanceValue ? `${contractor.distanceValue} ${contractor.distanceUnit}` : 'N/A'}</span></p>
                            </div>
                            <button
                                onClick={() => { setSelectedContractor(contractor); fetchContractorDetails(contractor._id); }}
                                className="w-full py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium transition-colors"
                            >
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Add New Contractor</h2>
                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input required type="text" className="w-full border rounded p-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                                <input required type="tel" className="w-full border rounded p-2" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea className="w-full border rounded p-2" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Distance Value</label>
                                    <input type="number" className="w-full border rounded p-2" value={formData.distanceValue} onChange={e => setFormData({ ...formData, distanceValue: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                    <select className="w-full border rounded p-2" value={formData.distanceUnit} onChange={e => setFormData({ ...formData, distanceUnit: e.target.value })}>
                                        <option value="km">KM</option>
                                        <option value="miles">Miles</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                                    {isSubmitting ? 'Adding...' : 'Add Contractor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && detailsData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h1 className="text-xl font-bold text-gray-800">{detailsData.contractor.name}</h1>
                                <p className="text-sm text-gray-500">Details for project: {selectedProject?.name || 'All'}</p>
                            </div>
                            <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>

                        <div className="flex border-b border-gray-200">
                            <button
                                className={`flex-1 py-3 font-medium text-sm ${activeTab === 'machines' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTab('machines')}
                            >
                                Rented Machines ({detailsData.machines.length})
                            </button>
                            <button
                                className={`flex-1 py-3 font-medium text-sm ${activeTab === 'payments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTab('payments')}
                            >
                                Payment History ({detailsData.payments.length})
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {activeTab === 'machines' && (
                                <div className="space-y-4">
                                    {detailsData.machines.length > 0 ? detailsData.machines.map(machine => (
                                        <div key={machine._id} className="bg-white p-4 rounded border border-gray-200 flex justify-between items-center">
                                            <div>
                                                <h4 className="font-bold text-gray-800">{machine.name}</h4>
                                                <p className="text-sm text-gray-500">{machine.plateNumber}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-blue-600">₹{machine.assignedRentalPerDay}/{machine.rentalType === 'perHour' ? 'hr' : 'day'}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${machine.status === 'in-use' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {machine.status}
                                                </span>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-center text-gray-500 italic py-8">No machines rented from this contractor for this project.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'payments' && (
                                <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-600">Date</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-600">Amount</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-600">Mode</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-600">Paid By</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {detailsData.payments.length > 0 ? detailsData.payments.map((payment, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3">{new Date(payment.date).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 font-bold text-green-700">₹{payment.amount}</td>
                                                    <td className="px-4 py-3 capitalize">{payment.paymentMode}</td>
                                                    <td className="px-4 py-3">{payment.paidBy?.name || 'N/A'}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500 italic">No payments found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SMContractors;
