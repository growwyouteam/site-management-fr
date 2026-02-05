import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';
import ImageUpload from '../../components/ImageUpload';

const StockIn = () => {
  const { user } = useAuth();
  const { selectedProject } = useSiteManager();
  const units = ['kg', 'ltr', 'bags', 'pcs', 'meter', 'box', 'ton'];
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [formData, setFormData] = useState({ projectId: '', vendorId: '', materialName: '', unit: 'kg', quantity: '', unitPrice: '', photo: null, remarks: '' });
  const [photoPreview, setPhotoPreview] = useState('');

  // UI States
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllStocks, setShowAllStocks] = useState(false);

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
      const [vendorsRes, projectsRes, stocksRes] = await Promise.all([
        api.get('/site/vendors').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/site/projects').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/site/stocks', { params: { startDate, endDate, vendorId: filterVendorId } }).catch(() => ({ data: { success: false, data: [] } }))
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
        if (formData[key]) submitData.append(key, formData[key]);
      });
      submitData.append('paymentStatus', formData.paymentStatus || 'credit');

      const response = await api.post('/site/stock-in', submitData, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (response.data.success) {
        showToast('Stock added successfully', 'success');
        setFormData(prev => ({ ...prev, materialName: '', unit: 'kg', quantity: '', unitPrice: '', photo: null, remarks: '' }));
        setPhotoPreview('');
        setShowForm(false);
        if (response.data.data) setStocks(prev => [response.data.data, ...prev]);
        else fetchData();
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
              <input
                type="text"
                value={formData.materialName}
                onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                </tr>
              ))}
              {stocks.length === 0 && <tr><td colSpan="6" className="px-6 py-8 text-center">No stocks found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockIn;
