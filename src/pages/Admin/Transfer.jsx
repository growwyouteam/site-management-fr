import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';

const Transfer = () => {
  const [transfers, setTransfers] = useState([]);
  const [projects, setProjects] = useState([]);

  // Raw Data
  const [allLabours, setAllLabours] = useState([]);
  const [allMachines, setAllMachines] = useState([]); // Includes big machines
  const [allStocks, setAllStocks] = useState([]);
  const [allLabEquipments, setAllLabEquipments] = useState([]);
  const [allConsumables, setAllConsumables] = useState([]);
  const [allEquipments, setAllEquipments] = useState([]);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'labour',
    itemId: '',
    fromProject: '',
    toProject: '',
    quantity: 1
  });

  // Derived/Filtered State
  const [availableItems, setAvailableItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Filter items whenever fromProject or type changes
  useEffect(() => {
    if (!formData.fromProject || !formData.type) {
      setAvailableItems([]);
      return;
    }

    let filtered = [];
    const pid = formData.fromProject;

    switch (formData.type) {
      case 'labour':
        // Handle both populated object and direct ID
        filtered = allLabours.filter(l => {
          const siteId = typeof l.assignedSite === 'object' ? l.assignedSite?._id : l.assignedSite;
          return siteId === pid && l.active;
        });
        break;
      case 'machine':
        // Handle both populated object and direct ID
        filtered = allMachines.filter(m => {
          const projId = typeof m.projectId === 'object' ? m.projectId?._id : m.projectId;
          return projId === pid;
        });
        break;
      case 'stock':
        // Handle both populated object and direct ID
        filtered = allStocks.filter(s => {
          const projId = typeof s.projectId === 'object' ? s.projectId?._id : s.projectId;
          return projId === pid && s.quantity > 0;
        });
        break;
      case 'lab-equipment':
        // Handle both populated object and direct ID
        filtered = allLabEquipments.filter(e => {
          const projId = typeof e.projectId === 'object' ? e.projectId?._id : e.projectId;
          return projId === pid;
        });
        break;
      case 'consumable-goods':
        // Handle both populated object and direct ID
        filtered = allConsumables.filter(c => {
          const projId = typeof c.projectId === 'object' ? c.projectId?._id : c.projectId;
          return projId === pid && c.quantity > 0;
        });
        break;
      case 'equipment':
        // Handle both populated object and direct ID
        filtered = allEquipments.filter(e => {
          const projId = typeof e.projectId === 'object' ? e.projectId?._id : e.projectId;
          return projId === pid;
        });
        break;
      default:
        filtered = [];
    }
    setAvailableItems(filtered);

    // Reset selected item
    setFormData(prev => ({ ...prev, itemId: '' }));

  }, [formData.fromProject, formData.type, allLabours, allMachines, allStocks, allLabEquipments, allConsumables, allEquipments]);


  const fetchData = async () => {
    try {
      const results = await Promise.all([
        api.get('/admin/transfers'),
        api.get('/admin/projects'),
        api.get('/admin/labours'),
        api.get('/admin/machines'),
        api.get('/admin/stocks'),
        api.get('/admin/lab-equipments'),
        api.get('/admin/consumable-goods'),
        api.get('/admin/equipments')
      ]);

      const [transfersRes, projectsRes, laboursRes, machinesRes, stocksRes, labEquipmentsRes, consumableGoodsRes, equipmentsRes] = results;

      if (transfersRes.data.success) setTransfers(transfersRes.data.data);
      if (projectsRes.data.success) {
        setProjects(projectsRes.data.data);
        // Initialize fromProject if empty
        if (projectsRes.data.data.length > 0 && !formData.fromProject) {
          setFormData(prev => ({ ...prev, fromProject: projectsRes.data.data[0]._id }));
        }
      }

      if (laboursRes.data.success) setAllLabours(laboursRes.data.data);
      if (machinesRes.data.success) setAllMachines(machinesRes.data.data.filter(m => m.category === 'big'));
      if (stocksRes.data.success) setAllStocks(stocksRes.data.data);
      if (labEquipmentsRes.data.success) setAllLabEquipments(labEquipmentsRes.data.data);
      if (consumableGoodsRes.data.success) setAllConsumables(consumableGoodsRes.data.data);
      if (equipmentsRes.data.success) setAllEquipments(equipmentsRes.data.data);

    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error loading data', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.fromProject || !formData.toProject || !formData.itemId) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    if (formData.fromProject === formData.toProject) {
      showToast('Source and destination projects cannot be the same', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/admin/transfers', formData);
      if (response.data.success) {
        showToast('Transfer completed successfully', 'success');
        setShowForm(false);
        // Reset form but keep filtered project
        setFormData({ ...formData, itemId: '', quantity: 1, type: 'labour' });
        fetchData(); // Refresh data to reflect moves
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Transfer failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Resource Transfer</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
        >
          {showForm ? 'Cancel Transfer' : '➕ New Transfer'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8 animate-fade-in-down">
          <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-100">New Transfer Request</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* 1. From Project */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">From Project (Source)</label>
              <select
                value={formData.fromProject}
                onChange={(e) => setFormData({ ...formData, fromProject: e.target.value, itemId: '' })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              >
                <option value="">Select Source Project</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* 2. Transfer Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value, itemId: '' })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="labour">👷 Labour</option>
                <option value="machine">🚜 Big Machine</option>
                <option value="stock">🧱 Stock Material</option>
                <option value="lab-equipment">🧪 Lab Equipment</option>
                <option value="consumable-goods">📦 Consumable Goods</option>
                <option value="equipment">🔧 Equipment</option>
              </select>
            </div>

            {/* 3. Item Selection (Filtered) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Item ({availableItems.length} available)
              </label>
              <select
                value={formData.itemId}
                onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              >
                <option value="">-- Select Item to Transfer --</option>
                {availableItems.map(item => (
                  <option key={item._id} value={item._id}>
                    {item.name || item.materialName || item.itemName}
                    {item.quantity ? ` (Qty: ${item.quantity} ${item.unit || ''})` : ''}
                    {item.dailyWage ? ` (Wage: ₹${item.dailyWage})` : ''}
                    {item.plateNumber ? ` [${item.plateNumber}]` : ''}
                  </option>
                ))}
              </select>
              {availableItems.length === 0 && formData.fromProject && (
                <p className="text-sm text-red-500 mt-1">No available {formData.type} found in source project.</p>
              )}
            </div>

            {/* 4. To Project */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">To Project (Destination)</label>
              <select
                value={formData.toProject}
                onChange={(e) => setFormData({ ...formData, toProject: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              >
                <option value="">Select Destination Project</option>
                {projects.filter(p => p._id !== formData.fromProject).map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* 5. Quantity (Condition for Stock/Consumables) */}
            {(formData.type === 'stock' || formData.type === 'consumable-goods') && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-8 py-2.5 text-white rounded-lg font-medium transition-all shadow-md transform active:scale-95 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'}`}
              >
                {isSubmitting ? 'Processing Transfer...' : 'Confirm Transfer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transfer History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Transfer History</h2>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden">
          {transfers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No transfers recorded yet</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {transfers.map(t => (
                <div key={t._id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${t.type === 'labour' ? 'bg-yellow-100 text-yellow-800' :
                      t.type === 'stock' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                      {t.type}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mb-1 text-sm text-gray-900">
                    <span className="font-semibold">{t.fromProject?.name || 'Unknown'}</span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="font-semibold">{t.toProject?.name || 'Unknown'}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Item: <span className="font-medium text-gray-900">
                      {t.labourId?.name || t.machineId?.name || t.materialName || 'Unknown'}
                    </span>
                  </div>
                  {t.quantity > 1 && (
                    <div className="text-xs text-gray-500 mt-1">Qty: {t.quantity}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-4 font-bold border-b">Type</th>
                <th className="px-6 py-4 font-bold border-b">From Project</th>
                <th className="px-6 py-4 font-bold border-b">To Project</th>
                <th className="px-6 py-4 font-bold border-b">Item Name</th>
                <th className="px-6 py-4 font-bold border-b text-center">Quantity</th>
                <th className="px-6 py-4 font-bold border-b">Date</th>
                <th className="px-6 py-4 font-bold border-b">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">No transfers found</td>
                </tr>
              ) : (
                transfers.map(t => (
                  <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${t.type === 'labour' ? 'bg-yellow-100 text-yellow-800' :
                        t.type === 'stock' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{t.fromProject?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{t.toProject?.name || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      {t.labourId?.name || t.machineId?.name || t.materialName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-center">{t.quantity}</td>
                    <td className="px-6 py-4">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                        {t.status || 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
