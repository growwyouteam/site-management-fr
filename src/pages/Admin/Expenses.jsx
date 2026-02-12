import { useState, useEffect } from 'react';
import { showToast } from '../../components/Toast';
import api from '../../services/api';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [banks, setBanks] = useState([]);
  const [creditors, setCreditors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState('all');
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    projectId: '',
    name: '',
    amount: '',
    voucherNumber: '',
    category: 'material',
    remarks: '',
    paymentMode: 'cash',
    bankId: '',
    creditorId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchExpenses();
    fetchExpenses();
    fetchBanks();
    fetchCreditors();
  }, []);

  const fetchExpenses = async () => {
    try {
      console.log('🔄 Fetching expenses data...');
      const startTime = Date.now();

      // Make all API calls in parallel for better performance
      const [expensesResponse, contractorsResponse] = await Promise.all([
        api.get('/admin/expenses'),
        api.get('/admin/contractors')
      ]);

      if (expensesResponse.data.success) {
        const expenses = expensesResponse.data.data;

        // If contractors exist, fetch their payments in parallel
        if (contractorsResponse.data.success && contractorsResponse.data.data.length > 0) {
          const contractors = contractorsResponse.data.data;

          // Fetch all contractor payments in parallel
          const contractorPaymentPromises = contractors.map(c =>
            api.get(`/admin/contractors/${c._id}/payments`)
          );

          const paymentResponses = await Promise.all(contractorPaymentPromises);
          const allPayments = paymentResponses.flatMap(res =>
            res.data.success ? res.data.data : []
          );

          const contractorExpenses = allPayments.map(payment => ({
            _id: payment._id,
            projectId: 'contractor',
            name: `Contractor Payment - ${payment.contractorName}`,
            amount: payment.amount,
            voucherNumber: `CP-${payment._id.slice(0, 8)}`,
            category: 'contractor',
            remarks: payment.remark || 'Contractor payment',
            createdAt: payment.createdAt,
            isContractorPayment: true
          }));

          setExpenses([...expenses, ...contractorExpenses]);
        } else {
          setExpenses(expenses);
        }

        console.log(`⚡ Expenses loaded in ${Date.now() - startTime}ms`);
      }
    } catch (error) {
      showToast('Failed to fetch expenses', 'error');
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/admin/projects');
      if (response.data.success) {
        setProjects(response.data.data);
        if (response.data.data.length > 0) {
          setFormData(prev => ({ ...prev, projectId: response.data.data[0]._id }));
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
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

    // Validation
    if (!formData.projectId) {
      showToast('Please select a project', 'error');
      return;
    }
    if (!formData.name.trim()) {
      showToast('Please enter expense name', 'error');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      showToast('Please enter valid amount', 'error');
      return;
    }
    if (!formData.voucherNumber.trim()) {
      showToast('Please enter voucher number', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const expenseData = {
        ...formData,
        amount: Number(formData.amount)
      };

      let response;
      if (editingExpense) {
        response = await api.put(`/admin/expenses/${editingExpense._id}`, expenseData);
        if (response.data.success) {
          showToast('Expense updated successfully', 'success');
        }
      } else {
        response = await api.post('/admin/expenses', expenseData);
        if (response.data.success) {
          showToast('Expense added successfully', 'success');
        }
      }

      if (response.data.success) {
        setShowForm(false);
        setEditingExpense(null);
        setFormData({
          projectId: projects[0]?._id || '',
          name: '',
          amount: '',
          voucherNumber: '',
          category: 'material',
          remarks: '',
          paymentMode: 'cash',
          bankId: '',
          creditorId: ''
        });
        fetchExpenses();
      }
    } catch (error) {
      showToast(error.response?.data?.error || `Failed to ${editingExpense ? 'update' : 'add'} expense`, 'error');
      console.error('Error saving expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, isContractorPayment) => {
    if (!confirm('Delete this expense?')) return;
    if (isContractorPayment) {
      showToast('Cannot delete contractor payments from here', 'error');
      return;
    }
    try {
      const response = await api.delete(`/admin/expenses/${id}`);
      if (response.data.success) {
        showToast('Expense deleted', 'success');
        fetchExpenses();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to delete expense', 'error');
      console.error('Error deleting expense:', error);
    }
  };

  const handleEdit = (expense) => {
    if (expense.isContractorPayment) {
      showToast('Cannot edit contractor payments', 'error');
      return;
    }
    setEditingExpense(expense);
    setFormData({
      projectId: expense.projectId,
      name: expense.name,
      amount: expense.amount,
      voucherNumber: expense.voucherNumber,
      category: expense.category,
      remarks: expense.remarks
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingExpense(null);
    setFormData({
      projectId: projects[0]?._id || '',
      name: '',
      amount: '',
      voucherNumber: '',
      category: 'material',
      remarks: '',
      paymentMode: 'cash',
      bankId: '',
      creditorId: ''
    });
  };

  const filteredExpenses = expenses.filter(e => {
    const pId = typeof e.projectId === 'object' ? e.projectId?._id : e.projectId;
    const matchesProject = selectedProject === 'all' || pId === selectedProject;

    if (!searchQuery) return matchesProject;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      e.name?.toLowerCase().includes(query) ||
      e.voucherNumber?.toLowerCase().includes(query) ||
      e.category?.toLowerCase().includes(query) ||
      e.amount?.toString().includes(query);

    return matchesProject && matchesSearch;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Expenses</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          {showForm ? 'Cancel' : 'Add Expense'}
        </button>

        <input
          type="text"
          placeholder="Search expenses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
        />

        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Projects</option>
          {projects.map(p => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingExpense ? 'Edit Expense' : 'Add New Expense'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expense Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Cement Purchase"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Amount"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="material">Material</option>
                <option value="labour">Labour</option>
                <option value="machinery">Machinery</option>
                <option value="transport">Transport</option>
                <option value="contractor">Contractor</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Voucher Number</label>
              <input
                type="text"
                value={formData.voucherNumber}
                onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })}
                placeholder="Required"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">💵 Cash</option>
                <option value="upi">📱 UPI</option>
                <option value="bank">🏦 Bank Transfer</option>
                <option value="check">📝 Check</option>
                <option value="other">🔹 Other</option>
              </select>
            </div>

            {/* Bank Account Selection - Shows when UPI/Bank/Check selected */}
            {['upi', 'bank', 'check'].includes(formData.paymentMode) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Bank Account</label>
                <select
                  required
                  value={formData.bankId}
                  onChange={(e) => setFormData({ ...formData, bankId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            {formData.paymentMode === 'cash' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Creditor (Optional)</label>
                <select
                  value={formData.creditorId}
                  onChange={(e) => setFormData({ ...formData, creditorId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Creditor (Optional) --</option>
                  {creditors.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <input
                type="text"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Optional remarks"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
            >
              {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
              {isSubmitting ? 'Processing...' : (editingExpense ? 'Update Expense' : 'Add Expense')}
            </button>
            {editingExpense && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {selectedProject === 'all' ? 'All Expenses' : 'Project Expenses'}
        </h2>

        {/* Mobile View */}
        <div className="block md:hidden space-y-3">
          {filteredExpenses.map(e => (
            <div key={e._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-bold text-gray-900 mb-2">{e.name}</div>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Project:</span> {typeof e.projectId === 'object' ? e.projectId?.name : e.projectId}</div>
                <div><span className="font-medium">Added By:</span> {e.addedBy?.name || 'Admin'}</div>
                <div><span className="font-medium">Amount:</span> <span className="text-red-600 font-bold">₹{e.amount?.toLocaleString()}</span></div>
                <div><span className="font-medium">Category:</span>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${e.category === 'material' ? 'bg-blue-100 text-blue-800' :
                    e.category === 'labour' ? 'bg-green-100 text-green-800' :
                      e.category === 'machinery' ? 'bg-purple-100 text-purple-800' :
                        e.category === 'transport' ? 'bg-yellow-100 text-yellow-800' :
                          e.category === 'contractor' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                    }`}>
                    {e.category?.charAt(0).toUpperCase() + e.category?.slice(1) || 'N/A'}
                  </span>
                </div>
                <div><span className="font-medium">Voucher:</span> {e.voucherNumber || 'N/A'}</div>
                <div><span className="font-medium">Date:</span> {new Date(e.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="mt-3 flex gap-2">
                {!e.isContractorPayment && (
                  <button
                    onClick={() => handleEdit(e)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600"
                  >
                    ✏️ Edit
                  </button>
                )}
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Added By</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Voucher</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(e => (
                <tr key={e._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3">{typeof e.projectId === 'object' ? e.projectId?.name : e.projectId}</td>
                  <td className="px-4 py-3">{e.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.addedBy?.name || 'Admin'}</td>
                  <td className="px-4 py-3 capitalize">{e.category || 'N/A'}</td>
                  <td className="px-4 py-3 font-bold text-red-600">₹{e.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3">{e.voucherNumber || 'N/A'}</td>
                  <td className="px-4 py-3">{new Date(e.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {/* Delete button removed as per request */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
