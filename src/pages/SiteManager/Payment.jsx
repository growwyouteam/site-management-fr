import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';

const Payment = () => {
  const { user } = useAuth();
  const { selectedProject } = useSiteManager();
  const baseUrl = user?.role === 'admin' ? '/admin' : '/site';
  const [labours, setLabours] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ labourId: '', amount: 0, deduction: 0, advance: 0, paymentMode: 'cash', remarks: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter states
  const [searchName, setSearchName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filtered payments
  const filteredPayments = payments.filter(p => {
    const nameMatch = !searchName || p.labourName?.toLowerCase().includes(searchName.toLowerCase());
    const paymentDate = new Date(p.createdAt);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    let dateMatch = true;
    if (start) dateMatch = dateMatch && paymentDate >= start;
    if (end) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      dateMatch = dateMatch && paymentDate <= endOfDay;
    }

    return nameMatch && dateMatch;
  });

  // Calculate totals for filtered payments
  const totals = filteredPayments.reduce((acc, p) => ({
    amount: acc.amount + (p.amount || 0),
    deduction: acc.deduction + (p.deduction || 0),
    advance: acc.advance + (p.advance || 0),
    finalAmount: acc.finalAmount + (p.finalAmount || 0),
    totalPaid: acc.totalPaid + ((p.amount || 0) + (p.advance || 0) - (p.deduction || 0))
  }), { amount: 0, deduction: 0, advance: 0, finalAmount: 0, totalPaid: 0 });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const fetchData = async () => {
    try {
      const labourQuery = selectedProject ? `?projectId=${selectedProject._id}` : '';
      const [laboursRes, paymentsRes] = await Promise.all([
        api.get(`${baseUrl}/labours${labourQuery}`),
        api.get(`${baseUrl}/payments`)
      ]);

      let labs = [];

      if (laboursRes.data.success) {
        labs = laboursRes.data.data;
        setLabours(labs);
      }

      if (paymentsRes.data.success) {
        // Filter payments to only include those for the filtered labours
        // Since payment doesn't strictly have projectId, we infer from labour association
        let filteredPay = paymentsRes.data.data;
        if (selectedProject) {
          const validLabourIds = labs.map(l => l._id);
          filteredPay = paymentsRes.data.data.filter(p => validLabourIds.includes(p.labourId));
        }
        setPayments(filteredPay);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await api.post(`${baseUrl}/payments`, {
        ...formData,
        amount: Number(formData.amount) || 0,
        deduction: Number(formData.deduction) || 0,
        advance: Number(formData.advance) || 0
      });

      if (response.data.success) {
        showToast('Payment recorded successfully', 'success');
        setShowForm(false);
        setFormData({ labourId: '', amount: '', deduction: 0, advance: 0, paymentMode: 'cash', remarks: '' });
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to record payment', 'error');
      console.error('Error recording payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Labour Payment</h1>
      <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
        {showForm ? 'Cancel' : 'Pay Labour'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-5 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Labour</label>
              <select value={formData.labourId} onChange={(e) => {
                const labour = labours.find(l => l._id === e.target.value);
                setFormData({ ...formData, labourId: e.target.value, amount: labour?.pendingPayout || 0 });
                // Store selected labour in state for calculations (implied by closure or new state)
              }} required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                <option value="">Select Labour</option>
                {labours.map(l => (
                  <option key={l._id} value={l._id}>{l.name} - Pending: ₹{l.pendingPayout || 0}</option>
                ))}
              </select>

              {/* Show Current Pending & Remaining Balance */}
              {formData.labourId && (
                <div className="mt-3 grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div>
                    <span className="text-xs text-gray-500 font-semibold uppercase">Current Pending</span>
                    <div className="text-lg font-bold text-blue-800">
                      ₹{(labours.find(l => l._id === formData.labourId)?.pendingPayout || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-semibold uppercase">Remaining Balance</span>
                    <div className={`text-lg font-bold ${(labours.find(l => l._id === formData.labourId)?.pendingPayout || 0) - (parseFloat(formData.amount) || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{Math.max(0, (labours.find(l => l._id === formData.labourId)?.pendingPayout || 0) - (parseFloat(formData.amount) || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Pay (₹)</label>
              <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Deduction (₹)</label>
              <input type="number" value={formData.deduction} onChange={(e) => setFormData({ ...formData, deduction: e.target.value })} disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Advance (₹)</label>
              <input type="number" value={formData.advance} onChange={(e) => setFormData({ ...formData, advance: e.target.value })} disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
              <select value={formData.paymentMode} onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })} disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Net Payable Amount</label>
              <div className="w-full px-4 py-2.5 bg-green-50 border border-green-300 rounded-lg text-green-700 font-bold">
                ₹{((parseFloat(formData.amount) || 0) - (parseFloat(formData.deduction) || 0) + (parseFloat(formData.advance) || 0)).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Amount - Deduction + Advance</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <input type="text" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} placeholder="Optional" disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`mt-5 px-6 py-3 text-white rounded-lg transition-colors font-semibold flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </button>
        </form>
      )}

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Payment History</h2>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search by Name</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Enter labour name..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredPayments.length} of {payments.length} payments
        </div>

        {/* Mobile View */}
        <div className="block lg:hidden space-y-3">
          {filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No payments found</p>
            </div>
          ) : (
            filteredPayments.map(p => (
              <div key={p._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-bold text-gray-900 mb-2">{p.labourName}</div>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">Amount:</span> ₹{p.amount?.toLocaleString()}</div>
                  <div><span className="font-medium">Deduction:</span> <span className="text-red-600">₹{p.deduction?.toLocaleString()}</span></div>
                  <div>
                    <span className="font-medium">Advance:</span>
                    {p.advance > 0 ? (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        ADVANCE: ₹{p.advance?.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-500 ml-1">₹0</span>
                    )}
                  </div>
                  <div><span className="font-medium">Final:</span> <span className="text-green-600 font-bold">₹{p.finalAmount?.toLocaleString()}</span></div>
                  <div><span className="font-medium">Total Paid:</span> <span className="text-blue-600 font-bold">₹{((p.amount || 0) + (p.advance || 0) - (p.deduction || 0)).toLocaleString()}</span></div>
                  <div><span className="font-medium">Mode:</span> <span className="capitalize">{p.paymentMode}</span></div>
                  <div><span className="font-medium">Date:</span> {new Date(p.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Mobile Summary */}
        {filteredPayments.length > 0 && (
          <div className="block lg:hidden mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
            <div className="font-bold text-blue-900 mb-2">Total Summary</div>
            <div className="text-sm space-y-1">
              <div><span className="font-medium">Total Amount:</span> <span className="font-bold">₹{totals.amount.toLocaleString()}</span></div>
              <div><span className="font-medium">Total Deduction:</span> <span className="text-red-600 font-bold">₹{totals.deduction.toLocaleString()}</span></div>
              <div><span className="font-medium">Total Advance:</span> <span className="text-orange-600 font-bold">₹{totals.advance.toLocaleString()}</span></div>
              <div className="pt-2 border-t border-blue-300 mt-2"><span className="font-medium">Total Paid:</span> <span className="text-blue-600 font-bold text-xl">₹{totals.totalPaid.toLocaleString()}</span></div>
            </div>
          </div>
        )}

        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Labour</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Deduction</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Advance</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Final Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Paid</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mode</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p._id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.labourName}</td>
                    <td className="px-4 py-3">₹{p.amount?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-red-600">₹{p.deduction?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {p.advance > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ₹{p.advance?.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-600">₹{p.finalAmount?.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-blue-600">₹{((p.amount || 0) + (p.advance || 0) - (p.deduction || 0)).toLocaleString()}</td>
                    <td className="px-4 py-3 capitalize">{p.paymentMode}</td>
                    <td className="px-4 py-3">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Desktop Summary Row */}
            {filteredPayments.length > 0 && (
              <tfoot>
                <tr className="bg-blue-50 border-t-2 border-blue-300 font-bold">
                  <td className="px-4 py-3 text-blue-900">TOTAL</td>
                  <td className="px-4 py-3 text-blue-900">₹{totals.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-red-600">₹{totals.deduction.toLocaleString()}</td>
                  <td className="px-4 py-3 text-orange-600">₹{totals.advance.toLocaleString()}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-blue-600 text-xl">₹{totals.totalPaid.toLocaleString()}</td>
                  <td className="px-4 py-3" colSpan="1"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payment;
