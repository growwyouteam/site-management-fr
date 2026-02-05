import { useState, useEffect } from 'react';
import optimizedApi from '../../services/optimizedApi';

// Utility function to format date in Indian format
const formatIndianDateTime = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch (e) {
    return '-';
  }
};

const formatIndianDate = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  } catch (e) {
    return '-';
  }
};

// Capital Type Selection Modal
const CapitalTypeSelectionModal = ({ onClose, onSelect }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 border-b border-blue-700">
          <h3 className="text-xl font-bold text-white">Select Capital Type</h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-600 mb-4">Choose the type of capital you want to add:</p>

          <button
            onClick={() => onSelect('other')}
            className="w-full p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 border-2 border-indigo-300 rounded-xl transition-all transform hover:scale-105 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">💰</div>
              <div>
                <div className="font-bold text-gray-800 text-lg">Other Capital</div>
                <div className="text-sm text-gray-600">General capital injection, investments, etc.</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelect('machine')}
            className="w-full p-4 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-2 border-orange-300 rounded-xl transition-all transform hover:scale-105 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">🚜</div>
              <div>
                <div className="font-bold text-gray-800 text-lg">Machine/Equipment Capital</div>
                <div className="text-sm text-gray-600">Capital for rented machines & equipment</div>
              </div>
            </div>
          </button>

          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};


const AddTransactionModal = ({ type, onClose, onSuccess, banks }) => {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    paymentMode: 'cash', // default
    date: new Date().toISOString().split('T')[0],
    category: type === 'capital' ? 'capital' : type === 'expense' ? 'expense' : 'other',
    type: type === 'capital' ? 'credit' : 'debit', // default based on card
    bankId: '',
    creditorId: '',
    projectId: ''
  });
  const [loading, setLoading] = useState(false);
  const [creditors, setCreditors] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    // Set defaults based on type
    if (type === 'capital') {
      setFormData(prev => ({ ...prev, category: 'capital', type: 'credit', paymentMode: 'bank', description: 'Capital Injection' }));
    } else if (type === 'expense') {
      setFormData(prev => ({ ...prev, category: 'expense', type: 'debit', paymentMode: 'cash', description: 'Expense' }));
    } else if (type === 'bank') {
      setFormData(prev => ({ ...prev, category: 'other', type: 'credit', paymentMode: 'bank', description: 'Bank Deposit' }));
    } else if (type === 'cash') {
      setFormData(prev => ({ ...prev, category: 'other', type: 'debit', paymentMode: 'cash', description: 'Cash Withdrawal' }));
    }
    fetchCreditors();
    fetchCreditors();
    if (type === 'capital' || type === 'expense') {
      fetchProjects();
    }
  }, [type]);

  const fetchProjects = async () => {
    try {
      const response = await optimizedApi.getProjects();
      if (response.data.success) {
        setProjects(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchCreditors = async () => {
    try {
      const response = await optimizedApi.get('/admin/creditors');
      if (response.data.success) {
        setCreditors(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching creditors:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = type === 'capital' ? '/admin/accounts/capital' : '/admin/accounts/transaction';
      // Actually addTransaction handles all, addCapital is just an alias or specific route.
      // Let's use the generic transaction endpoint for flexibility if backend supports it.
      // adminController has addTransaction.
      // admin/routes has router.post('/accounts/transaction', addTransaction);
      // router.post('/accounts/capital', addCapital);

      // Combine selected date with current time
      const selectedDate = new Date(formData.date);
      const now = new Date();
      selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      const res = await optimizedApi.post(endpoint, {
        ...formData,
        date: selectedDate.toISOString(), // Send full ISO string with time
        category: formData.category,
        type: formData.type,
        category: formData.category,
        type: formData.type,
        creditorId: formData.creditorId || undefined,
        projectId: formData.projectId || undefined
      });

      if (res.data.success) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  const showBankDropdown = ['bank', 'online', 'check', 'upi'].includes(formData.paymentMode);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800 capitalize">Add {type} Transaction</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₹</span>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                disabled={type === 'capital' || type === 'expense'}
              >
                {(type === 'capital' || formData.type === 'credit') && <option value="credit">Credit (In)</option>}
                {(type === 'expense' || type === 'debit' || formData.type === 'debit') && <option value="debit">Debit (Out)</option>}
                {!['capital', 'expense'].includes(type) && (
                  <>
                    <option value="credit">Credit (In)</option>
                    <option value="debit">Debit (Out)</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
              <select
                value={formData.paymentMode}
                onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="online">Online/UPI</option>
                <option value="check">Check</option>
              </select>
            </div>
            {/* Project Selection for Capital & Expense */}
            {(type === 'capital' || type === 'expense') && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
                <select
                  value={formData.projectId}
                  onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Project (Optional) --</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Creditor Selection - Shows when Cash selected */}
          {formData.paymentMode === 'cash' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Creditor (Optional)</label>
              <select
                value={formData.creditorId}
                onChange={e => setFormData({ ...formData, creditorId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Creditor (Optional) --</option>
                {creditors.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {showBankDropdown && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Bank</label>
              <select
                required
                value={formData.bankId}
                onChange={e => setFormData({ ...formData, bankId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Bank Account --</option>
                {banks.map(bank => (
                  <option key={bank._id} value={bank._id}>
                    {bank.bankName} - {bank.holderName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              required
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none"
              rows="3"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div >
    </div >
  );
};


const MachineEquipmentCapitalForm = ({ onCancel, onSuccess, banks }) => {
  const [machineType, setMachineType] = useState('');
  const [machines, setMachines] = useState([]);
  const [formData, setFormData] = useState({
    machineId: '',
    amount: '',
    description: '',
    paymentMode: 'bank',
    date: new Date().toISOString().split('T')[0],
    bankId: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (machineType) {
      fetchMachines();
    }
  }, [machineType]);

  const fetchMachines = async () => {
    try {
      const res = await optimizedApi.get('/admin/machines');
      if (res.data.success) {
        const filtered = res.data.data.filter(m => {
          if (machineType === 'machine') {
            return m.ownershipType === 'rented' && (m.category === 'big' || m.category === 'lab');
          } else if (machineType === 'equipment') {
            return m.ownershipType === 'rented' && (m.category === 'equipment' || m.category === 'consumables');
          }
          return false;
        });
        setMachines(filtered);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const selectedMachine = machines.find(m => m._id === formData.machineId);
      const res = await optimizedApi.post('/admin/accounts/transaction', {
        ...formData,
        category: 'capital',
        type: 'credit',
        description: formData.description || `Capital for ${selectedMachine?.name || 'Machine/Equipment'}`
      });
      if (res.data.success) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error adding machine capital:', error);
      alert('Failed to add capital');
    } finally {
      setLoading(false);
    }
  };

  const showBankDropdown = ['bank', 'online', 'check', 'upi'].includes(formData.paymentMode);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-orange-200 animate-fade-in-down">
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-orange-200">
        <h3 className="text-2xl font-bold text-gray-800">🚜 Machine/Equipment Capital</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
            <select
              required
              value={machineType}
              onChange={(e) => {
                setMachineType(e.target.value);
                setFormData({ ...formData, machineId: '' });
              }}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Select Type</option>
              <option value="machine">Machine</option>
              <option value="equipment">Equipment</option>
            </select>
          </div>

          {machineType && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select {machineType === 'machine' ? 'Machine' : 'Equipment'}
              </label>
              <select
                required
                value={formData.machineId}
                onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select {machineType === 'machine' ? 'Machine' : 'Equipment'}</option>
                {machines.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.name} {m.plateNumber ? `[${m.plateNumber}]` : ''} - {m.vendorName || 'Rented'}
                  </option>
                ))}
              </select>
              {machines.length === 0 && (
                <p className="text-sm text-orange-600 mt-1 font-medium">
                  No rented {machineType === 'machine' ? 'machines' : 'equipment'} found
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500 font-bold text-lg">₹</span>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Mode</label>
            <select
              value={formData.paymentMode}
              onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="online">Online/UPI</option>
              <option value="check">Check</option>
            </select>
          </div>
        </div>

        {showBankDropdown && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Bank</label>
            <select
              required
              value={formData.bankId}
              onChange={e => setFormData({ ...formData, bankId: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">-- Select Bank Account --</option>
              {banks.map(bank => (
                <option key={bank._id} value={bank._id}>
                  {bank.bankName} - {bank.holderName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
          <textarea
            required
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            rows="3"
            placeholder="e.g., Capital payment for rented JCB"
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50 transition-colors shadow-md hover:shadow-lg"
          >
            {loading ? 'Saving...' : 'Add Capital'}
          </button>
        </div>
      </form>
    </div>
  );
};

const Accounts = () => {
  const [data, setData] = useState(null);
  const [banks, setBanks] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [showCapitalTypeModal, setShowCapitalTypeModal] = useState(false);
  const [showMachineCapitalModal, setShowMachineCapitalModal] = useState(false);
  const [modalType, setModalType] = useState('capital');
  const [managers, setManagers] = useState([]);

  const [selectedFilter, setSelectedFilter] = useState('all'); // all, capital, expense, bank, cash
  const [dateFilter, setDateFilter] = useState('all'); // all, today, last7days, last15days, custom
  const [managerFilter, setManagerFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    fetchAccounts();
    fetchManagers();
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      console.log('🏦 Fetching banks...');
      const response = await optimizedApi.get('/admin/bank-details');
      console.log('🏦 Bank response:', response.data);
      if (response.data.success) {
        setBanks(response.data.data);
        console.log('🏦 Banks set:', response.data.data);
      }
    } catch (error) {
      console.error('❌ Error fetching banks:', error);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [dateFilter, managerFilter, customStartDate, customEndDate]);

  const fetchManagers = async () => {
    try {
      const res = await optimizedApi.getUsers();
      if (res.data.success) {
        // Include both site managers and admins
        setManagers(res.data.data.filter(u => u.role === 'sitemanager' || u.role === 'admin'));
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate = null;
    let endDate = null;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'last7days':
        endDate = new Date();
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'last15days':
        endDate = new Date();
        startDate = new Date(now.setDate(now.getDate() - 15));
        break;
      case 'custom':
        if (customStartDate) startDate = new Date(customStartDate);
        if (customEndDate) endDate = new Date(customEndDate);
        break;
      default:
        return {};
    }

    return { startDate: startDate?.toISOString(), endDate: endDate?.toISOString() };
  };

  const fetchAccounts = async () => {
    try {
      console.log('🚀 Fetching accounts data with optimization...');
      const startTime = Date.now();

      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams();

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (managerFilter !== 'all') params.append('managerId', managerFilter);

      const queryString = params.toString();
      const url = `/admin/accounts${queryString ? `?${queryString}` : ''}`;

      const response = await optimizedApi.get(url);

      if (response.data.success) {
        setData(response.data.data);
        console.log(`⚡ Accounts loaded in ${Date.now() - startTime}ms`);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const getFilteredTransactions = () => {
    if (!data?.transactions) return [];

    let filtered = data.transactions;

    if (selectedFilter === 'capital') {
      filtered = filtered.filter(t => t.category === 'capital');
    } else if (selectedFilter === 'expense') {
      filtered = filtered.filter(t => t.category === 'expense');
    } else if (selectedFilter === 'bank') {
      filtered = filtered.filter(t => ['bank', 'online', 'check', 'upi'].includes(t.paymentMode));
    } else if (selectedFilter === 'cash') {
      filtered = filtered.filter(t => t.paymentMode === 'cash');
    }

    // Sort by date descending (Newest First)
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Accounts & Finance</h1>

      </div>

      {/* Filter Controls - Professional Design */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          {/* Date Range Filter */}
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📅 Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white font-medium text-gray-700"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last15days">Last 15 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                />
              </div>
            </>
          )}

          {/* Site Manager Filter - Only show when viewing expenses */}
          {selectedFilter === 'expense' && (
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                👤 Filter by User
              </label>
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-white font-medium text-gray-700"
              >
                <option value="all">All Users</option>
                {managers.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.role === 'admin' ? 'Admin' : 'Site Manager'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          onClick={() => setSelectedFilter('capital')}
          className={`p-5 md:p-6 rounded-xl shadow-md cursor-pointer transition-all transform hover:scale-105 ${selectedFilter === 'capital' ? 'ring-4 ring-blue-300' : ''} bg-blue-500 text-white`}
        >
          <h3 className="text-sm font-medium opacity-90 mb-2">Capital</h3>
          <p className="text-2xl md:text-3xl font-bold">₹{data?.capital?.toLocaleString() || 0}</p>
        </div>
        <div
          onClick={() => setSelectedFilter('expense')}
          className={`p-5 md:p-6 rounded-xl shadow-md cursor-pointer transition-all transform hover:scale-105 ${selectedFilter === 'expense' ? 'ring-4 ring-red-300' : ''} bg-red-500 text-white`}
        >
          <h3 className="text-sm font-medium opacity-90 mb-2">Total Expenses</h3>
          <p className="text-2xl md:text-3xl font-bold">₹{data?.totalExpenses?.toLocaleString() || 0}</p>
        </div>
        <div
          onClick={() => setSelectedFilter('cash')}
          className={`p-5 md:p-6 rounded-xl shadow-md cursor-pointer transition-all transform hover:scale-105 ${selectedFilter === 'cash' ? 'ring-4 ring-orange-300' : ''} bg-orange-500 text-white`}
        >
          <h3 className="text-sm font-medium opacity-90 mb-2">Cash Transactions</h3>
          <p className="text-2xl md:text-3xl font-bold">₹{data?.totalCashTransactions?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={() => setShowCapitalTypeModal(true)}
          className="flex-1 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 px-4 py-3 rounded-xl font-medium shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span> Add Capital
        </button>
        <button
          onClick={() => { setModalType('expense'); setShowAddModal(true); }}
          className="flex-1 bg-white border border-red-200 text-red-700 hover:bg-red-50 px-4 py-3 rounded-xl font-medium shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <span className="text-xl">-</span> Add Expense
        </button>

        <button
          onClick={() => { setModalType('cash'); setShowAddModal(true); }}
          className="flex-1 bg-white border border-orange-200 text-orange-700 hover:bg-orange-50 px-4 py-3 rounded-xl font-medium shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <span className="text-xl">⇄</span> Cash Entry
        </button>
        {/* <button
          onClick={() => { setModalType('bank'); setShowAddModal(true); }}
          className="flex-1 bg-white border border-green-200 text-green-700 hover:bg-green-50 px-4 py-3 rounded-xl font-medium shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span> Bank Deposit
        </button> */}
      </div>

      {/* Machine/Equipment Capital Form - Inline */}
      {showMachineCapitalModal && (
        <MachineEquipmentCapitalForm
          banks={banks}
          onCancel={() => setShowMachineCapitalModal(false)}
          onSuccess={() => {
            setShowMachineCapitalModal(false);
            fetchAccounts();
          }}
        />
      )}

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {selectedFilter === 'all' ? 'All Transactions (Day Book)' :
              selectedFilter === 'capital' ? 'Capital History' :
                selectedFilter === 'expense' ? 'Expense Records' :
                  selectedFilter === 'bank' ? 'Bank Transactions' : 'Cash Transactions'}
          </h2>
          {selectedFilter !== 'all' && (
            <button
              onClick={() => setSelectedFilter('all')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Show All
            </button>
          )}
        </div>

        {/* Mobile View */}
        <div className="block md:hidden space-y-3">
          {getFilteredTransactions().map((t, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-gray-900">{t.description}</div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {t.type === 'credit' ? 'CREDIT' : 'DEBIT'}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Amount:</span> <span className={`font-bold ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>₹{t.amount?.toLocaleString()}</span></div>
                <div><span className="font-medium">Date & Time:</span> {formatIndianDateTime(t.date)}</div>
                <div><span className="font-medium">Mode:</span> <span className="capitalize">{t.paymentMode}</span></div>
                <div><span className="font-medium">Source:</span> {t.source}</div>
              </div>
            </div>
          ))}
          {getFilteredTransactions().length === 0 && (
            <div className="text-center py-8 text-gray-500">No transactions found</div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date & Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Source</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mode</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredTransactions().map((t, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 text-sm">{formatIndianDateTime(t.date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.description}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">{t.source}</span>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{t.paymentMode}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${t.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{t.amount?.toLocaleString()}
                  </td>
                </tr>
              ))}
              {getFilteredTransactions().length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">No transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {
        showAddModal && (
          <AddTransactionModal
            type={modalType}
            banks={banks}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              fetchAccounts();
            }}
          />
        )
      }



      {
        showCapitalTypeModal && (
          <CapitalTypeSelectionModal
            onClose={() => setShowCapitalTypeModal(false)}
            onSelect={(type) => {
              setShowCapitalTypeModal(false);
              if (type === 'other') {
                setModalType('capital');
                setShowAddModal(true);
              } else if (type === 'machine') {
                setShowMachineCapitalModal(true);
              }
            }}
          />
        )
      }


    </div >
  );
};


export default Accounts;
