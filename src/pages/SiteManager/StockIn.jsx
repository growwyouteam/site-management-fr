import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';

const StockIn = () => {
  const { user } = useAuth();
  const { selectedProject } = useSiteManager();
  const units = ['kg', 'ltr', 'bags', 'pcs', 'meter', 'box', 'ton'];
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [debugMode, setDebugMode] = useState(false);
  const [formData, setFormData] = useState({ projectId: '', vendorId: '', materialName: '', unit: 'kg', quantity: '', unitPrice: '', photo: null, remarks: '' });
  const [photoPreview, setPhotoPreview] = useState('');

  // Optimization States
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
      console.log('🔄 Fetching Stock In data...');
      const startTime = Date.now();

      const [vendorsRes, projectsRes, stocksRes] = await Promise.all([
        api.get('/site/vendors').catch(err => {
          console.warn('⚠️ Failed to fetch vendors:', err.message);
          return { data: { success: false, data: [] } };
        }),
        api.get('/site/projects').catch(err => {
          console.warn('⚠️ Failed to fetch projects:', err.message);
          return { data: { success: false, data: [] } };
        }),
        api.get('/site/stocks', {
          params: { startDate, endDate, vendorId: filterVendorId }
        }).catch(err => {
          console.warn('⚠️ Failed to fetch stocks:', err.message);
          return { data: { success: false, data: [] } };
        })
      ]);

      if (vendorsRes.data.success) {
        setVendors(vendorsRes.data.data);
        if (vendorsRes.data.data.length > 0) {
          setFormData(prev => ({ ...prev, vendorId: vendorsRes.data.data[0]._id }));
        }
      } else {
        console.warn('⚠️ Vendors API failed:', vendorsRes.data.error);
        setVendors([]);
      }

      if (projectsRes.data.success) {
        let filteredProjects = projectsRes.data.data;

        // Filter to show only selected project if one is set
        if (selectedProject) {
          filteredProjects = projectsRes.data.data.filter(p => p._id === selectedProject._id);
          console.log('🎯 Filtering projects by selected project:', selectedProject.name);
        }

        setProjects(filteredProjects);
        if (filteredProjects.length > 0) {
          setFormData(prev => ({ ...prev, projectId: filteredProjects[0]._id || filteredProjects[0].id }));
        }
      } else {
        console.warn('⚠️ Projects API failed:', projectsRes.data.error);
        setProjects([]);
      }

      if (stocksRes.data.success) {
        let filteredStocks = stocksRes.data.data;

        // Filter by selected project
        if (selectedProject) {
          filteredStocks = stocksRes.data.data.filter(s => {
            const sProjectId = typeof s.projectId === 'object' ? s.projectId._id : s.projectId;
            return sProjectId === selectedProject._id;
          });
          console.log(`🎯 Filtered stocks: ${filteredStocks.length} records for ${selectedProject.name}`);
        }

        // Sort stocks by date descending (newest first)
        const sortedStocks = filteredStocks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setStocks(sortedStocks);
      } else {
        console.warn('⚠️ Stocks API failed:', stocksRes.data.error);
        setStocks([]);
      }

      console.log(`⚡ Stock In data loaded in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      showToast('Failed to load data. Please check your assignments.', 'error');

      // Set empty data to prevent crashes
      setVendors([]);
      setProjects([]);
      setStocks([]);
    } finally {
      setIsLoading(false);
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
    if (!formData.vendorId) {
      showToast('Please select a vendor', 'error');
      return;
    }
    if (!formData.materialName.trim()) {
      showToast('Please enter material name', 'error');
      return;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      showToast('Please enter valid quantity', 'error');
      return;
    }
    if (!formData.unitPrice || formData.unitPrice <= 0) {
      showToast('Please enter valid unit price', 'error');
      return;
    }
    if (!formData.photo) {
      showToast('Photo is required for stock entry', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('projectId', formData.projectId);
      submitData.append('vendorId', formData.vendorId);
      submitData.append('materialName', formData.materialName);
      submitData.append('unit', formData.unit);
      submitData.append('quantity', formData.quantity);
      submitData.append('unitPrice', formData.unitPrice);
      if (formData.photo) {
        submitData.append('photo', formData.photo);
      }
      if (formData.remarks) {
        submitData.append('remarks', formData.remarks);
      }

      const response = await api.post('/site/stock-in', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        showToast('Stock added successfully', 'success');
        setFormData(prev => ({
          ...prev,
          materialName: '', unit: 'kg', quantity: '', unitPrice: '', photo: null, remarks: ''
        }));
        setPhotoPreview('');

        // Optimistic update: Add new stock to list immediately
        if (response.data.data) {
          setStocks(prev => [response.data.data, ...prev]);
        } else {
          fetchData(); // Fallback
        }
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to add stock', 'error');
      console.error('Error adding stock:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoto = (file) => {
    if (!file) {
      setFormData(prev => ({ ...prev, photo: null }));
      setPhotoPreview('');
      return;
    }
    // Basic file size validation (e.g. 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size too large. Max 10MB.', 'error');
      return;
    }

    // Store file object for FormData
    setFormData(prev => ({ ...prev, photo: file }));

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const runDebug = async () => {
    setDebugMode(true);
    try {
      console.log('🔍 StockIn Debug Test...');

      // Test individual endpoints
      const projectsTest = await api.get('/site/projects');
      console.log('📋 Projects API Response:', projectsTest.data);

      const vendorsTest = await api.get('/site/vendors');
      console.log('👥 Vendors API Response:', vendorsTest.data);

      const stocksTest = await api.get('/site/stocks');
      console.log('📦 Stocks API Response:', stocksTest.data);

      // Check user info
      const dashboardTest = await api.get('/site/dashboard');
      console.log('🏠 Dashboard User Info:', {
        name: dashboardTest.data.data.user?.name,
        assignedSites: dashboardTest.data.data.user?.assignedSites,
        assignedProjectsCount: dashboardTest.data.data.assignedProjects?.length
      });

      showToast('Debug completed! Check console.', 'success');
    } catch (error) {
      console.error('❌ Debug Error:', error);
      showToast('Debug failed! Check console.', 'error');
    } finally {
      setDebugMode(false);
    }
  };

  // Performance: Only show first 50 items unless "Show All" is clicked
  const visibleStocks = useMemo(() => {
    return showAllStocks ? stocks : stocks.slice(0, 50);
  }, [stocks, showAllStocks]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Stock In (Material Receipt)</h1>
        <button
          onClick={runDebug}
          disabled={debugMode}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          🔍 {debugMode ? 'Debugging...' : 'Debug'}
        </button>
      </div>

      {/* Show warning if no projects assigned */}
      {projects.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-yellow-600 text-2xl mr-3">⚠️</div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">No Projects Assigned</h3>
              <p className="text-yellow-700 mt-1">
                You haven't been assigned to any projects yet. Please contact your admin to get project assignments before adding stock.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              required
              disabled={projects.length === 0 || isSubmitting}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Project</option>
              {projects.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
            </select>
            {projects.length === 0 && (
              <p className="text-xs text-yellow-600 mt-1">No projects available</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
            <select
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              required
              disabled={vendors.length === 0 || isSubmitting}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Vendor</option>
              {vendors.map(v => <option key={v._id || v.id} value={v._id || v.id}>{v.name}</option>)}
            </select>
            {vendors.length === 0 && (
              <p className="text-xs text-yellow-600 mt-1">No vendors available</p>
            )}
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Material Name</label>
            <input
              type="text"
              value={formData.materialName}
              onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
              placeholder="e.g., Cement, Steel Rods"
              required
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
              placeholder="Quantity"
              required
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (₹)</label>
            <input
              type="number"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              placeholder="Price per unit"
              required
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Price (₹)</label>
            <div className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-800 font-semibold">
              ₹{((Number(formData.quantity) || 0) * (Number(formData.unitPrice) || 0)).toLocaleString()}
            </div>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo *</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhoto(e.target.files?.[0])}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              required
            />
            {photoPreview && (
              <div className="mt-2">
                <img src={photoPreview} alt="Preview" className="h-24 w-24 object-cover rounded border" />
                <p className="text-xs text-green-600 mt-1">✓ Photo selected</p>
              </div>
            )}
            {!photoPreview && (
              <p className="text-xs text-red-600 mt-1">Photo is required</p>
            )}
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Optional remarks"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`mt-5 px-6 py-3 text-white rounded-lg transition-colors font-semibold flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
        >
          {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
          {isSubmitting ? 'Adding Stock...' : 'Add Stock'}
        </button>
      </form>

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Stock Records</h2>
          <div className="text-sm text-gray-500">
            Showing {visibleStocks.length} of {stocks.length} records
            {!showAllStocks && stocks.length > 50 && (
              <button
                onClick={() => setShowAllStocks(true)}
                className="ml-3 text-blue-600 hover:underline font-medium"
              >
                View All
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Filters */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Filter</label>
          <select
            value={filterVendorId}
            onChange={(e) => setFilterVendorId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Vendors</option>
            {vendors.map(v => <option key={v._id || v.id} value={v._id || v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Apply Filter
          </button>
          <button
            onClick={() => { setFilterVendorId(''); setStartDate(''); setEndDate(''); setTimeout(fetchData, 100); }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden space-y-3">
        {visibleStocks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No stock records found</p>
            <p className="text-sm mt-2">Add your first stock entry above</p>
          </div>
        ) : (
          visibleStocks.map(s => (
            <div key={s._id || s.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-bold text-gray-900 mb-2">{s.materialName}</div>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Project:</span> {typeof s.projectId === 'object' ? s.projectId?.name : s.projectId}</div>
                <div><span className="font-medium">Quantity:</span> <span className="font-bold text-green-600">{s.quantity} {s.unit}</span></div>
                <div><span className="font-medium">Unit Price:</span> <span className="text-green-600 font-bold">₹{s.unitPrice?.toLocaleString()}</span></div>
                <div><span className="font-medium">Total Price:</span> <span className="text-green-700 font-bold">₹{s.totalPrice?.toLocaleString()}</span></div>
                <div><span className="font-medium">Vendor:</span> {typeof s.vendorId === 'object' ? s.vendorId?.name : s.vendorId}</div>
                <div><span className="font-medium">Added By:</span> {s.addedBy ? s.addedBy.name : 'N/A'}</div>
                <div><span className="font-medium">Date & Time:</span> {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                {s.photo && (
                  <div className="mt-2">
                    <img src={s.photo} alt="Material" className="h-16 w-16 object-cover rounded border" />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        {visibleStocks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No stock records found</p>
            <p className="text-sm mt-2">Add your first stock entry above</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Project</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Material</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Quantity</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Unit</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Unit Price</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Price</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vendor</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Added By</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Photo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {visibleStocks.map(s => (
                <tr key={s._id || s.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3">{typeof s.projectId === 'object' ? s.projectId?.name : s.projectId}</td>
                  <td className="px-4 py-3 font-medium">{s.materialName}</td>
                  <td className="px-4 py-3 font-bold text-green-600">{s.quantity}</td>
                  <td className="px-4 py-3">{s.unit}</td>
                  <td className="px-4 py-3 text-green-600 font-bold">₹{s.unitPrice?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-700 font-bold">₹{s.totalPrice?.toLocaleString()}</td>
                  <td className="px-4 py-3">{typeof s.vendorId === 'object' ? s.vendorId?.name : s.vendorId}</td>
                  <td className="px-4 py-3 text-gray-600 font-medium">{s.addedBy ? s.addedBy.name : '-'}</td>
                  <td className="px-4 py-3">
                    {s.photo ? (
                      <img src={s.photo} alt="Material" className="h-12 w-12 object-cover rounded border" />
                    ) : (
                      <span className="text-gray-400 text-xs">No photo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{new Date(s.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Load More Footer */}
      {visibleStocks.length < stocks.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAllStocks(true)}
            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition-colors"
          >
            Load All Records ({stocks.length - visibleStocks.length} more)
          </button>
        </div>
      )}
    </div>
  );
};

export default StockIn;
