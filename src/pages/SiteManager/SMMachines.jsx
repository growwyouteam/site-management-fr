import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';

import { useSiteManager } from '../../context/SiteManagerContext';

const SMMachines = () => {
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { selectedProject } = useSiteManager();

    // Details Modal State
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [machineDetails, setMachineDetails] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const fetchMachines = async () => {
        try {
            let url = '/site/site-machines';
            if (selectedProject?._id) {
                url += `?projectId=${selectedProject._id}`;
            }

            const response = await api.get(url);
            if (response.data.success) {
                setMachines(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching machines:', error);
            showToast('Failed to load machines', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMachines();
    }, [selectedProject]);

    const fetchMachineDetails = async (id) => {
        setLoadingDetails(true);
        try {
            const response = await api.get(`/site/machines/${id}/details`);
            if (response.data.success) {
                setMachineDetails(response.data.data);
                setShowDetailsModal(true);
            }
        } catch (error) {
            console.error('Error fetching details:', error);
            showToast('Failed to load details', 'error');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleViewDetails = (machine) => {
        setSelectedMachine(machine);
        fetchMachineDetails(machine._id);
    };

    const handleRentPauseToggle = async (machine) => {
        try {
            const response = await api.put(`/site/machines/${machine._id}/pause`);
            if (response.data.success) {
                showToast(response.data.message, 'success');
                fetchMachines();
                // If details modal is open, refresh it too
                if (showDetailsModal && selectedMachine?._id === machine._id) {
                    fetchMachineDetails(machine._id);
                }
            }
        } catch (error) {
            console.error('Error toggling rent pause:', error);
            showToast(error.response?.data?.error || 'Failed to update rent status', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Site Machines</h1>

            {machines.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                    <p className="text-gray-500 text-lg">No machines assigned to this site.</p>
                </div>
            ) : (
                <div>
                    {/* Desktop View */}
                    <div className="hidden md:block bg-white rounded-lg shadow-md overflow-x-auto">
                        <table className="min-w-full leading-normal">
                            <thead>
                                <tr>
                                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Machine Name</th>
                                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Plate Number</th>
                                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ownership</th>
                                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rental Details</th>
                                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {machines.map((machine) => (
                                    <tr key={machine._id}>
                                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                            <p className="text-gray-900 whitespace-no-wrap font-semibold">{machine.name}</p>
                                        </td>
                                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                            <p className="text-gray-900 whitespace-no-wrap">{machine.plateNumber || 'N/A'}</p>
                                        </td>
                                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                            <span className="capitalize px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {machine.ownershipType}
                                            </span>
                                        </td>
                                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                            {(machine.ownershipType === 'rented' || machine.assignedAsRental) ? (
                                                <div>
                                                    <p className="text-gray-900 whitespace-no-wrap">
                                                        ₹{machine.assignedRentalPerDay}/{machine.rentalType === 'perHour' ? 'hr' : 'day'}
                                                    </p>
                                                    <p className="text-gray-500 text-xs">
                                                        {machine.ownershipType === 'rented'
                                                            ? `Vendor: ${machine.vendorName || 'N/A'}`
                                                            : `Contractor: ${machine.assignedToContractor?.name || 'Assigned'}`
                                                        }
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${machine.isRentPaused ? 'bg-orange-100 text-orange-800' :
                                                    machine.status === 'in-use' ? 'bg-green-100 text-green-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {machine.isRentPaused ? 'Rent Paused' :
                                                    machine.status === 'in-use' ? 'In Use' : machine.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm space-x-2">
                                            {(machine.ownershipType === 'rented' || machine.assignedAsRental) && (
                                                <>
                                                    <button
                                                        onClick={() => handleRentPauseToggle(machine)}
                                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors mb-1
                                                        ${machine.isRentPaused
                                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                            }`}
                                                    >
                                                        {machine.isRentPaused ? 'Resume' : 'Pause'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewDetails(machine)}
                                                        className="px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                                    >
                                                        Details
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {machines.map((machine) => (
                            <div key={machine._id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{machine.name}</h3>
                                        <p className="text-sm text-gray-500">{machine.plateNumber || 'N/A'}</p>
                                    </div>
                                    <span className="capitalize px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {machine.ownershipType}
                                    </span>
                                </div>
                                <div className="space-y-2 mb-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Status:</span>
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${machine.isRentPaused ? 'bg-orange-100 text-orange-800' :
                                                machine.status === 'in-use' ? 'bg-green-100 text-green-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {machine.isRentPaused ? 'Rent Paused' :
                                                machine.status === 'in-use' ? 'In Use' : machine.status}
                                        </span>
                                    </div>
                                    {(machine.ownershipType === 'rented' || machine.assignedAsRental) && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Rate:</span>
                                            <span className="font-semibold text-gray-900">
                                                ₹{machine.assignedRentalPerDay}/{machine.rentalType === 'perHour' ? 'hr' : 'day'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {(machine.ownershipType === 'rented' || machine.assignedAsRental) && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRentPauseToggle(machine)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors
                                                ${machine.isRentPaused
                                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                                    : 'bg-orange-500 text-white hover:bg-orange-600'
                                                }`}
                                        >
                                            {machine.isRentPaused ? 'Resume Rent' : 'Pause Rent'}
                                        </button>
                                        <button
                                            onClick={() => handleViewDetails(machine)}
                                            className="flex-1 py-2 rounded-lg text-sm font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && machineDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Machine Details</h2>
                            <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Header Info */}
                            <div className="flex justify-between items-start mb-6 bg-blue-50 p-4 rounded-lg">
                                <div>
                                    <h3 className="text-2xl font-bold text-blue-900">{machineDetails.machine.name}</h3>
                                    <p className="text-blue-600">{machineDetails.machine.plateNumber}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Total Rent (Est.)</p>
                                    <p className="text-3xl font-bold text-green-600">₹{machineDetails.rentCalculation.estimatedTotalRent.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Rent Calculation Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase">Assigned On</p>
                                    <p className="font-semibold text-gray-800">{new Date(machineDetails.rentCalculation.startDate).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase">Total Duration</p>
                                    <p className="font-semibold text-gray-800">{machineDetails.rentCalculation.totalDurationHours} hrs</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase">Paused Hours</p>
                                    <p className="font-semibold text-orange-600">{machineDetails.rentCalculation.totalPausedHours} hrs</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase">Billable</p>
                                    <p className="font-semibold text-green-600">
                                        {machineDetails.rentCalculation.billableDays} days
                                    </p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <p className="text-xs text-blue-600 uppercase font-bold">Working Hours</p>
                                    <p className="font-bold text-blue-700">
                                        {(machineDetails.rentCalculation.totalDurationHours - machineDetails.rentCalculation.totalPausedHours).toFixed(2)} hrs
                                    </p>
                                </div>
                            </div>

                            {/* Working History Table */}
                            {(() => {
                                const history = [];
                                const startDate = new Date(machineDetails.rentCalculation.startDate);
                                const pauseHistory = machineDetails.machine.rentPausedHistory || [];

                                // First period: Start -> First Pause (or Now if no pauses)
                                if (pauseHistory.length === 0) {
                                    history.push({
                                        from: startDate,
                                        to: new Date(),
                                        duration: (new Date() - startDate) / (1000 * 60 * 60),
                                        status: 'Ongoing'
                                    });
                                } else {
                                    // Start -> First Pause
                                    const firstPause = new Date(pauseHistory[0].pausedAt);
                                    history.push({
                                        from: startDate,
                                        to: firstPause,
                                        duration: (firstPause - startDate) / (1000 * 60 * 60),
                                        status: 'Completed'
                                    });

                                    // Intermediate periods: Resume(i) -> Pause(i+1)
                                    for (let i = 0; i < pauseHistory.length - 1; i++) {
                                        if (pauseHistory[i].resumedAt) {
                                            const resumeTime = new Date(pauseHistory[i].resumedAt);
                                            const nextPause = new Date(pauseHistory[i + 1].pausedAt);
                                            history.push({
                                                from: resumeTime,
                                                to: nextPause,
                                                duration: (nextPause - resumeTime) / (1000 * 60 * 60),
                                                status: 'Completed'
                                            });
                                        }
                                    }

                                    // Last period: Last Resume -> Now (if resumed)
                                    const lastRecord = pauseHistory[pauseHistory.length - 1];
                                    if (lastRecord.resumedAt) {
                                        const lastResume = new Date(lastRecord.resumedAt);
                                        history.push({
                                            from: lastResume,
                                            to: new Date(),
                                            duration: (new Date() - lastResume) / (1000 * 60 * 60),
                                            status: 'Ongoing'
                                        });
                                    }
                                }

                                return (
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-3">Working History (Active Periods)</h4>
                                        <div className="overflow-x-auto border rounded-lg max-h-60 overflow-y-auto">
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">From</th>
                                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">To</th>
                                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Duration (hrs)</th>
                                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {history.map((period, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-4 py-2 text-gray-700">
                                                                {period.from.toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-2 text-gray-700">
                                                                {period.status === 'Ongoing' ? <span className="text-green-600 font-bold">Now</span> : period.to.toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-2 text-gray-700 font-medium">
                                                                {period.duration.toFixed(2)}
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <span className={`text-xs px-2 py-1 rounded-full ${period.status === 'Ongoing' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                    {period.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}

                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SMMachines;
