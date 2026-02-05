import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';

const SMTransfer = () => {
  const { user } = useAuth();
  const { selectedProject } = useSiteManager();
  const isAdmin = user?.role === 'admin';
  const [transfers, setTransfers] = useState([]);
  const [fromProjects, setFromProjects] = useState([]); // Filtered by selected project
  const [toProjects, setToProjects] = useState([]); // All projects for transfer destination
  const [labours, setLabours] = useState([]);
  const [machines, setMachines] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [labEquipments, setLabEquipments] = useState([]);
  const [consumableGoods, setConsumableGoods] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ type: 'labour', itemId: '', fromProject: '', toProject: '', quantity: 1, remarks: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []); // Fetch data on mount

  // Re-fetch when selected project changes
  useEffect(() => {
    if (selectedProject) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  // Lazy load items when transfer type changes or project changes
  useEffect(() => {
    if (formData.type && formData.fromProject) {
      fetchItemsByType(formData.type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.type, formData.fromProject]);

  const fetchData = async () => {
    try {
      const baseUrl = isAdmin ? '/admin' : '/site';
      console.log('🔄 Fetching Transfer data from:', baseUrl);

      // Only fetch essential data initially for fast page load
      const results = await Promise.allSettled([
        api.get(`${baseUrl}/transfers`).catch(err => ({ data: { success: false, data: [] } })),
        api.get(`${baseUrl}/projects`).catch(err => ({ data: { success: false, data: [] } }))
      ]);

      // Extract results safely
      const [transfersRes, projectsRes] = results.map(
        result => result.status === 'fulfilled' ? result.value : { data: { success: false, data: [] } }
      );

      if (transfersRes.data.success) {
        let filteredTransfers = transfersRes.data.data;
        if (selectedProject) {
          filteredTransfers = transfersRes.data.data.filter(t => {
            const transferFromProject = typeof t.fromProject === 'object' ? t.fromProject._id : t.fromProject;
            return transferFromProject === selectedProject._id;
          });
        }
        setTransfers(filteredTransfers);
        console.log('✅ Transfers loaded:', filteredTransfers.length);
      }

      if (projectsRes.data.success) {
        // For "From Project": show only selected project
        let filteredProjects = projectsRes.data.data;
        if (selectedProject) {
          filteredProjects = projectsRes.data.data.filter(p => p._id === selectedProject._id);
        }
        setFromProjects(filteredProjects);

        // For "To Project": show all projects
        setToProjects(projectsRes.data.data);

        // Auto-select fromProject if selected project exists
        if (filteredProjects.length > 0) {
          setFormData(prev => ({ ...prev, fromProject: filteredProjects[0]._id }));
        }

        console.log('✅ From Projects (filtered):', filteredProjects.length);
        console.log('✅ To Projects (all):', projectsRes.data.data.length);
      }

      console.log('⚡ Initial load complete! Other data will load on-demand when you select Transfer Type.');
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  // Lazy load specific item types based on transfer type selection
  const fetchItemsByType = async (type) => {
    const baseUrl = isAdmin ? '/admin' : '/site';
    const currentProjectId = formData.fromProject;

    // Don't fetch if no project selected
    if (!currentProjectId) return;

    console.log(`🔄 Loading ${type} data for project ${currentProjectId} on-demand...`);

    try {
      const queryParams = `?projectId=${currentProjectId}`;

      switch (type) {
        case 'labour':
          const labourRes = await api.get(`${baseUrl}/labours${queryParams}`);
          if (labourRes.data.success) {
            setLabours(labourRes.data.data);
            console.log('✅ Labours loaded:', labourRes.data.data.length);
          }
          break;

        case 'machine':
          const machineRes = await api.get(`${baseUrl}/machines${queryParams}`);
          if (machineRes.data.success) {
            setMachines(machineRes.data.data);
            console.log('✅ Machines loaded:', machineRes.data.data.length);
          }
          break;

        case 'stock':
          // Materials endpoint was unrelated to this change but good to keep consistent if needed
          // But getMaterials in backend aggregates based on user assigned sites, not specific project currently
          // Let's leave it as is for now, it's working fine.
          if (materials.length === 0) {
            const res = await api.get(`${baseUrl}/materials`);
            if (res.data.success) {
              setMaterials(res.data.data);
              console.log('✅ Materials loaded:', res.data.data.length);
            }
          }
          break;

        case 'lab-equipment':
          const labRes = await api.get(`${baseUrl}/lab-equipments${queryParams}`);
          if (labRes.data.success) {
            setLabEquipments(labRes.data.data);
            console.log('✅ Lab Equipments loaded:', labRes.data.data.length);
          }
          break;

        case 'consumable-goods':
          const goodsRes = await api.get(`${baseUrl}/consumable-goods${queryParams}`);
          if (goodsRes.data.success) {
            setConsumableGoods(goodsRes.data.data);
            console.log('✅ Consumable Goods loaded:', goodsRes.data.data.length);
          }
          break;

        case 'equipment':
          const equipRes = await api.get(`${baseUrl}/equipments${queryParams}`);
          if (equipRes.data.success) {
            setEquipments(equipRes.data.data);
            console.log('✅ Equipments loaded:', equipRes.data.data.length);
          }
          break;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load ${type}:`, error.message);
    }
  };

  const projectName = (projectData) => {
    if (typeof projectData === 'object' && projectData?.name) return projectData.name;
    // Search in both fromProjects and toProjects
    const allProjects = [...fromProjects, ...toProjects];
    return allProjects.find(p => p._id === projectData)?.name || projectData || '-';
  };

  // Filter items based on selected fromProject
  const filteredLabours = useMemo(() => {
    if (!formData.fromProject) return labours;
    return labours.filter(l => {
      const labourProjectId = typeof l.assignedSite === 'object' ? l.assignedSite._id : l.assignedSite;
      return labourProjectId === formData.fromProject;
    });
  }, [labours, formData.fromProject]);

  const filteredMachines = useMemo(() => {
    if (!formData.fromProject) return machines;
    return machines.filter(m => {
      const machineProjectId = typeof m.projectId === 'object' ? m.projectId._id : m.projectId;
      return machineProjectId === formData.fromProject;
    });
  }, [machines, formData.fromProject]);

  const filteredLabEquipments = useMemo(() => {
    if (!formData.fromProject) return labEquipments;
    return labEquipments.filter(e => {
      const equipProjectId = typeof e.projectId === 'object' ? e.projectId._id : e.projectId;
      return equipProjectId === formData.fromProject;
    });
  }, [labEquipments, formData.fromProject]);

  const filteredConsumableGoods = useMemo(() => {
    if (!formData.fromProject) return consumableGoods;
    return consumableGoods.filter(c => {
      const goodsProjectId = typeof c.projectId === 'object' ? c.projectId._id : c.projectId;
      return goodsProjectId === formData.fromProject;
    });
  }, [consumableGoods, formData.fromProject]);

  const filteredEquipments = useMemo(() => {
    if (!formData.fromProject) return equipments;
    return equipments.filter(e => {
      const equipProjectId = typeof e.projectId === 'object' ? e.projectId._id : e.projectId;
      return equipProjectId === formData.fromProject;
    });
  }, [equipments, formData.fromProject]);

  const filteredMaterials = useMemo(() => {
    if (!formData.fromProject) return materials;
    return materials.filter(m => {
      const matProjectId = typeof m.projectId === 'object' ? m.projectId._id : m.projectId;
      return matProjectId === formData.fromProject;
    });
  }, [materials, formData.fromProject]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const baseUrl = isAdmin ? '/admin' : '/site';

      // For stock items, we need to send just the name as per backend expectation
      // Or maybe the ID? Transfer Controller expects 'itemId' for labour/machine/equip, 
      // but 'materialName' for stock?
      // Let's check verify backend logic for Transfer.
      // But for now, keeping existing logic consistent.

      const submitData = {
        ...formData,
        quantity: Number(formData.quantity) || 1
      };

      const response = await api.post(`${baseUrl}/transfer`, submitData);

      if (response.data.success) {
        showToast('Transfer request submitted', 'success');
        setShowForm(false);
        setFormData({ type: 'labour', itemId: '', fromProject: '', toProject: '', quantity: 1, remarks: '' });
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to submit transfer request', 'error');
      console.error('Error submitting transfer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Transfer Request</h1>
      <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
        {showForm ? 'Cancel' : 'Request Transfer'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-5 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                <option value="labour">Labour</option>
                <option value="machine">Machine</option>
                <option value="stock">Stock</option>
                <option value="lab-equipment">Lab Test Equipment</option>
                <option value="consumable-goods">Consumable Goods</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>
            {formData.type === 'labour' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Labour</label>
                <select value={formData.itemId} onChange={(e) => setFormData({ ...formData, itemId: e.target.value })} required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value="">Select Labour</option>
                  {filteredLabours.map(l => <option key={l._id} value={l._id}>{l.name} - {l.designation}</option>)}
                </select>
              </div>
            )}
            {formData.type === 'machine' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Machine</label>
                <select value={formData.itemId} onChange={(e) => setFormData({ ...formData, itemId: e.target.value })} required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value="">Select Machine</option>
                  {filteredMachines.map(m => <option key={m._id} value={m._id}>{m.name} - {m.projectId?.name || 'Unassigned'}</option>)}
                </select>
              </div>
            )}
            {formData.type === 'stock' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Material</label>
                <select value={formData.itemId} onChange={(e) => setFormData({ ...formData, itemId: e.target.value })} required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value="">Select Material</option>
                  {filteredMaterials.map((m, index) => (
                    <option key={index} value={m.materialName}>
                      {m.materialName} ({m.quantity} {m.unit})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {formData.type === 'lab-equipment' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Lab Equipment</label>
                <select value={formData.itemId} onChange={(e) => setFormData({ ...formData, itemId: e.target.value })} required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value="">Select Lab Equipment</option>
                  {filteredLabEquipments.map(e => <option key={e._id} value={e._id}>{e.name} - {e.projectId?.name || 'N/A'}</option>)}
                </select>
              </div>
            )}
            {formData.type === 'consumable-goods' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Consumable Goods</label>
                <select value={formData.itemId} onChange={(e) => setFormData({ ...formData, itemId: e.target.value })} required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value="">Select Consumable Goods</option>
                  {filteredConsumableGoods.map(c => <option key={c._id} value={c._id}>{c.name} ({c.quantity} {c.unit}) - {c.projectId?.name || 'N/A'}</option>)}
                </select>
              </div>
            )}
            {formData.type === 'equipment' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Equipment</label>
                <select value={formData.itemId} onChange={(e) => setFormData({ ...formData, itemId: e.target.value })} required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value="">Select Equipment</option>
                  {filteredEquipments.map(e => <option key={e._id} value={e._id}>{e.name} - {e.projectId?.name || 'N/A'}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Project</label>
              <select value={formData.fromProject} onChange={(e) => setFormData({ ...formData, fromProject: e.target.value })} required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                <option value="">Select Project</option>
                {fromProjects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Project</label>
              <select value={formData.toProject} onChange={(e) => setFormData({ ...formData, toProject: e.target.value })} required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                <option value="">Select Project</option>
                {toProjects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
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
            {isSubmitting ? 'Requesting...' : 'Submit Request'}
          </button>
        </form>
      )}

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Transfer Requests</h2>

        {/* Mobile View */}
        <div className="block md:hidden space-y-3">
          {transfers.map(t => (
            <div key={t._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-bold text-gray-900 mb-2 capitalize">{t.type}</div>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">From:</span> {projectName(t.fromProject)}</div>
                <div><span className="font-medium">To:</span> {projectName(t.toProject)}</div>
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${t.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {t.status}
                  </span>
                </div>
                <div><span className="font-medium">Requested By:</span> {t.requestedBy?.name || 'N/A'}</div>
                <div><span className="font-medium">Date & Time:</span> {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">From</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">To</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Requested By</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 capitalize font-medium">{t.type}</td>
                  <td className="px-4 py-3">{projectName(t.fromProject)}</td>
                  <td className="px-4 py-3">{projectName(t.toProject)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${t.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-600">{t.requestedBy?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{new Date(t.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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

export default SMTransfer;
