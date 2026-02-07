import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';
import ImageUpload from '../../components/ImageUpload';
import { Eye } from 'lucide-react';

const StockIn = () => {
  const { user } = useAuth();
  const { selectedProject } = useSiteManager();
  const units = ['kg', 'ltr', 'bags', 'pcs', 'meter', 'box', 'ton'];
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [materials, setMaterials] = useState([]); // Materials from admin stock
  const [formData, setFormData] = useState({ projectId: '', vendorId: '', materialName: '', unit: 'kg', quantity: '', unitPrice: '', photo: null, remarks: '' });
  const [photoPreview, setPhotoPreview] = useState('');

  // UI States
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllStocks, setShowAllStocks] = useState(false);

  // Detail Modal State
  const [showDetail, setShowDetail] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  // Filter States
  const [filterVendorId, setFilterVendorId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [vendorsRes, projectsRes, stocksRes, materialsRes] = await Promise.all([
        api.get('/site/vendors').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/site/projects').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/site/stocks', { params: { startDate, endDate, vendorId: filterVendorId } }).catch(() => ({ data: { success: false, data: [] } })),
        api.get('/site/all-materials').catch(() => ({ data: { success: false, data: [] } }))
      ]);

      if (vendorsRes.data.success) {
        setVendors(vendorsRes.data.data);
        if (vendorsRes.data.data.length > 0) setFormData(prev => ({ ...prev, vendorId: vendorsRes.data.data[0]._id }));
      }

      if (projectsRes.data.success) {
        let filteredProjects = projectsRes.data.data;
        if (selectedProject) {
          filteredProjects = projectsRes.data.data.filter(p => p._id === selectedProject._id);
        }
        setProjects(filteredProjects);
        if (filteredProjects.length > 0) setFormData(prev => ({ ...prev, projectId: filteredProjects[0]._id || filteredProjects[0].id }));
      }

      if (stocksRes.data.success) {
        let filteredStocks = stocksRes.data.data;
        if (selectedProject) {
          filteredStocks = stocksRes.data.data.filter(s => {
            const sProjectId = typeof s.projectId === 'object' ? s.projectId._id : s.projectId;
            return sProjectId === selectedProject._id;
          });
        }
        setStocks(filteredStocks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }

      if (materialsRes.data.success) {
        setMaterials(materialsRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.projectId || !formData.vendorId || !formData.materialName.trim() || !formData.quantity || !formData.unitPrice || !formData.photo) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'paymentStatus') return; // Skip paymentStatus, we append it manually below
        if (formData[key]) submitData.append(key, formData[key]);
      });
      submitData.append('paymentStatus', formData.paymentStatus || 'credit');

      const response = await api.post('/site/stock-in', submitData, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (response.data.success) {
        showToast('Stock added successfully', 'success');
        setFormData(prev => ({ ...prev, materialName: '', unit: 'kg', quantity: '', unitPrice: '', photo: null, remarks: '' }));
        setPhotoPreview('');
        setShowForm(false);
        if (response.data.data) {
          // Re-fetch to ensure proper population of fields if needed, or just append
          fetchData();
        }
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to add stock', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoto = (file, preview) => {
    if (!file) {
      setFormData(prev => ({ ...prev, photo: null }));
      setPhotoPreview('');
      return;
    }
    setFormData(prev => ({ ...prev, photo: file }));
    setPhotoPreview(preview);
  };

  const visibleStocks = useMemo(() => showAllStocks ? stocks : stocks.slice(0, 50), [stocks, showAllStocks]);

  const handleViewDetail = (stock) => {
    setSelectedStock(stock);
    setShowDetail(true);
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Stock In (Material Receipt)</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          {showForm ? 'Cancel' : 'Add Stock'}
        </button>
      </div>

      {projects.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700">No projects assigned. Contact admin.</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                required
                disabled={projects.length === 0 || isSubmitting}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Project</option>
                {projects.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
              <select
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                required
                disabled={vendors.length === 0 || isSubmitting}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Vendor</option>
                {vendors.map(v => <option key={v._id || v.id} value={v._id || v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Material Name</label>
              <select
                value={formData.materialName}
                onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                required
                disabled={materials.length === 0 || isSubmitting}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Material</option>
                {materials.map((mat, idx) => (
                  <option key={idx} value={mat}>{mat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (₹)</label>
              <input
                type="number"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
              <select
                value={formData.paymentStatus || 'credit'}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="credit">Credit (Vendor Pending)</option>
                <option value="paid">Paid from Wallet</option>
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <ImageUpload
                label="Photo *"
                previewUrl={photoPreview}
                onImageSelect={handlePhoto}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <input
                type="text"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`mt-5 px-6 py-3 text-white rounded-lg transition-colors font-semibold flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {isSubmitting ? 'Adding Stock...' : 'Add Stock'}
          </button>
        </form>
      )}

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Stock Records</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Material</th>
                <th className="px-6 py-3">Qty</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3">Vendor</th>
                <th className="px-6 py-3">Project</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleStocks.map((stock) => (
                <tr key={stock._id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{new Date(stock.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{stock.materialName}</td>
                  <td className="px-6 py-4">{stock.quantity} {stock.unit}</td>
                  <td className="px-6 py-4">₹{stock.totalPrice?.toLocaleString()}</td>
                  <td className="px-6 py-4">{stock.vendorId?.name || 'Unknown'}</td>
                  <td className="px-6 py-4">{stock.projectId?.name || 'Unknown'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewDetail(stock)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="View Details"
                    >
                      <Eye size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {stocks.length === 0 && <tr><td colSpan="7" className="px-6 py-8 text-center">No stocks found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Detail Modal */}
      {showDetail && selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Stock Details</h2>
                <button
                  onClick={() => setShowDetail(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {selectedStock.photo ? (
                  <div className="flex justify-center bg-gray-100 p-4 rounded-lg">
                    <img src={selectedStock.photo} alt="Stock" className="max-w-full h-80 object-contain rounded border-2 border-gray-300 shadow-lg" />
                  </div>
                ) : (
                  <div className="flex justify-center bg-gray-100 p-8 rounded-lg">
                    <p className="text-gray-400 text-lg">📷 No photo available</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Project</label>
                    <p className="text-lg font-semibold">{selectedStock.projectId?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Vendor</label>
                    <p className="text-lg font-semibold">{selectedStock.vendorId?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Material Name</label>
                    <p className="text-lg font-semibold">{selectedStock.materialName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Quantity</label>
                    <p className="text-lg font-semibold">{selectedStock.quantity} {selectedStock.unit}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Unit Price</label>
                    <p className="text-lg font-semibold text-green-600">₹{selectedStock.unitPrice?.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Price</label>
                    <p className="text-lg font-semibold text-green-700">₹{selectedStock.totalPrice?.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Added Date</label>
                    <p className="text-lg">{new Date(selectedStock.createdAt).toLocaleDateString()}</p>
                  </div>
                  {selectedStock.remarks && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-500">Remarks</label>
                      <p className="text-lg">{selectedStock.remarks}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end">
              <button
                onClick={() => setShowDetail(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockIn;
