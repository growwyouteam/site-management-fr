import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ContractorDetailModal = ({ contractor, onClose, assignedMachines = [], onPaymentHistoryChanged }) => {
    const [payments, setPayments] = useState([]);

    useEffect(() => {
        fetchContractorPayments();
    }, [contractor]);

    const fetchContractorPayments = async () => {
        try {
            const response = await api.get(`/admin/contractors/${contractor._id}/payments`);
            if (response.data.success) {
                setPayments(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            setPayments([]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Contractor Details</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="p-3 bg-gray-50 rounded">
                        <span className="font-medium text-gray-700">Name:</span> {contractor.name}
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                        <span className="font-medium text-gray-700">Mobile:</span> {contractor.mobile}
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                        <span className="font-medium text-gray-700">Address:</span> {contractor.address}
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                        <span className="font-medium text-gray-700">Distance:</span> {contractor.distanceValue} {contractor.distanceUnit}
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                        <span className="font-medium text-gray-700">Expense per {contractor.distanceUnit}:</span> ₹{contractor.expensePerUnit}
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
                            {payments.map(payment => (
                                <tr key={payment._id} className="border-b border-gray-200">
                                    <td className="px-3 py-2">{new Date(payment.date).toLocaleDateString()}</td>
                                    <td className="px-3 py-2">₹{payment.amount}</td>
                                    <td className="px-3 py-2">₹{payment.machineRent}</td>
                                    <td className="px-3 py-2">{payment.remark || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {payments.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No payment history</p>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="mt-4 w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default ContractorDetailModal;
