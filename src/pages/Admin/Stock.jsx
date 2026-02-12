import { useState, useEffect } from 'react';
import { showToast } from '../../components/Toast';
import api from '../../services/api';
import optimizedApi from '../../services/optimizedApi';
import { usePerformanceMonitor } from '../../utils/performanceMonitor';
import { debugAuth, testApiCall } from '../../utils/debugAuth';

const Stock = () => {
  const { startTiming, endTiming } = usePerformanceMonitor('StockComponent');
  const [stocks, setStocks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '',
    vendorId: '',
    materialName: '',
    unit: 'kg',
    quantity: '',
    unitPrice: '',
    photo: null,
    remarks: ''
  });
  const [photoPreview, setPhotoPreview] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [materialNames, setMaterialNames] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Filter states
  const [filterProject, setFilterProject] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const units = ['kg', 'ltr', 'bags', 'ft', 'meter', 'ton', 'piece', 'box', 'bundle'];

  useEffect(() => {
    // Debug authentication on component mount
    debugAuth();

    // Test API call
    setTimeout(() => {
      testApiCall();
    }, 2000);

    fetchData();
    fetchMaterialNames();
  }, []);

  const fetchMaterialNames = async () => {
    try {
      setLoadingMaterials(true);
      const response = await api.get('/admin/item-names?category=consumables');
      if (response.data.success) {
        setMaterialNames(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching material names:', error);
      showToast('Failed to load material names', 'error');
    } finally {
      setLoadingMaterials(false);
    }
  };

  const fetchData = async () => {
    try {
      console.log('🚀 Fetching stock data with optimization...');
      startTiming();

      // Use optimized batch fetch
      const results = await optimizedApi.fetchStockPageData();

      const duration = endTiming();
      console.log(`⚡ Batch fetch completed in ${duration}ms`);

      let hasAnySuccess = false;

      // Process results
      results.forEach(result => {
        if (result.success) {
          hasAnySuccess = true;
          if (result.url.includes('/stocks')) {
            setStocks(result.data.data || []);
            console.log('📦 Stocks loaded:', result.data.data?.length || 0);
          } else if (result.url.includes('/projects')) {
            const projects = result.data.data || [];
            setProjects(projects);
            if (projects.length > 0) {
              setFormData(prev => ({ ...prev, projectId: projects[0]._id }));
            }
            console.log('🏗️ Projects loaded:', projects.length);
          } else if (result.url.includes('/vendors')) {
            const vendors = result.data.data || [];
            setVendors(vendors);
            if (vendors.length > 0) {
              setFormData(prev => ({ ...prev, vendorId: vendors[0]._id }));
            }
            console.log('🏪 Vendors loaded:', vendors.length);
          }
        } else {
          console.error(`❌ API failed for ${result.url}:`, result.error);

          // Set empty data for failed requests
          if (result.url.includes('/stocks')) {
            setStocks([]);
            // Show specific message for stocks timeout
            if (result.error.includes('timeout')) {
              showToast('Stock data is taking too long to load. Please try again.', 'warning');
            } else {
              showToast('Failed to load stock data', 'error');
            }
          } else if (result.url.includes('/projects')) {
            setProjects([]);
            setFormData(prev => ({ ...prev, projectId: '' }));
          } else if (result.url.includes('/vendors')) {
            setVendors([]);
            setFormData(prev => ({ ...prev, vendorId: '' }));
          }
        }
      });

      if (hasAnySuccess) {
        console.log('✅ Partial data fetch completed successfully');
        showToast('Some data loaded successfully', 'success');
      } else {
        console.error('❌ All API requests failed');
        showToast('Unable to connect to server. Please check your connection.', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch data', 'error');
      console.error('❌ Error fetching data:', error);

      // Set empty data on error
      setStocks([]);
      setProjects([]);
      setVendors([]);
      setFormData(prev => ({ ...prev, projectId: '', vendorId: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.projectId) return showToast('Please select a project', 'error');
    if (!formData.vendorId) return showToast('Please select a vendor', 'error');
    if (!formData.materialName.trim()) return showToast('Please enter material name', 'error');
    if (!formData.quantity || formData.quantity <= 0) return showToast('Please enter valid quantity', 'error');
    if (!formData.unitPrice || formData.unitPrice <= 0) return showToast('Please enter valid unit price', 'error');

    // Check for at least one photo (single or multiple)
    if ((!formData.photos || formData.photos.length === 0) && !formData.photo) {
      return showToast('At least one photo is required', 'error');
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
      if (formData.remarks) submitData.append('remarks', formData.remarks);

      // Handle Multiple Photos
      if (formData.photos && formData.photos.length > 0) {
        Array.from(formData.photos).forEach(file => {
          submitData.append('photos', file);
        });
      } else if (formData.photo) {
        // Fallback Single
        submitData.append('photo', formData.photo);
      }

      const response = await optimizedApi.post('/admin/stocks', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        showToast('Stock added successfully', 'success');
        setShowForm(false);
        setFormData({
          projectId: projects[0]?._id || '',
          vendorId: vendors[0]?._id || '',
          materialName: '',
          unit: 'kg',
          quantity: '',
          unitPrice: '',
          photo: null,
          photos: [], // Reset photos
          remarks: ''
        });
        setPhotoPreview('');
        setPhotoPreviews([]); // Reset previews
        // Invalidate cache and refresh data
        optimizedApi.invalidateCache('stocks');
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to add stock', 'error');
      console.error('Error adding stock:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this stock entry?')) return;
    try {
      const response = await optimizedApi.delete(`/admin/stocks/${id}`);
      if (response.data.success) {
        showToast('Stock deleted', 'success');
        // Invalidate cache and refresh data
        optimizedApi.invalidateCache('stocks');
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to delete stock', 'error');
      console.error('Error deleting stock:', error);
    }
  };

  const handleEdit = (stock) => {
    setEditingStock(stock);
    setFormData({
      projectId: stock.projectId || '',
      vendorId: stock.vendorId || '',
      materialName: stock.materialName,
      unit: stock.unit,
      quantity: stock.quantity,
      unitPrice: stock.unitPrice,
      photo: stock.photo || '', // Existing main photo
      photos: [], // We don't load file objects for existing photos, only URLs are stored in stock.photos
      remarks: stock.remarks || ''
    });
    // Set previews for existing photos
    setPhotoPreviews(stock.photos || (stock.photo ? [stock.photo] : []));
    setShowForm(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingStock) return;

    try {
      setIsSubmitting(true);

      // Use FormData for update to support file upload
      const submitData = new FormData();
      submitData.append('projectId', formData.projectId);
      submitData.append('vendorId', formData.vendorId);
      submitData.append('materialName', formData.materialName);
      submitData.append('unit', formData.unit);
      submitData.append('quantity', formData.quantity);
      submitData.append('unitPrice', formData.unitPrice);
      submitData.append('totalPrice', Number(formData.quantity) * Number(formData.unitPrice));
      if (formData.remarks) submitData.append('remarks', formData.remarks);

      // Handle New Photos
      if (formData.photos && formData.photos.length > 0) {
        Array.from(formData.photos).forEach(file => {
          submitData.append('photos', file);
        });
      }

      const response = await optimizedApi.put(`/admin/stocks/${editingStock._id}`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        showToast('Stock updated successfully', 'success');
        setShowForm(false);
        setEditingStock(null);
        setFormData({
          projectId: projects[0]?._id || '',
          vendorId: vendors[0]?._id || '',
          materialName: '',
          unit: 'kg',
          quantity: '',
          unitPrice: '',
          photo: '',
          photos: [],
          remarks: ''
        });
        setPhotoPreviews([]);
        optimizedApi.invalidateCache('stocks');
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to update stock', 'error');
      console.error('Error updating stock:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [photoPreviews, setPhotoPreviews] = useState([]);

  const handlePhoto = (files) => {
    if (!files || files.length === 0) {
      return;
    }

    // Convert FileList to Array
    const fileArray = Array.from(files);

    // Update form data - append new files to existing photos
    setFormData(prev => {
      const currentPhotos = Array.isArray(prev.photos) ? prev.photos : [];
      const updatedPhotos = [...currentPhotos, ...fileArray];
      return {
        ...prev,
        photos: updatedPhotos,
        photo: updatedPhotos[0] // Update legacy field with first photo
      };
    });

    // Generate previews and append to existing previews
    const newPreviews = fileArray.map(file => URL.createObjectURL(file));
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemovePhoto = (index) => {
    setFormData(prev => {
      const currentPhotos = [...(prev.photos || [])];
      currentPhotos.splice(index, 1);
      return {
        ...prev,
        photos: currentPhotos,
        photo: currentPhotos[0]
      };
    });

    setPhotoPreviews(prev => {
      const currentPreviews = [...prev];
      currentPreviews.splice(index, 1);
      return currentPreviews;
    });
  };

  const handleViewDetail = (stock) => {
    setSelectedStock(stock);
    setShowDetail(true);
  };

  // Filter stocks based on project and date
  const getFilteredStocks = () => {
    let filtered = [...stocks];

    // Filter by project
    if (filterProject) {
      filtered = filtered.filter(s => {
        const stockProjectId = typeof s.projectId === 'object' ? s.projectId._id : s.projectId;
        return stockProjectId === filterProject;
      });
    }

    // Filter by date range
    if (filterDateFrom) {
      filtered = filtered.filter(s => new Date(s.createdAt) >= new Date(filterDateFrom));
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999); // Include entire end date
      filtered = filtered.filter(s => new Date(s.createdAt) <= toDate);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.materialName?.toLowerCase().includes(query) ||
        s.remarks?.toLowerCase().includes(query) ||
        (typeof s.projectId === 'object' && s.projectId.name?.toLowerCase().includes(query)) ||
        (typeof s.vendorId === 'object' && s.vendorId.name?.toLowerCase().includes(query)) ||
        (!s.projectId && projects.find(p => p._id === s.projectId)?.name?.toLowerCase().includes(query)) || // fallback check
        (!s.vendorId && vendors.find(v => v._id === s.vendorId)?.name?.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const filteredStocks = getFilteredStocks();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Stock Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              debugAuth();
              testApiCall();
            }}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm"
          >
            Debug Auth
          </button>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
          >
            Refresh Data
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            {showForm ? 'Cancel' : 'Add Stock'}
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search material, vendor..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {(filterProject || filterDateFrom || filterDateTo || searchQuery) && (
          <button
            onClick={() => {
              setFilterProject('');
              setFilterDateFrom('');
              setFilterDateTo('');
              setSearchQuery('');
            }}
            className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={editingStock ? handleUpdate : handleSubmit} className="mt-5 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
              <select
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Material Name</label>
            {loadingMaterials ? (
              <div className="text-sm text-gray-500">Loading materials...</div>
            ) : (
              <select
                value={formData.materialName}
                onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Material</option>
                {materialNames.map(item => (
                  <option key={item._id} value={item.name}>{item.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                required
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
                placeholder="Quantity"
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
                placeholder="Price per unit"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Photos * (Upload Multiple)</label>
            <input
              type="file"
              accept="image/*"
              multiple // Allow multiple files
              onChange={(e) => handlePhoto(e.target.files)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Gallery Preview */}
            {photoPreviews && photoPreviews.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 md:grid-cols-5 gap-2">
                {photoPreviews.map((src, index) => (
                  <div key={index} className="relative h-24 border rounded overflow-hidden group">
                    <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-0 right-0 bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-bl opacity-75 hover:opacity-100 transition-opacity"
                      title="Remove Photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : photoPreview ? (
              // Legacy single preview fallback
              <div className="mt-2">
                <img src={photoPreview} alt="Preview" className="h-24 w-24 object-cover rounded border" />
              </div>
            ) : null}

            {!photoPreviews?.length && !photoPreview && (
              <p className="text-xs text-red-600 mt-1">At least one photo is required</p>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Optional remarks"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
            {isSubmitting ? 'Processing...' : (editingStock ? 'Update Stock' : 'Add Stock')}
          </button>
        </form>
      )}

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Stock Inventory</h2>

        {/* Mobile View */}
        <div className="block md:hidden space-y-3">
          {filteredStocks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No stock records found</p>
              <p className="text-sm mt-2">{(filterProject || filterDateFrom || filterDateTo) ? 'Try adjusting your filters' : 'Add your first stock entry above'}</p>
            </div>
          ) : (
            filteredStocks.map(s => (
              <div key={s._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-bold text-gray-900 mb-2">{s.materialName}</div>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">Project:</span> <span className="font-bold">{typeof s.projectId === 'object' ? s.projectId?.name : projects.find(p => p._id === s.projectId)?.name || '-'}</span></div>
                  <div><span className="font-medium">Quantity:</span> <span className="font-bold">{s.quantity} {s.unit}</span></div>
                  <div><span className="font-medium">Unit Price:</span> <span className="text-green-600 font-bold">₹{s.unitPrice?.toLocaleString()}</span></div>
                  <div><span className="font-medium">Total:</span> <span className="text-green-700 font-bold">₹{s.totalPrice?.toLocaleString()}</span></div>
                  <div><span className="font-medium">Vendor:</span> {typeof s.vendorId === 'object' ? s.vendorId?.name : vendors.find(v => v._id === s.vendorId)?.name || '-'}</div>
                  {s.remarks && <div><span className="font-medium">Remarks:</span> {s.remarks}</div>}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleViewDetail(s)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(s)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s._id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          {filteredStocks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No stock records found</p>
              <p className="text-sm mt-2">{(filterProject || filterDateFrom || filterDateTo) ? 'Try adjusting your filters' : 'Add your first stock entry above'}</p>
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Photo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map(s => (
                  <tr key={s._id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">{typeof s.projectId === 'object' ? s.projectId?.name : projects.find(p => p._id === s.projectId)?.name || '-'}</td>
                    <td className="px-4 py-3">{s.materialName}</td>
                    <td className="px-4 py-3 font-bold">{s.quantity}</td>
                    <td className="px-4 py-3">{s.unit}</td>
                    <td className="px-4 py-3 text-green-600 font-bold">₹{s.unitPrice?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-700 font-bold">₹{s.totalPrice?.toLocaleString()}</td>
                    <td className="px-4 py-3">{typeof s.vendorId === 'object' ? s.vendorId?.name : vendors.find(v => v._id === s.vendorId)?.name || '-'}</td>
                    <td className="px-4 py-3">
                      {s.photo ? (
                        <img src={s.photo} alt="Stock" className="h-12 w-12 object-cover rounded border cursor-pointer"
                          onClick={() => handleViewDetail(s)} />
                      ) : (
                        <span className="text-gray-400 text-xs">No photo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetail(s)}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(s)}
                          className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s._id)}
                          className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
                <div className="mb-4">
                  {/* Photos Gallery */}
                  {selectedStock.photos && selectedStock.photos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {selectedStock.photos.map((photo, idx) => (
                        <div key={idx} className="bg-gray-100 p-2 rounded-lg">
                          <img src={photo} alt={`Stock ${idx}`} className="w-full h-48 object-contain rounded border border-gray-300" />
                        </div>
                      ))}
                    </div>
                  ) : selectedStock.photo ? (
                    <div className="flex justify-center bg-gray-100 p-4 rounded-lg">
                      <img src={selectedStock.photo} alt="Stock" className="max-w-full h-80 object-contain rounded border-2 border-gray-300 shadow-lg" />
                    </div>
                  ) : (
                    <div className="flex justify-center bg-gray-100 p-8 rounded-lg">
                      <p className="text-gray-400 text-lg">📷 No photo available</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Project</label>
                    <p className="text-lg font-semibold">{typeof selectedStock.projectId === 'object' ? selectedStock.projectId?.name : projects.find(p => p._id === selectedStock.projectId)?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Vendor</label>
                    <p className="text-lg font-semibold">{typeof selectedStock.vendorId === 'object' ? selectedStock.vendorId?.name : vendors.find(v => v._id === selectedStock.vendorId)?.name || '-'}</p>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
