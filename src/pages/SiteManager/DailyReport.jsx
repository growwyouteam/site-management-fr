import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import Camera from '../../components/Camera';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';

const DailyReport = () => {
  const { user } = useAuth();
  const { selectedProject } = useSiteManager();
  const baseUrl = user?.role === 'admin' ? '/admin' : '/site';
  const [projects, setProjects] = useState([]);
  const [reports, setReports] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '',
    reportType: 'Morning Report',
    description: '',
    photos: [],
    roadProgress: [],
    stockUsed: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  useEffect(() => {
    if (formData.projectId) {
      fetchStocks();
    }
  }, [formData.projectId]);

  const fetchData = async () => {
    try {
      const [projectsRes, reportsRes] = await Promise.all([
        api.get(`${baseUrl}/projects`),
        api.get(`${baseUrl}/daily-reports`)
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

      if (reportsRes.data.success) {
        let filteredReports = reportsRes.data.data;
        if (selectedProject) {
          filteredReports = reportsRes.data.data.filter(r => {
            const reportProjectId = typeof r.projectId === 'object' ? r.projectId._id : r.projectId;
            return reportProjectId === selectedProject._id;
          });
        }
        setReports(filteredReports);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchStocks = async () => {
    try {
      const response = await api.get(`${baseUrl}/stocks`);
      if (response.data.success) {
        console.log('📦 All stocks:', response.data.data.length);
        console.log('🎯 Selected project:', formData.projectId);

        // Filter stocks with quantity > 0 and matching project
        const projectStocks = response.data.data.filter(s => {
          const stockProjectId = typeof s.projectId === 'object' ? s.projectId._id : s.projectId;
          return s.quantity > 0 && stockProjectId === formData.projectId;
        });

        console.log('✅ Project stocks found:', projectStocks.length);

        // Group by material name and sum quantities
        const groupedStocks = projectStocks.reduce((acc, stock) => {
          const existing = acc.find(item => item.materialName === stock.materialName);
          if (existing) {
            existing.quantity += stock.quantity;
          } else {
            acc.push({
              materialName: stock.materialName,
              quantity: stock.quantity,
              unit: stock.unit,
              _id: stock._id // Keep first stock ID for reference
            });
          }
          return acc;
        }, []);

        console.log('📊 Grouped stocks:', groupedStocks);
        setStocks(groupedStocks);
      }
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  const handlePhotoCapture = (photoData) => {
    setFormData({ ...formData, photos: [...formData.photos, photoData] });
    setShowCamera(false);
  };

  const addStockItem = () => {
    setFormData({
      ...formData,
      stockUsed: [...formData.stockUsed, { materialName: '', quantity: '', unit: '' }]
    });
  };

  const removeStockItem = (index) => {
    setFormData({
      ...formData,
      stockUsed: formData.stockUsed.filter((_, i) => i !== index)
    });
  };

  const updateStockItem = (index, field, value) => {
    const updated = [...formData.stockUsed];
    updated[index][field] = value;

    // Auto-fill unit when material is selected
    if (field === 'materialName') {
      const selectedStock = stocks.find(s => s.materialName === value);
      if (selectedStock) {
        updated[index].unit = selectedStock.unit;
      }
    }

    setFormData({ ...formData, stockUsed: updated });
  };

  const addRoadProgress = () => {
    setFormData({
      ...formData,
      roadProgress: [...formData.roadProgress, { description: '', value: '', unit: 'm' }]
    });
  };

  const removeRoadProgress = (index) => {
    setFormData({
      ...formData,
      roadProgress: formData.roadProgress.filter((_, i) => i !== index)
    });
  };

  const updateRoadProgress = (index, field, value) => {
    const updated = [...formData.roadProgress];
    updated[index][field] = value;
    setFormData({ ...formData, roadProgress: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Prepare data
      const submitData = {
        ...formData,
        roadProgress: formData.roadProgress.map(rp => ({
          ...rp,
          value: Number(rp.value)
        })),
        stockUsed: formData.stockUsed.map(item => ({
          ...item,
          quantity: Number(item.quantity)
        }))
      };

      const response = await api.post(`${baseUrl}/daily-reports`, submitData);
      if (response.data.success) {
        showToast('Daily report submitted successfully', 'success');
        setFormData({
          projectId: projects[0]?._id || '',
          reportType: 'Morning Report',
          description: '',
          photos: [],
          roadDistance: { value: '', unit: 'm' },
          stockUsed: []
        });
        fetchData();
        fetchStocks(); // Refresh stock to show updated quantities
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to submit report', 'error');
      console.error('Error submitting report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAvailableQuantity = (materialName) => {
    const stock = stocks.find(s => s.materialName === materialName);
    return stock ? `${stock.quantity} ${stock.unit}` : 'N/A';
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Daily Report</h1>

      <form onSubmit={handleSubmit} className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
            <select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select value={formData.reportType} onChange={(e) => setFormData({ ...formData, reportType: e.target.value })} disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
              <option value="Morning Report">Morning Report</option>
              <option value="Evening Report">Evening Report</option>
              <option value="Full Day Report">Full Day Report</option>
            </select>
          </div>
        </div>

        {/* Road Construction Section */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-blue-900">🛣️ Road Construction Progress</h3>
            <button
              type="button"
              onClick={addRoadProgress}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors text-sm"
            >
              + Add Road
            </button>
          </div>

          {formData.roadProgress.length === 0 ? (
            <p className="text-gray-600 text-sm">No road progress added. Click "+ Add Road" to add details.</p>
          ) : (
            <div className="space-y-3">
              {formData.roadProgress.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-white rounded-lg border border-blue-200">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description (e.g. Main Road)</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateRoadProgress(index, 'description', e.target.value)}
                      placeholder="Road Name / Location"
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Distance</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={item.value}
                        onChange={(e) => updateRoadProgress(index, 'value', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        required
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => updateRoadProgress(index, 'unit', e.target.value)}
                        disabled={isSubmitting}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 bg-white"
                      >
                        <option value="m">m</option>
                        <option value="km">km</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeRoadProgress(index)}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 transition-colors text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock Usage Section */}
        <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-orange-900">📦 Stock Used</h3>
            <button
              type="button"
              onClick={addStockItem}
              disabled={isSubmitting}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
            >
              + Add Stock
            </button>
          </div>

          {formData.stockUsed.length === 0 ? (
            <p className="text-gray-600 text-sm">No stock items added. Click "+ Add Stock" to add materials used.</p>
          ) : (
            <div className="space-y-3">
              {formData.stockUsed.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-white rounded-lg border border-orange-200">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                    <select
                      value={item.materialName}
                      onChange={(e) => updateStockItem(index, 'materialName', e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:bg-gray-100"
                    >
                      <option value="">Select Material</option>
                      {stocks.map(s => (
                        <option key={s._id} value={s.materialName}>
                          {s.materialName} (Available: {s.quantity} {s.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateStockItem(index, 'quantity', e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      required
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                    <input
                      type="text"
                      value={item.unit}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeStockItem(index)}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 transition-colors text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe today's work progress..." required disabled={isSubmitting} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] disabled:bg-gray-100" />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos ({formData.photos.length}/2)</label>
          <button type="button" onClick={() => setShowCamera(true)} disabled={formData.photos.length >= 2 || isSubmitting} className={`px-5 py-2.5 text-white rounded-lg font-medium transition-colors ${formData.photos.length >= 2 || isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}>
            📸 Capture Photo
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-6 py-3 text-white rounded-lg transition-colors font-semibold flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
        >
          {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>

      {showCamera && <Camera onCapture={handlePhotoCapture} onClose={() => setShowCamera(false)} />}

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Report History</h2>

        {reports.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No reports submitted yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Report Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Project</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Road Distance</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stock Used</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r._id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.reportType}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {typeof r.projectId === 'object' ? r.projectId?.name : r.projectId}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={r.description}>
                      {r.description}
                    </td>
                    <td className="px-4 py-3">
                      {r.roadProgress && r.roadProgress.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {r.roadProgress.map((rp, idx) => (
                            <span key={idx} className="text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded">
                              {rp.description ? `${rp.description}: ` : ''}{rp.value} {rp.unit}
                            </span>
                          ))}
                        </div>
                      ) : (r.roadDistance && r.roadDistance.value > 0 ? (
                        <span className="text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded">
                          🛣️ {r.roadDistance.value} {r.roadDistance.unit}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      {r.stockUsed && r.stockUsed.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.stockUsed.map((stock, idx) => (
                            <span key={idx} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded whitespace-nowrap">
                              {stock.materialName}: {stock.quantity} {stock.unit}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString('en-IN')}
                      <br />
                      <span className="text-xs text-gray-500">
                        {new Date(r.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyReport;
