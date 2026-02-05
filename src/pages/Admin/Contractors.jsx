
import { useState, useEffect } from 'react';
import { showToast } from '../../components/Toast';
import api from '../../services/api';

const Contractors = () => {
    const [contractorPayments, setContractorPayments] = useState([]);
    const [assignedMachines, setAssignedMachines] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingContractor, setEditingContractor] = useState(null);
    const [activeModal, setActiveModal] = useState(null); // 'details', 'payment', null
    const [selectedContractor, setSelectedContractor] = useState(null);
    const [contractorStats, setContractorStats] = useState({});
    const [projects, setProjects] = useState([]);
    const [machines, setMachines] = useState([]); // Added
    const [banks, setBanks] = useState([]);
    const [creditors, setCreditors] = useState([]); // Added
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        address: '',
        distanceValue: '',
        distanceUnit: 'km',
        expensePerUnit: '',
        assignedProjectId: '',
        status: 'pending'
    });
    const [paymentData, setPaymentData] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        remark: '',
        machineRent: 0,
        deductRent: false,
        paymentMode: 'cash',
        bankId: '',
        creditorId: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    const [selectedCreditor, setSelectedCreditor] = useState(''); // Added

    useEffect(() => {
        fetchContractors();
        fetchProjects();
        fetchMachines(); // Added
        fetchBanks();
        fetchCreditors(); // Added
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/admin/projects');
            if (response.data.success) {
                setProjects(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const fetchMachines = async () => { // Added
        try {
            const response = await api.get('/admin/machines');
            if (response.data.success) {
                setMachines(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching machines:', error);
        }
    };

    const fetchContractors = async () => {
        try {
            console.log('🔄 Fetching contractors data...');
            const response = await api.get('/admin/contractors');
            if (response.data.success) {
                const contractorsData = response.data.data;
                console.log('✅ Contractors loaded:', contractorsData.length);
                setContractors(contractorsData);

                // Fetch machines once for all contractors (optimization)
                const machinesRes = await api.get('/admin/machines');
                const allMachines = machinesRes.data.success ? machinesRes.data.data : [];

                // Calculate stats for each contractor
                const statsPromises = contractorsData.map(async (contractor) => {
                    // Fetch payments for this contractor
                    const paymentsRes = await api.get(`/admin/contractors/${contractor._id}/payments`);
                    const payments = paymentsRes.data.success ? paymentsRes.data.data : [];

                    // Filter machines for this contractor from the already-fetched list
                    const rentedMachines = allMachines.filter(m => m.assignedToContractor === contractor._id && m.assignedAsRental);

                    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
                    const totalRentCost = rentedMachines.reduce((sum, m) => sum + (m.assignedRentalPerDay || 0), 0);
                    const rentPayments = payments.filter(p => p.rentDeducted).reduce((sum, p) => sum + (p.machineRent || 0), 0);

                    // New Calculation Logic
                    const totalPayable = (contractor.distanceValue || 0) * (contractor.expensePerUnit || 0);
                    const pendingAmount = Math.max(0, totalPayable - totalPaid);
                    const advancePayment = totalPaid > totalPayable ? (totalPaid - totalPayable) : 0;

                    console.log(`🔍 Contractor ${contractor.name}:`);
                    console.log(`  - Total Payable: ₹${totalPayable}`);
                    console.log(`  - Total Paid: ₹${totalPaid}`);
                    console.log(`  - Pending Amount: ₹${pendingAmount}`);
                    console.log(`  - Advance Payment: ₹${advancePayment}`);

                    return {
                        contractorId: contractor._id,
                        totalPaid,
                        totalPayable,
                        pendingAmount,
                        advancePayment,
                        rentedMachinesCount: rentedMachines.length
                    };
                });

                const stats = await Promise.all(statsPromises);
                const statsMap = stats.reduce((acc, stat) => {
                    acc[stat.contractorId] = stat;
                    return acc;
                }, {});

                setContractorStats(statsMap);
            }
        } catch (error) {
            showToast('Failed to fetch contractors', 'error');
            console.error('Error fetching contractors:', error);
        }
    };

    const fetchBanks = async () => {
        try {
            const response = await api.get('/admin/bank-details');
            if (response.data.success) {
                setBanks(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching banks:', error);
        }
    };

    const fetchCreditors = async () => { // Added
        try {
            const response = await api.get('/admin/creditors');
            if (response.data.success) {
                setCreditors(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching creditors:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const contractorData = {
                ...formData,
                distanceValue: Number(formData.distanceValue),
                expensePerUnit: Number(formData.expensePerUnit),
                assignedProjects: formData.assignedProjectId ? [formData.assignedProjectId] : []
            };

            if (editingContractor) {
                const response = await api.put(`/admin/contractors/${editingContractor._id}`, contractorData);
                if (response.data.success) {
                    showToast('Contractor updated successfully', 'success');
                }
            } else {
                const response = await api.post('/admin/contractors', contractorData);
                if (response.data.success) {
                    showToast('Contractor created successfully', 'success');
                }
            }

            resetForm();
            fetchContractors();
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to save contractor', 'error');
            console.error('Error saving contractor:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (contractor) => {
        setEditingContractor(contractor);
        setFormData({
            name: contractor.name,
            mobile: contractor.mobile,
            address: contractor.address,
            distanceValue: contractor.distanceValue,
            distanceUnit: contractor.distanceUnit,
            expensePerUnit: contractor.expensePerUnit,
            assignedProjectId: contractor.assignedProjects?.[0]?._id || ''
        });
        setShowForm(true);
    };

    const handleStatusToggle = async (contractor) => {
        const newStatus = contractor.status === 'active' ? 'inactive' : 'active';
        try {
            const response = await api.put(`/admin/contractors/${contractor._id}`, {
                ...contractor,
                assignedProjects: contractor.assignedProjects?.map(p => p._id), // extract IDs
                status: newStatus
            });
            if (response.data.success) {
                showToast(`Contractor is now ${newStatus}`, 'success');
                fetchContractors();
            }
        } catch (error) {
            showToast('Failed to update status', 'error');
            console.error('Error updating status:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this contractor?')) return;
        try {
            const response = await api.delete(`/admin/contractors/${id}`);
            if (response.data.success) {
                showToast('Contractor deleted', 'success');
                fetchContractors();
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to delete contractor', 'error');
            console.error('Error deleting contractor:', error);
        }
    };

    const handlePayment = async (contractor) => {
        setSelectedContractor(contractor);
        const machineRent = await calculateMachineRent(contractor);
        setPaymentData({
            date: new Date().toISOString().split('T')[0],
            amount: '',
            remark: '',
            machineRent,
            deductRent: false,
            paymentMode: 'cash',
            bankId: '',
            creditorId: ''
        });
        setSelectedBank('');
        setSelectedCreditor('');
        setActiveModal('payment');
    };

    const calculateMachineRent = async (contractor) => {
        try {
            const response = await api.get('/admin/machines');
            if (response.data.success) {
                const machines = response.data.data;
                const assignedMachines = machines.filter(m =>
                    m.assignedToContractor === contractor._id && m.assignedAsRental
                );
                return assignedMachines.reduce((total, m) => total + (m.assignedRentalPerDay || 0), 0);
            }
        } catch (error) {
            console.error('Error calculating machine rent:', error);
        }
        return 0;
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            let finalAmount = Number(paymentData.amount);
            if (paymentData.deductRent) {
                finalAmount = finalAmount - paymentData.machineRent;
            }

            const payment = {
                contractorId: selectedContractor._id,
                contractorName: selectedContractor.name,
                date: paymentData.date,
                amount: finalAmount,
                paymentMode: paymentData.paymentMode,
                remark: paymentData.remark,
                machineRent: paymentData.machineRent,
                rentDeducted: paymentData.deductRent,
                bankId: selectedBank,
                creditorId: selectedCreditor
            };

            const response = await api.post('/admin/contractors/payments', payment);
            if (response.data.success) {
                showToast('Payment recorded successfully', 'success');
                setActiveModal(null);
                setSelectedContractor(null);
                setPaymentData({ date: new Date().toISOString().split('T')[0], amount: '', remark: '', machineRent: 0, deductRent: false, paymentMode: 'cash' });
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to record payment', 'error');
            console.error('Error recording payment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingContractor(null);
        setFormData({
            name: '',
            mobile: '',
            address: '',
            distanceValue: '',
            distanceUnit: 'km',
            expensePerUnit: '',
            assignedProjectId: ''
        });
    };

    const fetchContractorPayments = async (contractorId) => {
        try {
            const response = await api.get(`/admin/contractors/${contractorId}/payments`);
            if (response.data.success) {
                setContractorPayments(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            setContractorPayments([]);
        }
    };

    const handleViewContractor = async (contractor) => {
        setSelectedContractor(contractor);
        setActiveModal('details');
        await Promise.all([
            fetchContractorPayments(contractor._id),
            fetchAssignedMachines(contractor._id)
        ]);
    };

    const fetchAssignedMachines = async (contractorId) => {
        try {
            const response = await api.get('/admin/machines');
            if (response.data.success) {
                const machines = response.data.data;
                const assigned = machines.filter(m =>
                    m.assignedToContractor === contractorId && m.assignedAsRental
                );
                setAssignedMachines(assigned);
            }
        } catch (error) {
            console.error('Error fetching assigned machines:', error);
            setAssignedMachines([]);
        }
    };

    // Filter contractors based on search query
    const getFilteredContractors = () => {
        if (!searchQuery.trim()) return contractors;
        const query = searchQuery.toLowerCase();
        return contractors.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.mobile.toLowerCase().includes(query) ||
            (c.address && c.address.toLowerCase().includes(query))
        );
    };

    const filteredContractors = getFilteredContractors();

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Contractors</h1>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                    {showForm ? 'Cancel' : 'Create Contract'}
                </button>
                <input
                    type="text"
                    placeholder="Search contractors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                />
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="mb-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        {editingContractor ? 'Edit Contractor' : 'Create New Contract'}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contractor Name</label>
                            <input
                                type="text"
                                placeholder="Enter contractor name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                            <input
                                type="tel"
                                placeholder="Enter mobile number"
                                value={formData.mobile}
                                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                required
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                            <textarea
                                placeholder="Enter address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                required
                                rows="2"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Project (Auto-fills Distance)</label>
                            <select
                                value={formData.assignedProjectId}
                                onChange={(e) => {
                                    const pId = e.target.value;
                                    setFormData(prev => ({ ...prev, assignedProjectId: pId }));
                                    if (pId) {
                                        const proj = projects.find(p => p._id === pId);
                                        if (proj) {
                                            setFormData(prev => ({
                                                ...prev,
                                                assignedProjectId: pId,
                                                distanceValue: proj.roadDistanceValue || '',
                                                distanceUnit: proj.roadDistanceUnit || 'km'
                                            }));
                                        }
                                    }
                                }}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a Project</option>
                                {projects.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Distance</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Enter distance"
                                    value={formData.distanceValue}
                                    onChange={(e) => setFormData({ ...formData, distanceValue: e.target.value })}
                                    required
                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <select
                                    value={formData.distanceUnit}
                                    onChange={(e) => setFormData({ ...formData, distanceUnit: e.target.value })}
                                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="km">KM</option>
                                    <option value="m">M</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Expense per {formData.distanceUnit.toUpperCase()} (₹)
                            </label>
                            <input
                                type="number"
                                placeholder="Enter expense per unit"
                                value={formData.expensePerUnit}
                                onChange={(e) => setFormData({ ...formData, expensePerUnit: e.target.value })}
                                required
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="complete">Complete</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`mt-5 px-6 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
                    >
                        {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                        {isSubmitting ? 'Processing...' : (editingContractor ? 'Update Contractor' : 'Create Contractor')}
                    </button>
                </form>
            )
            }

            <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Contractors List</h2>

                {/* Mobile View */}
                <div className="block md:hidden space-y-3">
                    {filteredContractors.map(contractor => (
                        <div key={contractor._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="font-bold text-gray-900 mb-2">{contractor.name}</div>
                            <div className="text-sm space-y-1 mb-3">
                                <div><span className="font-medium">Mobile:</span> {contractor.mobile}</div>
                                <div><span className="font-medium">Assigned Project:</span> {contractor.assignedProjects?.map(p => p.name).join(', ') || '-'}</div>
                                <div>
                                    <span className="font-medium">Status:</span>
                                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${contractor.status === 'complete' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {contractor.status ? contractor.status.charAt(0).toUpperCase() + contractor.status.slice(1) : 'Pending'}
                                    </span>
                                </div>
                                <div><span className="font-medium">Address:</span> {contractor.address}</div>
                                <div><span className="font-medium">Distance:</span> {contractor.distanceValue} {contractor.distanceUnit}</div>
                                <div><span className="font-medium">Expense:</span> ₹{contractor.expensePerUnit}/{contractor.distanceUnit}</div>
                                <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-gray-100 rounded">
                                    <div>
                                        <span className="text-xs text-gray-600">Total Payable</span>
                                        <span className="text-blue-600 font-bold">₹{contractorStats[contractor._id]?.totalPayable?.toLocaleString() || 0}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-600">Total Paid</span>
                                        <span className="text-green-600 font-bold">₹{contractorStats[contractor._id]?.totalPaid?.toLocaleString() || 0}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-xs text-gray-600">Advance</span>
                                        <span className="text-yellow-600 font-bold ml-2">₹{contractorStats[contractor._id]?.advancePayment?.toLocaleString() || 0}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-xs text-gray-600">Pending</span>
                                        <span className="text-red-600 font-bold ml-2">₹{contractorStats[contractor._id]?.pendingAmount?.toLocaleString() || 0}</span>
                                    </div>
                                </div>
                                {contractorStats[contractor._id]?.rentedMachinesCount > 0 && (
                                    <div className="text-xs text-purple-600 mt-1">
                                        🚜 {contractorStats[contractor._id].rentedMachinesCount} rented machines
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleViewContractor(contractor)}
                                    className="flex-1 px-3 py-2 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600"
                                >
                                    👁️ View
                                </button>
                                <button
                                    onClick={() => handleEdit(contractor)}
                                    className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded text-sm font-medium hover:bg-yellow-600"
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    onClick={() => handlePayment(contractor)}
                                    className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600"
                                >
                                    💰 Pay
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                                {/* <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mobile</th> */}
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Assigned Project(s)</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Address</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Distance</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Expense</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Payable</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Paid</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Advance</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Pending</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContractors.map(contractor => (
                                <tr key={contractor._id} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="px-4 py-3">{contractor.name}</td>
                                    {/* <td className="px-4 py-3">{contractor.mobile}</td> Original Mobile Column Removed */}
                                    <td className="px-4 py-3">{contractor.assignedProjects?.map(p => p.name).join(', ') || '-'}</td>
                                    <td className="px-4 py-3">{contractor.address}</td>
                                    <td className="px-4 py-3">{contractor.distanceValue} {contractor.distanceUnit}</td>
                                    <td className="px-4 py-3">₹{contractor.expensePerUnit}/{contractor.distanceUnit}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleStatusToggle(contractor)}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${contractor.status === 'active'
                                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                : contractor.status === 'inactive'
                                                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                }`}
                                        >
                                            {contractor.status || 'Pending'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-blue-600 font-semibold">₹{contractorStats[contractor._id]?.totalPayable?.toLocaleString() || 0}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-green-600 font-semibold">₹{contractorStats[contractor._id]?.totalPaid?.toLocaleString() || 0}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-yellow-600 font-semibold">₹{contractorStats[contractor._id]?.advancePayment?.toLocaleString() || 0}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-red-600 font-semibold">₹{contractorStats[contractor._id]?.pendingAmount?.toLocaleString() || 0}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleViewContractor(contractor)}
                                                className="px-3 py-1.5 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                                                title="View Details"
                                            >
                                                👁️
                                            </button>
                                            <button
                                                onClick={() => handleEdit(contractor)}
                                                className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            {/* <button
                                                onClick={() => handlePayment(contractor)}
                                                className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                                title="Payment"
                                            >
                                                💰
                                            </button> */}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {contractors.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No contractors found. Create a new contract to get started.</p>
                )}
            </div>

            {/* View Contractor Details Modal */}
            {
                selectedContractor && activeModal === 'details' && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Contractor Details</h3>
                                <button
                                    onClick={() => {
                                        setSelectedContractor(null);
                                        setActiveModal(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="p-3 bg-gray-50 rounded">
                                    <span className="font-medium text-gray-700">Name:</span> {selectedContractor.name}
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                    <span className="font-medium text-gray-700">Mobile:</span> {selectedContractor.mobile}
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                    <span className="font-medium text-gray-700">Address:</span> {selectedContractor.address}
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                    <span className="font-medium text-gray-700">Distance:</span> {selectedContractor.distanceValue} {selectedContractor.distanceUnit}
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                    <span className="font-medium text-gray-700">Expense per {selectedContractor.distanceUnit}:</span> ₹{selectedContractor.expensePerUnit}
                                </div>
                            </div>

                            <h4 className="text-lg font-bold text-gray-900 mb-3">Assigned Machines</h4>
                            <div className="mb-6">
                                {assignedMachines.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b-2 border-gray-200">
                                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Machine Name</th>
                                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Category</th>
                                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Rent/Day</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {assignedMachines.map(machine => (
                                                    <tr key={machine._id} className="border-b border-gray-200">
                                                        <td className="px-3 py-2">{machine.name}</td>
                                                        <td className="px-3 py-2">{machine.category}</td>
                                                        <td className="px-3 py-2">₹{machine.assignedRentalPerDay || 0}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                            <span className="font-medium text-blue-900">Total Rent/Day:</span>
                                            <span className="text-blue-700 font-bold ml-2">
                                                ₹{assignedMachines.reduce((sum, m) => sum + (m.assignedRentalPerDay || 0), 0)}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No machines assigned</p>
                                )}
                            </div>

                            <h4 className="text-lg font-bold text-gray-900 mb-3">Payment History</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b-2 border-gray-200">
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Date</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Amount</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Machine Rent</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Remark</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contractorPayments.map(payment => (
                                            <tr key={payment._id} className="border-b border-gray-200">
                                                <td className="px-3 py-2">{new Date(payment.date).toLocaleDateString()}</td>
                                                <td className="px-3 py-2">₹{payment.amount}</td>
                                                <td className="px-3 py-2">₹{payment.machineRent}</td>
                                                <td className="px-3 py-2">{payment.remark || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {contractorPayments.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">No payment history</p>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedContractor(null);
                                    setActiveModal(null);
                                }}
                                className="mt-4 w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Payment Modal */}
            {
                activeModal === 'payment' && selectedContractor && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Payment for {selectedContractor.name}</h3>

                            <form onSubmit={handlePaymentSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                                        <input
                                            type="date"
                                            value={paymentData.date}
                                            onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                                            required
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                                        <input
                                            type="number"
                                            placeholder="Enter payment amount"
                                            value={paymentData.amount}
                                            onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                                            required
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Machine Rent (Auto-fetched)</label>
                                        <input
                                            type="number"
                                            value={paymentData.machineRent}
                                            readOnly
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                                        <select
                                            value={paymentData.paymentMode}
                                            onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="cash">💵 Cash</option>
                                            <option value="upi">📱 UPI</option>
                                            <option value="bank">🏦 Bank Transfer</option>
                                            <option value="check">📝 Check</option>
                                            <option value="other">🔹 Other</option>
                                        </select>
                                    </div>

                                    {/* Bank Account Selection - Conditional */}
                                    {['bank', 'upi', 'check'].includes(paymentData.paymentMode) && (
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Bank Account</label>
                                            <select
                                                value={selectedBank}
                                                onChange={(e) => setSelectedBank(e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
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

                                    {/* Creditor Selection - Shows when Cash selected */}
                                    {paymentData.paymentMode === 'cash' && (
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Creditor (Optional)</label>
                                            <select
                                                value={selectedCreditor}
                                                onChange={(e) => setSelectedCreditor(e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">-- Select Creditor (Optional) --</option>
                                                {creditors.map(c => (
                                                    <option key={c._id} value={c._id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="md:col-span-2">
                                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                            <input
                                                type="checkbox"
                                                id="deductRent"
                                                checked={paymentData.deductRent}
                                                onChange={(e) => setPaymentData({ ...paymentData, deductRent: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <label htmlFor="deductRent" className="ml-2 text-sm font-medium text-gray-700">
                                                Deduct machine rent from payment (Final: ₹{paymentData.deductRent ? (Number(paymentData.amount || 0) - paymentData.machineRent) : (paymentData.amount || 0)})
                                            </label>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Remark</label>
                                        <textarea
                                            placeholder="Enter remark (optional)"
                                            value={paymentData.remark}
                                            onChange={(e) => setPaymentData({ ...paymentData, remark: e.target.value })}
                                            rows="3"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium flex justify-center items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
                                    >
                                        {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                                        {isSubmitting ? 'Processing...' : 'Pay'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveModal(null);
                                            setSelectedContractor(null);
                                            setPaymentData({ date: new Date().toISOString().split('T')[0], amount: '', remark: '', machineRent: 0, deductRent: false, paymentMode: 'cash' });
                                        }}
                                        className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Contractors;
