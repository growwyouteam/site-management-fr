import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';

const Payment = () => {
  const { user } = useAuth();
  const { selectedProject } = useSiteManager();
  const [activeTab, setActiveTab] = useState('labour'); // labour, contractor, vendor
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Common Data
  const [bankDetails, setBankDetails] = useState([]);

  // Labour Data
  const [labours, setLabours] = useState([]);
  const [labourPaymentData, setLabourPaymentData] = useState({ labourId: '', amount: '', advance: '', deduction: '', paymentMode: 'cash', remarks: '' });
  const [labourHistory, setLabourHistory] = useState([]);

  // Contractor Data
  const [contractors, setContractors] = useState([]);
  const [contractorPaymentData, setContractorPaymentData] = useState({ contractorId: '', amount: '', advance: '', deduction: '', paymentMode: 'cash', remarks: '' });
  const [contractorHistory, setContractorHistory] = useState([]);

  // Vendor Data
  const [vendors, setVendors] = useState([]);
  const [vendorPaymentData, setVendorPaymentData] = useState({ vendorId: '', amount: '', advance: '', deduction: '', paymentMode: 'cash', remarks: '' });
  const [vendorHistory, setVendorHistory] = useState([]);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    entityId: ''
  });

  useEffect(() => {
    fetchCommonData();
  }, []);

  useEffect(() => {
    // Reset Entity ID filter when tab changes BUT keep dates? Or reset all?
    // Let's reset entityId, keep dates.
    setFilters(prev => ({ ...prev, entityId: '' }));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'labour') fetchLabourData();
    if (activeTab === 'contractor') fetchContractorData();
    if (activeTab === 'vendor') fetchVendorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, activeTab, filters]); // Re-fetch when filters change

  const fetchCommonData = async () => {
    try {
      await api.get('/admin/bank-details');
    } catch (error) {
      // Ignore
    }
  };

  const buildQuery = () => {
    let q = selectedProject ? `?projectId=${selectedProject._id}` : '?';
    if (filters.startDate) q += `&startDate=${filters.startDate}`;
    if (filters.endDate) q += `&endDate=${filters.endDate}`;
    // Entity ID param name depends on tab
    if (filters.entityId) {
      if (activeTab === 'labour') q += `&labourId=${filters.entityId}`;
      if (activeTab === 'contractor') q += `&contractorId=${filters.entityId}`;
      if (activeTab === 'vendor') q += `&vendorId=${filters.entityId}`;
    }
    return q;
  };

  const fetchLabourData = async () => {
    try {
      setLoading(true);
      const query = buildQuery();
      // Labour list usually doesn't need filtering by date, but maybe project
      const labourQuery = selectedProject ? `?projectId=${selectedProject._id}` : '';

      const [labourRes, historyRes] = await Promise.all([
        api.get(`/site/labours${labourQuery}`),
        api.get(`/site/payments${query}`)
      ]);
      if (labourRes.data.success) setLabours(labourRes.data.data);
      if (historyRes.data.success) setLabourHistory(historyRes.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContractorData = async () => {
    try {
      setLoading(true);
      const query = buildQuery();
      // Contractor list
      const [res, historyRes] = await Promise.all([
        api.get('/site/contractors'),
        api.get(`/site/payments/contractor${query}`)
      ]);

      if (res.data.success) {
        let conts = res.data.data;
        if (selectedProject) {
          conts = conts.filter(c => c.assignedProjects.includes(selectedProject._id));
        }
        setContractors(conts);
      }
      if (historyRes.data.success) {
        setContractorHistory(historyRes.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      const query = buildQuery();
      const [res, historyRes] = await Promise.all([
        api.get('/site/vendors'),
        api.get(`/site/payments/vendor${query}`)
      ]);

      if (res.data.success) {
        setVendors(res.data.data);
      }
      if (historyRes.data.success) {
        setVendorHistory(historyRes.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ... Handlers (Submit) ...

  const handleLabourSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedLabour = labours.find(l => l._id === labourPaymentData.labourId);
      const amountValue = parseFloat(labourPaymentData.amount || 0);
      const pendingAmount = selectedLabour?.pendingPayout || 0;

      if (amountValue <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
      }

      let payload = {
        ...labourPaymentData,
        projectId: selectedProject._id,
        amount: 0,
        advance: 0,
        deduction: 0
      };

      if (labourPaymentData.type === 'wage') {
        if (amountValue > pendingAmount) {
          showToast(`Cannot pay more than pending amount (₹${pendingAmount})`, 'error');
          return;
        }
        payload.amount = amountValue;
      } else if (labourPaymentData.type === 'advance') {
        payload.advance = amountValue;
      } else if (labourPaymentData.type === 'deduction') {
        payload.deduction = amountValue;
      }

      await api.post('/site/payments', payload);
      showToast('Labour Payment Recorded', 'success');
      setShowForm(false);
      setLabourPaymentData({ labourId: '', amount: '', type: 'wage', paymentMode: 'cash', remarks: '' });
      fetchLabourData();
    } catch (error) {
      showToast(error.response?.data?.error || 'Payment Failed', 'error');
    }
  };

  const handleContractorSubmit = async (e) => {
    e.preventDefault();
    try {
      const amountValue = parseFloat(contractorPaymentData.amount || 0);

      if (amountValue <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
      }

      let payload = {
        ...contractorPaymentData,
        projectId: selectedProject._id,
        amount: 0,
        advance: 0,
        deduction: 0
      };

      if (contractorPaymentData.type === 'wage') {
        payload.amount = amountValue;
      } else if (contractorPaymentData.type === 'advance') {
        payload.advance = amountValue;
      } else if (contractorPaymentData.type === 'deduction') {
        payload.deduction = amountValue;
      }

      await api.post('/site/payments/contractor', payload);
      showToast('Contractor Payment Recorded', 'success');
      setShowForm(false);
      setContractorPaymentData({ contractorId: '', amount: '', type: 'wage', paymentMode: 'cash', remarks: '' });
      fetchContractorData();
    } catch (error) {
      showToast(error.response?.data?.error || 'Payment Failed', 'error');
    }
  };

  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedVendor = vendors.find(v => v._id === vendorPaymentData.vendorId);
      const amountValue = parseFloat(vendorPaymentData.amount || 0);
      const pendingAmount = selectedVendor?.pendingAmount || 0;

      if (amountValue <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
      }

      let payload = {
        ...vendorPaymentData,
        amount: 0,
        advance: 0,
        deduction: 0
      };

      if (vendorPaymentData.type === 'wage') {
        if (amountValue > pendingAmount) {
          showToast(`Cannot pay more than pending amount (₹${pendingAmount})`, 'error');
          return;
        }
        payload.amount = amountValue;
      } else if (vendorPaymentData.type === 'advance') {
        payload.advance = amountValue;
      } else if (vendorPaymentData.type === 'deduction') {
        payload.deduction = amountValue;
      }

      await api.post('/site/payments/vendor', payload);
      showToast('Vendor Payment Recorded', 'success');
      setShowForm(false);
      setVendorPaymentData({ vendorId: '', amount: '', type: 'wage', paymentMode: 'cash', remarks: '' });
      fetchVendorData();
    } catch (error) {
      showToast(error.response?.data?.error || 'Payment Failed', 'error');
    }
  };
  // ... Helper functions ...

  // RENDER SECTION - removing required
  // ...
  // This logic continues in the render part, but replace_file_content cannot skip lines easily.
  // I will have to do this in two chunks or be careful.
  // chunk 1: handlers


  const calculateTotals = () => {
    let history = [];
    if (activeTab === 'labour') history = labourHistory;
    if (activeTab === 'contractor') history = contractorHistory;
    if (activeTab === 'vendor') history = vendorHistory;

    const totalPaid = history.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalAdvance = history.reduce((sum, item) => sum + (item.advance || 0), 0);
    const totalDeduction = history.reduce((sum, item) => sum + (item.deduction || 0), 0);

    // Remaining Balance Logic
    let remaining = 0;
    if (filters.entityId) {
      if (activeTab === 'labour') {
        const l = labours.find(x => x._id === filters.entityId);
        remaining = l?.pendingPayout || 0;
      }
      if (activeTab === 'contractor') {
        const c = contractors.find(x => x._id === filters.entityId);
        remaining = c?.pendingAmount || 0;
      }
      if (activeTab === 'vendor') {
        const v = vendors.find(x => x._id === filters.entityId);
        remaining = v?.pendingAmount || 0;
      }
    }

    return { totalPaid, totalAdvance, totalDeduction, remaining };
  };

  const totals = calculateTotals();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payments</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          {showForm ? 'Cancel' : `New ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Payment`}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 font-medium text-sm text-gray-600">
        {['labour', 'contractor', 'vendor'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setShowForm(false); }}
            className={`mr-8 pb-3 capitalize ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-gray-900'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
          <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="border rounded p-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
          <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="border rounded p-2 text-sm" />
        </div>
        <div className="min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">Filter by {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</label>
          <select
            value={filters.entityId}
            onChange={e => setFilters({ ...filters, entityId: e.target.value })}
            className="w-full border rounded p-2 text-sm"
          >
            <option value="">All {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}s</option>
            {activeTab === 'labour' && labours.map(x => <option key={x._id} value={x._id}>{x.name}</option>)}
            {activeTab === 'contractor' && contractors.map(x => <option key={x._id} value={x._id}>{x.name}</option>)}
            {activeTab === 'vendor' && vendors.map(x => <option key={x._id} value={x._id}>{x.name}</option>)}
          </select>
        </div>
        <button
          onClick={() => setFilters({ startDate: '', endDate: '', entityId: '' })}
          className="px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-sm"
        >
          Clear Filters
        </button>
      </div>

      {/* Totals Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-500 uppercase font-semibold">Total Paid</p>
          <p className="text-xl font-bold text-gray-800">₹{totals.totalPaid}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <p className="text-xs text-green-500 uppercase font-semibold">Total Advance</p>
          <p className="text-xl font-bold text-gray-800">₹{totals.totalAdvance}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
          <p className="text-xs text-yellow-500 uppercase font-semibold">Total Deduction</p>
          <p className="text-xl font-bold text-gray-800">₹{totals.totalDeduction}</p>
        </div>
        {filters.entityId ? (
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <p className="text-xs text-red-500 uppercase font-semibold">Current Remaining</p>
            <p className="text-xl font-bold text-gray-800">₹{totals.remaining}</p>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 opacity-50">
            <p className="text-xs text-gray-500 uppercase font-semibold">Remaining</p>
            <p className="text-sm text-gray-500 mt-1">Select person to view</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          {activeTab === 'labour' && (
            <form onSubmit={handleLabourSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Labour</label>
                <select
                  value={labourPaymentData.labourId}
                  onChange={e => setLabourPaymentData({ ...labourPaymentData, labourId: e.target.value })}
                  required
                  className="w-full border rounded p-2"
                >
                  <option value="">Select Labour</option>
                  {labours.map(l => (
                    <option key={l._id} value={l._id}>{l.name} (Pending: ₹{l.pendingPayout || 0})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                <select
                  value={labourPaymentData.type}
                  onChange={e => setLabourPaymentData({ ...labourPaymentData, type: e.target.value })}
                  className="w-full border rounded p-2"
                >
                  <option value="wage">Wage Payment</option>
                  <option value="advance">Advance</option>
                  <option value="deduction">Deduction</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" required value={labourPaymentData.amount} onChange={e => setLabourPaymentData({ ...labourPaymentData, amount: e.target.value })} className="w-full border rounded p-2" placeholder="Enter amount" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <select value={labourPaymentData.paymentMode} onChange={e => setLabourPaymentData({ ...labourPaymentData, paymentMode: e.target.value })} className="w-full border rounded p-2">
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <input type="text" value={labourPaymentData.remarks} onChange={e => setLabourPaymentData({ ...labourPaymentData, remarks: e.target.value })} className="w-full border rounded p-2" />
              </div>
              <button type="submit" className="md:col-span-2 bg-green-500 text-white p-2 rounded hover:bg-green-600">Record Payment</button>
            </form>
          )}

          {activeTab === 'contractor' && (
            <form onSubmit={handleContractorSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contractor</label>
                <select
                  value={contractorPaymentData.contractorId}
                  onChange={e => setContractorPaymentData({ ...contractorPaymentData, contractorId: e.target.value })}
                  required
                  className="w-full border rounded p-2"
                >
                  <option value="">Select Contractor</option>
                  {contractors.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                <select
                  value={contractorPaymentData.type}
                  onChange={e => setContractorPaymentData({ ...contractorPaymentData, type: e.target.value })}
                  className="w-full border rounded p-2"
                >
                  <option value="wage">Payment</option>
                  <option value="advance">Advance</option>
                  <option value="deduction">Deduction</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" required value={contractorPaymentData.amount} onChange={e => setContractorPaymentData({ ...contractorPaymentData, amount: e.target.value })} className="w-full border rounded p-2" placeholder="Enter amount" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <input type="text" value={contractorPaymentData.remarks} onChange={e => setContractorPaymentData({ ...contractorPaymentData, remarks: e.target.value })} className="w-full border rounded p-2" />
              </div>
              <button type="submit" className="md:col-span-2 bg-green-500 text-white p-2 rounded hover:bg-green-600">Record Contractor Payment</button>
            </form>
          )}

          {activeTab === 'vendor' && (
            <form onSubmit={handleVendorSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <select
                  value={vendorPaymentData.vendorId}
                  onChange={e => setVendorPaymentData({ ...vendorPaymentData, vendorId: e.target.value })}
                  required
                  className="w-full border rounded p-2"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(v => (
                    <option key={v._id} value={v._id}>{v.name} (Pending: ₹{v.pendingAmount || 0})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                <select
                  value={vendorPaymentData.type}
                  onChange={e => setVendorPaymentData({ ...vendorPaymentData, type: e.target.value })}
                  className="w-full border rounded p-2"
                >
                  <option value="wage">Payment</option>
                  <option value="advance">Advance</option>
                  <option value="deduction">Deduction</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" required value={vendorPaymentData.amount} onChange={e => setVendorPaymentData({ ...vendorPaymentData, amount: e.target.value })} className="w-full border rounded p-2" placeholder="Enter amount" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <input type="text" value={vendorPaymentData.remarks} onChange={e => setVendorPaymentData({ ...vendorPaymentData, remarks: e.target.value })} className="w-full border rounded p-2" />
              </div>
              <button type="submit" className="md:col-span-2 bg-green-500 text-white p-2 rounded hover:bg-green-600">Record Vendor Payment</button>
            </form>
          )}
        </div>
      )}

      {/* List Display (Simplified for brevity, focused on features) */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <h3 className="font-bold text-gray-700 mb-4">
          {activeTab === 'labour' ? 'Recent Labour Payments' :
            activeTab === 'contractor' ? 'Contractor Payments History' : 'Vendor Payments History'}
        </h3>
        {/* ... Tables use history state which is now filtered ... */}

        {activeTab === 'labour' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-2">Date</th>
                  <th className="p-2">Labour</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Mode</th>
                  <th className="p-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {labourHistory.map(h => (
                  <tr key={h._id} className="border-t">
                    <td className="p-2">{new Date(h.createdAt).toLocaleDateString()}</td>
                    <td className="p-2">{h.labourId?.name || h.labourName}</td>
                    <td className="p-2 font-bold text-red-600">-₹{h.amount}</td>
                    <td className="p-2 capitalize">{h.paymentMode}</td>
                    <td className="p-2">{h.remarks || h.remark}</td>
                  </tr>
                ))}
                {labourHistory.length === 0 && <tr><td colSpan="5" className="p-4 text-center">No history</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'contractor' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-2">Date</th>
                  <th className="p-2">Contractor</th>
                  <th className="p-2">Project</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Mode</th>
                  <th className="p-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {contractorHistory.map(h => (
                  <tr key={h._id} className="border-t">
                    <td className="p-2">{new Date(h.date).toLocaleDateString()}</td>
                    <td className="p-2">{h.contractorId?.name || h.contractorName}</td>
                    <td className="p-2">{h.projectId?.name || '-'}</td>
                    <td className="p-2 font-bold text-red-600">-₹{h.amount}</td>
                    <td className="p-2 capitalize">{h.paymentMode}</td>
                    <td className="p-2">{h.remark}</td>
                  </tr>
                ))}
                {contractorHistory.length === 0 && <tr><td colSpan="6" className="p-4 text-center">No payment history found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'vendor' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-2">Date</th>
                  <th className="p-2">Vendor</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Mode</th>
                  <th className="p-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {vendorHistory.map(h => (
                  <tr key={h._id} className="border-t">
                    <td className="p-2">{new Date(h.date).toLocaleDateString()}</td>
                    <td className="p-2">{h.vendorId?.name}</td>
                    <td className="p-2 font-bold text-red-600">-₹{h.amount}</td>
                    <td className="p-2 capitalize">{h.paymentMode}</td>
                    <td className="p-2">{h.remarks}</td>
                  </tr>
                ))}
                {vendorHistory.length === 0 && <tr><td colSpan="5" className="p-4 text-center">No payment history found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default Payment;
