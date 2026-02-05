import { useState, useEffect } from 'react';
import { showToast } from '../../components/Toast';
import api from '../../services/api';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTime, setPaymentTime] = useState(new Date().toTimeString().split(' ')[0].slice(0, 5));
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [isAdvance, setIsAdvance] = useState(false);
  const [paymentSlip, setPaymentSlip] = useState(null);
  const [vendorPayments, setVendorPayments] = useState([]);
  const [formData, setFormData] = useState({ name: '', contact: '', email: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [banks, setBanks] = useState([]);
  const [creditors, setCreditors] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedCreditor, setSelectedCreditor] = useState('');

  useEffect(() => {
    fetchVendors();
    fetchVendors();
    fetchBanks();
    fetchCreditors();
  }, []);

  // Calculate vendor statistics
  const getVendorStats = (vendor) => {
    // More robust vendor ID matching
    const vendorStocks = stocks.filter(s => {
      if (!s.vendorId) return false;

      // Handle different vendorId formats
      if (typeof s.vendorId === 'object' && s.vendorId._id) {
        return s.vendorId._id === vendor._id;
      } else if (typeof s.vendorId === 'string') {
        return s.vendorId === vendor._id;
      } else if (s.vendorId.toString) {
        return s.vendorId.toString() === vendor._id;
      }
      return false;
    });

    const totalItems = vendorStocks.length;
    const recentSupplies = vendorStocks.filter(s => {
      const supplyDate = new Date(s.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return supplyDate > thirtyDaysAgo;
    }).length;

    // Use actual vendor model data instead of calculating
    const stats = {
      totalSupplied: vendor.totalSupplied || 0,
      pendingAmount: vendor.pendingAmount || 0,
      advancePayment: vendor.advancePayment || 0,
      totalPaid: (vendor.totalSupplied || 0) - (vendor.pendingAmount || 0),
      totalItems,
      recentSupplies
    };

    return stats;
  };

  const fetchVendors = async () => {
    try {
      console.log('🔄 Fetching vendors and stocks data...');
      const [vendorsRes, stocksRes] = await Promise.all([
        api.get('/admin/vendors'),
        api.get('/admin/stocks')
      ]);

      if (vendorsRes.data.success) {
        console.log('✅ Vendors loaded:', vendorsRes.data.data.length);
        console.log('👥 Vendor data sample:', vendorsRes.data.data[0]);
        setVendors(vendorsRes.data.data);
      }

      if (stocksRes.data.success) {
        console.log('✅ Stocks loaded:', stocksRes.data.data.length);
        console.log('📦 Stock data sample:', stocksRes.data.data[0]);
        setStocks(stocksRes.data.data);
      }
    } catch (error) {
      showToast('Failed to fetch data', 'error');
      console.error('Error fetching data:', error);
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

  const fetchCreditors = async () => {
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
      if (editingVendor) {
        const response = await api.put(`/admin/vendors/${editingVendor._id}`, formData);
        if (response.data.success) {
          showToast('Vendor updated successfully', 'success');
        }
      } else {
        const response = await api.post('/admin/vendors', formData);
        if (response.data.success) {
          showToast('Vendor created successfully', 'success');
        }
      }
      setShowForm(false);
      setEditingVendor(null);
      setFormData({ name: '', contact: '', email: '', address: '' });
      fetchVendors();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to save vendor', 'error');
      console.error('Error saving vendor:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      contact: vendor.contact,
      email: vendor.email || '',
      address: vendor.address || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vendor?')) return;
    try {
      const response = await api.delete(`/admin/vendors/${id}`);
      if (response.data.success) {
        showToast('Vendor deleted', 'success');
        fetchVendors();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to delete vendor', 'error');
      console.error('Error deleting vendor:', error);
    }
  };

  const handlePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    const pendingAmount = getVendorStats(selectedVendor).pendingAmount;

    // Allow advance payment even if it exceeds pending
    // if (parseFloat(paymentAmount) > pendingAmount && !isAdvance) {
    //   showToast(`Payment amount cannot exceed pending amount (₹${pendingAmount.toLocaleString()})`, 'error');
    //   return;
    // }

    try {
      const combinedDate = new Date(`${paymentDate}T${paymentTime}`);

      const formData = new FormData();
      formData.append('vendorId', selectedVendor._id);
      formData.append('amount', parseFloat(paymentAmount));
      formData.append('paymentMode', paymentMode);
      formData.append('date', combinedDate.toISOString());
      formData.append('remarks', paymentRemarks);
      if (['bank_transfer', 'upi', 'check'].includes(paymentMode) && selectedBank) {
        formData.append('bankId', selectedBank);
      }
      if (selectedCreditor) {
        formData.append('creditorId', selectedCreditor);
      }

      // Calculate if payment creates advance
      const paymentAmt = parseFloat(paymentAmount);
      if (paymentAmt > pendingAmount && !isAdvance) {
        // Payment exceeds pending - mark excess as advance
        formData.append('isAdvance', true);
        formData.append('advanceAmount', paymentAmt - pendingAmount);
      } else {
        formData.append('isAdvance', isAdvance);
        if (isAdvance) {
          formData.append('advanceAmount', paymentAmt);
        }
      }

      if (paymentSlip) {
        formData.append('receipt', paymentSlip);
      }

      const response = await api.post('/admin/vendors/payment', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        showToast('Payment recorded successfully', 'success');
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentRemarks('');
        setIsAdvance(false);
        setPaymentMode('cash');
        setPaymentSlip(null);
        setSelectedVendor(null);
        setSelectedBank('');
        fetchVendors();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to record payment', 'error');
      console.error('Error recording payment:', error);
    }
  };

  // Filter vendors based on search query
  const getFilteredVendors = () => {
    if (!searchQuery.trim()) return vendors;
    const query = searchQuery.toLowerCase();
    return vendors.filter(v =>
      v.name.toLowerCase().includes(query) ||
      v.contact.toLowerCase().includes(query) ||
      (v.email && v.email.toLowerCase().includes(query))
    );
  };

  const filteredVendors = getFilteredVendors();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Vendor Management</h1>
      <div className="flex gap-3">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          {showForm ? 'Cancel' : 'Add Vendor'}
        </button>
        <button
          onClick={() => {
            console.log('🔄 Manual refresh triggered');
            fetchVendors();
          }}
          className="px-5 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
        >
          🔄 Refresh Data
        </button>
        <input
          type="text"
          placeholder="Search vendors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-5 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name</label>
              <input
                type="text"
                placeholder="Vendor Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
              <input
                type="tel"
                placeholder="Contact Number"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                placeholder="Email (optional)"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <input
                type="text"
                placeholder="Full Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
            >
              {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
              {isSubmitting ? 'Processing...' : (editingVendor ? 'Update Vendor' : 'Add Vendor')}
            </button>
            {editingVendor && (
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingVendor(null);
                  setFormData({ name: '', contact: '', email: '', address: '' });
                }}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Vendors List</h2>

        {/* Mobile View */}
        <div className="block md:hidden space-y-3">
          {filteredVendors.map(v => (
            <div key={v._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-bold text-gray-900 mb-2">{v.name}</div>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Vendor ID:</span> {v._id?.slice(-8) || 'N/A'}</div>
                <div><span className="font-medium">Contact:</span> {v.contact}</div>
                <div><span className="font-medium">Email:</span> {v.email || 'N/A'}</div>
                <div><span className="font-medium">Address:</span> {v.address || 'N/A'}</div>
                <div><span className="font-medium">Total Items:</span> <span className="text-blue-600 font-bold">{getVendorStats(v).totalItems}</span></div>
                <div><span className="font-medium">Recent Supplies:</span> <span className="text-purple-600 font-bold">{getVendorStats(v).recentSupplies} (30 days)</span></div>
                <div><span className="font-medium">Total Supplied:</span> <span className="text-green-600 font-bold">₹{getVendorStats(v).totalSupplied.toLocaleString()}</span></div>
                <div><span className="font-medium">Advance Paid:</span> <span className="text-yellow-600 font-bold">₹{getVendorStats(v).advancePayment.toLocaleString()}</span></div>
                <div><span className="font-medium">Pending Amount:</span> <span className="text-red-600 font-bold">₹{getVendorStats(v).pendingAmount.toLocaleString()}</span></div>
                <div><span className="font-medium">Total Paid:</span> <span className="text-blue-600 font-bold">₹{getVendorStats(v).totalPaid.toLocaleString()}</span></div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setSelectedVendor(v)}
                  className="flex-1 px-3 py-2 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600"
                >
                  👁️ View
                </button>
                <button
                  onClick={() => { setSelectedVendor(v); setShowPaymentModal(true); }}
                  className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600"
                >
                  💰 Pay
                </button>
                <button
                  onClick={() => handleEdit(v)}
                  className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded text-sm font-medium hover:bg-yellow-600"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(v.id)}
                  className="flex-1 px-3 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600">
                  🗑️ Remove
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vendor ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Items</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Recent Supplies</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Supplied</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Advance</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Pending Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map(v => (
                <tr key={v._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{v._id?.slice(-8) || 'N/A'}</td>
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3">{v.contact}</td>
                  <td className="px-4 py-3 text-blue-600 font-bold">{getVendorStats(v).totalItems}</td>
                  <td className="px-4 py-3 text-purple-600 font-bold">{getVendorStats(v).recentSupplies}</td>
                  <td className="px-4 py-3 text-green-600 font-bold">₹{getVendorStats(v).totalSupplied.toLocaleString()}</td>
                  <td className="px-4 py-3 text-yellow-600 font-bold">₹{getVendorStats(v).advancePayment.toLocaleString()}</td>
                  <td className="px-4 py-3 text-red-600 font-bold">₹{getVendorStats(v).pendingAmount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedVendor(v)}
                        className="px-3 py-1.5 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                        title="View Details"
                      >
                        👁️
                      </button>
                      {/* <button
                        onClick={() => { setSelectedVendor(v); setShowPaymentModal(true); }}
                        className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        title="Record Payment"
                      >
                        💰
                      </button> */}
                      <button
                        onClick={() => handleEdit(v)}
                        className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(v._id)}
                        className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        title="Remove"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Vendor Modal with Tabs */}
      {selectedVendor && !showPaymentModal && (
        <VendorDetailModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          stats={getVendorStats(selectedVendor)}
          stocks={stocks.filter(s =>
            typeof s.vendorId === 'object' ? s.vendorId._id === selectedVendor._id : s.vendorId === selectedVendor._id
          )}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Vendor Payment Form</h3>
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentAmount(''); setSelectedVendor(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Vendor Card */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-6 flex justify-between items-center">
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Vendor Details</p>
                  <p className="text-lg font-bold text-gray-900">{selectedVendor.name}</p>
                  <p className="text-sm text-gray-600">{selectedVendor.contact}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Pending Balance</p>
                  <p className="text-2xl font-bold text-red-600">₹{getVendorStats(selectedVendor).pendingAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₹</span>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                      <input
                        type="time"
                        value={paymentTime}
                        onChange={(e) => setPaymentTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <textarea
                      value={paymentRemarks}
                      onChange={(e) => setPaymentRemarks(e.target.value)}
                      placeholder="Optional notes..."
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="cash">💵 Cash</option>
                      <option value="upi">📱 UPI</option>
                      <option value="bank_transfer">🏦 Bank Transfer</option>
                      <option value="check">🎫 Check</option>
                      <option value="other">⚪ Other</option>
                    </select>
                  </div>

                  {/* Bank Account Selection - Conditional */}
                  {['bank_transfer', 'upi', 'check'].includes(paymentMode) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Bank Account</label>
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                  {paymentMode === 'cash' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Creditor (Optional)</label>
                      <select
                        value={selectedCreditor}
                        onChange={(e) => setSelectedCreditor(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">-- Select Creditor (Optional) --</option>
                        {creditors.map(c => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Slip</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setPaymentSlip(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="text-gray-500">
                        {paymentSlip ? (
                          <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                            <span>📄</span> {paymentSlip.name}
                          </div>
                        ) : (
                          <>
                            <span className="text-2xl block mb-1">📎</span>
                            <span className="text-sm">Click to upload slip</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={isAdvance}
                        onChange={(e) => setIsAdvance(e.target.checked)}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                      />
                      <div>
                        <span className="block text-sm font-bold text-gray-900">Mark as Advance</span>
                        <span className="block text-xs text-gray-500">Payment made before supply</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 justify-end mt-8 border-t pt-4">
                <button
                  onClick={() => { setShowPaymentModal(false); setPaymentAmount(''); setSelectedVendor(null); setSelectedBank(''); }}
                  className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  className="px-8 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm transition-colors flex items-center gap-2"
                >
                  <span>💸</span> Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Information */}
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="text-lg font-bold text-yellow-900 mb-3">🔍 Debug Information</h3>
        <div className="text-sm space-y-2">
          <div><span className="font-medium">Vendors Count:</span> {vendors.length}</div>
          <div><span className="font-medium">Stocks Count:</span> {stocks.length}</div>
          <div><span className="font-medium">Stocks with vendorId:</span> {stocks.filter(s => s.vendorId).length}</div>
          {vendors.length > 0 && (
            <div>
              <span className="font-medium">First Vendor ID:</span> {vendors[0]._id}
            </div>
          )}
          {stocks.length > 0 && (
            <div>
              <span className="font-medium">Sample Stock vendorId:</span> {JSON.stringify(stocks[0]?.vendorId)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Vendors;

// Helper Component for Vendor Detail Modal with Tabs
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
                      <th className="px-4 py-3">Slip</th>
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
                          <td className="px-4 py-3">
                            {payment.receiptUrl ? (
                              <a
                                href={payment.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline text-xs"
                              >
                                View Slip
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
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
