import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';

const SMMachines = () => {
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchMachines = async () => {
        try {
            const response = await api.get('/site/site-machines');
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
    }, []);

    const handleRentPauseToggle = async (machine) => {
        try {
            const response = await api.put(`/site/machines/${machine._id}/pause`);
            if (response.data.success) {
                showToast(response.data.message, 'success');
                fetchMachines(); // Refresh list to show new status
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
                <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr>
                                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Machine Name
                                </th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Plate Number
                                </th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Ownership
                                </th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Rental Details
                                </th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Action
                                </th>
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
                                        {machine.isRentPaused && machine.rentPausedAt && (
                                            <p className="text-xs text-orange-600 mt-1">
                                                Since: {new Date(machine.rentPausedAt).toLocaleDateString()}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                        {(machine.ownershipType === 'rented' || machine.assignedAsRental) && (
                                            <button
                                                onClick={() => handleRentPauseToggle(machine)}
                                                className={`px-3 py-1 rounded text-sm font-medium transition-colors
                                                    ${machine.isRentPaused
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                    }`}
                                            >
                                                {machine.isRentPaused ? 'Resume Rent' : 'Pause Rent'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default SMMachines;
