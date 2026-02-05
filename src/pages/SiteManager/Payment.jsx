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
  const [labourPaymentData, setLabourPaymentData] = useState({ labourId: '', amount: '', paymentMode: 'cash', remarks: '' });
  const [labourHistory, setLabourHistory] = useState([]);

  // Contractor Data
  const [contractors, setContractors] = useState([]);
  const [contractorPaymentData, setContractorPaymentData] = useState({ contractorId: '', amount: '', paymentMode: 'cash', remarks: '' });

  // Vendor Data
  const [vendors, setVendors] = useState([]);
  const [vendorPaymentData, setVendorPaymentData] = useState({ vendorId: '', amount: '', paymentMode: 'cash', remarks: '' });

  useEffect(() => {
    fetchCommonData();
  }, []);

  useEffect(() => {
    if (activeTab === 'labour') fetchLabourData();
    if (activeTab === 'contractor') fetchContractorData();
    if (activeTab === 'vendor') fetchVendorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, activeTab]);

  const fetchCommonData = async () => {
    try {
      const res = await api.get('/admin/bank-details'); // Using admin route if allowable, or need site route
      // Wait, site manager might not see admin banks?
      // For now, let's assume simple modes like 'cash' or manual bank entry if needed.
      // But typically check valid banks.
      // Assuming 'cash' is primary for Site Manager or simple text for now if bank list Restricted.
    } catch (error) {
      // Ignore
    }
  };

  const fetchLabourData = async () => {
    try {
      setLoading(true);
      const query = selectedProject ? `?projectId=${selectedProject._id}` : '';
      const [labourRes, historyRes] = await Promise.all([
        api.get(`/site/labours${query}`),
        api.get(`/site/payments`)
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
      const res = await api.get('/site/contractors');
      if (res.data.success) {
        // Filter by selected project if needed, or backend already handled generic list
        // Backend `getContractors` returns those assigned to ANY of user's sites.
        // We can further filter by `selectedProject` if we want really strict view.
        let conts = res.data.data;
        if (selectedProject) {
          conts = conts.filter(c => c.assignedProjects.includes(selectedProject._id));
        }
        setContractors(conts);
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
      const res = await api.get('/site/vendors');
      if (res.data.success) {
        setVendors(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLabourSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/site/payments', {
        ...labourPaymentData,
        projectId: selectedProject._id
      });
      showToast('Labour Payment Recorded', 'success');
      setShowForm(false);
      setLabourPaymentData({ labourId: '', amount: '', paymentMode: 'cash', remarks: '' });
      fetchLabourData();
    } catch (error) {
      showToast(error.response?.data?.error || 'Payment Failed', 'error');
    }
  };

  const handleContractorSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/site/payments/contractor', {
        ...contractorPaymentData,
        projectId: selectedProject._id
      });
      showToast('Contractor Payment Recorded', 'success');
      setShowForm(false);
      setContractorPaymentData({ contractorId: '', amount: '', paymentMode: 'cash', remarks: '' });
    } catch (error) {
      showToast(error.response?.data?.error || 'Payment Failed', 'error');
    }
  };

  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/site/payments/vendor', {
        ...vendorPaymentData
      });
      showToast('Vendor Payment Recorded', 'success');
      setShowForm(false);
      setVendorPaymentData({ vendorId: '', amount: '', paymentMode: 'cash', remarks: '' });
      fetchVendorData(); // Update pending amounts logic if we had it displayed
    } catch (error) {
      showToast(error.response?.data?.error || 'Payment Failed', 'error');
    }
  };

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
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" required value={labourPaymentData.amount} onChange={e => setLabourPaymentData({ ...labourPaymentData, amount: e.target.value })} className="w-full border rounded p-2" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" required value={contractorPaymentData.amount} onChange={e => setContractorPaymentData({ ...contractorPaymentData, amount: e.target.value })} className="w-full border rounded p-2" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" required value={vendorPaymentData.amount} onChange={e => setVendorPaymentData({ ...vendorPaymentData, amount: e.target.value })} className="w-full border rounded p-2" />
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
            activeTab === 'contractor' ? 'Contractors List' : 'Vendors List'}
        </h3>

        {activeTab === 'labour' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-2">Date</th>
                  <th className="p-2">Labour</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {labourHistory.map(h => (
                  <tr key={h._id} className="border-t">
                    <td className="p-2">{new Date(h.date).toLocaleDateString()}</td>
                    <td className="p-2">{h.labourId?.name}</td>
                    <td className="p-2 font-bold text-red-600">-₹{h.amount}</td>
                    <td className="p-2">{h.remarks}</td>
                  </tr>
                ))}
                {labourHistory.length === 0 && <tr><td colSpan="4" className="p-4 text-center">No history</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'contractor' && (
          <div className="text-gray-500 text-sm">Payment history for contractors is available in Wallet History.</div>
        )}
        {activeTab === 'vendor' && (
          <div className="text-gray-500 text-sm">Payment history for vendors is available in Wallet History.</div>
        )}
      </div>

    </div>
  );
};

export default Payment;
