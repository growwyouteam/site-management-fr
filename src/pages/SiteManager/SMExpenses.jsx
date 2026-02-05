import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';

const SMExpenses = () => {
  const { user } = useAuth();
  const { selectedProject } = useSiteManager();
  const baseUrl = user?.role === 'admin' ? '/admin' : '/site';
  const [projects, setProjects] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ projectId: '', name: '', amount: '', voucherNumber: '', remarks: '', receipt: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []); // Fetch data on mount

  useEffect(() => {
    if (selectedProject) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]); // Re-fetch when selected project changes

  const fetchData = async () => {
    try {
      const [projectsRes, expensesRes] = await Promise.all([
        api.get(`${baseUrl}/projects`),
        api.get(`${baseUrl}/expenses`)
      ]);

      if (projectsRes.data.success) {
        let filteredProjects = projectsRes.data.data;
        if (selectedProject) {
          filteredProjects = projectsRes.data.data.filter(p => p._id === selectedProject._id);
        }
        setProjects(filteredProjects);
        if (filteredProjects.length > 0) {
          setFormData(prev => ({ ...prev, projectId: filteredProjects[0]._id }));
        }
      }

      if (expensesRes.data.success) {
        let filteredExpenses = expensesRes.data.data;
        console.log('🔍 Expenses - Selected Project:', selectedProject?.name);
        console.log('📊 Total expenses before filter:', expensesRes.data.data.length);
        if (selectedProject) {
          filteredExpenses = expensesRes.data.data.filter(e => {
            const expenseProjectId = typeof e.projectId === 'object' ? e.projectId._id : e.projectId;
            return expenseProjectId === selectedProject._id;
          });
          console.log(`✅ Filtered ${filteredExpenses.length} expenses for project: ${selectedProject.name}`);
        }
        setExpenses(filteredExpenses);
      }
    } catch (error) {
      showToast('Failed to fetch data', 'error');
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await api.post(`${baseUrl}/expenses`, {
        ...formData,
        amount: Number(formData.amount) || 0
      });

      if (response.data.success) {
        showToast('Expense added successfully', 'success');
        setShowForm(false);
        setFormData({ projectId: projects[0]?._id || '', name: '', amount: '', voucherNumber: '', remarks: '', receipt: '' });
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to add expense', 'error');
      console.error('Error adding expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceipt = (file) => {
    if (!file) return setFormData(prev => ({ ...prev, receipt: '' }));
    const reader = new FileReader();
    reader.onload = () => setFormData(prev => ({ ...prev, receipt: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Expenses</h1>
      <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
        {showForm ? 'Cancel' : 'Add Expense'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-5 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
              <select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expense Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Material Purchase" required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
              <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="Amount" required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Voucher Number</label>
              <input type="text" value={formData.voucherNumber} onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })} placeholder="Optional" disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Receipt</label>
              <input type="file" accept="image/*" onChange={(e) => handleReceipt(e.target.files?.[0])} disabled={isSubmitting} className="w-full disabled:cursor-not-allowed" />
              {formData.receipt && <img src={formData.receipt} alt="Receipt" className="mt-2 h-24 w-24 object-cover rounded border" />}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} placeholder="Optional remarks" disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] disabled:bg-gray-100" />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`mt-5 px-6 py-3 text-white rounded-lg transition-colors font-semibold flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
            {isSubmitting ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      )}

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Expense Records</h2>

        {/* Mobile View */}
        <div className="block md:hidden space-y-3">
          {expenses.map(e => (
            <div key={e._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-bold text-gray-900 mb-2">{e.name}</div>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Project:</span> {typeof e.projectId === 'object' ? e.projectId?.name : e.projectId}</div>
                <div><span className="font-medium">Amount:</span> <span className="font-bold text-red-600">₹{e.amount?.toLocaleString()}</span></div>
                <div><span className="font-medium">Voucher:</span> {e.voucherNumber || 'N/A'}</div>
                <div><span className="font-medium">Date:</span> {new Date(e.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Project</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Voucher</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3">{typeof e.projectId === 'object' ? e.projectId?.name : e.projectId}</td>
                  <td className="px-4 py-3 font-medium">{e.name}</td>
                  <td className="px-4 py-3 font-bold text-red-600">₹{e.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3">{e.voucherNumber || 'N/A'}</td>
                  <td className="px-4 py-3">{new Date(e.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SMExpenses;
