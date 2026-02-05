import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';

const Stock = () => {
    const { user } = useAuth();
    const { selectedProject } = useSiteManager();
    const [movements, setMovements] = useState([]);
    const [projects, setProjects] = useState([]);
    const [materials, setMaterials] = useState([]); // Available materials from stocks
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
    const [filters, setFilters] = useState({ startDate: '', endDate: '', search: '' });

    // Stock Out Form State
    const [showOutForm, setShowOutForm] = useState(false);
    const [outFormData, setOutFormData] = useState({
        projectId: '',
        materialName: '',
        quantity: '',
        unit: 'kg',
        usedFor: '',
        remarks: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchProjects();
        fetchMovements(); // Fetch stock out records
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, filters.search, selectedProject]); // Add selectedProject dependency

    // Fetch materials when project is selected
    useEffect(() => {
        if (outFormData.projectId) {
            fetchMaterials(outFormData.projectId);
        }
    }, [outFormData.projectId]);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/site/projects');
            if (res.data.success) {
                let filteredProjects = res.data.data;
                if (selectedProject) {
                    filteredProjects = res.data.data.filter(p => p._id === selectedProject._id);
                }
                setProjects(filteredProjects);
                // Auto-select project in form if we have one
                if (filteredProjects.length > 0) {
                    setOutFormData(prev => ({ ...prev, projectId: filteredProjects[0]._id }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch projects', error);
        }
    };

    const fetchMaterials = async (projectId) => {
        try {
            // Fetch all stocks for the selected project
            const res = await api.get('/site/stocks');
            if (res.data.success) {
                // Filter stocks by projectId and extract unique material names
                const projectStocks = res.data.data.filter(s => {
                    const stockProjectId = typeof s.projectId === 'object' ? s.projectId._id : s.projectId;
                    return stockProjectId === projectId && s.quantity > 0;
                });

                // Get unique material names
                const uniqueMaterials = [...new Set(projectStocks.map(s => s.materialName))];
                setMaterials(uniqueMaterials);
                console.log(`✅ Materials loaded for project: ${uniqueMaterials.length}`);
            }
        } catch (error) {
            console.error('Failed to fetch materials', error);
        }
    };

    const fetchMovements = async () => {
        try {
            const res = await api.get('/site/stock-outs');
            if (res.data.success) {
                let filteredMovements = res.data.data;
                if (selectedProject) {
                    filteredMovements = res.data.data.filter(m => {
                        const movementProjectId = typeof m.projectId === 'object' ? m.projectId._id : m.projectId;
                        return movementProjectId === selectedProject._id;
                    });
                }
                setMovements(filteredMovements);
                console.log('✅ Stock Out records loaded:', filteredMovements.length);
            }
        } catch (error) {
            console.error('Failed to fetch stock outs', error);
        }
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
        fetchMovements();
    };

    const handleStockOutSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await api.post('/site/stock-out', outFormData);
            if (res.data.success) {
                showToast('Stock Out recorded successfully', 'success');
                setShowOutForm(false);
                setOutFormData({ projectId: '', materialName: '', quantity: '', unit: 'kg', usedFor: '', remarks: '' });
                // Refresh materials to show updated quantities
                if (outFormData.projectId) {
                    fetchMaterials(outFormData.projectId);
                }
                // Refresh table to show new stock out record
                fetchMovements();
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to record stock out', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Stock Management</h1>
                <button
                    onClick={() => setShowOutForm(true)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                >
                    Record Stock usage (Out)
                </button>
            </div>

            {/* Filters */}
            <form onSubmit={handleFilterSubmit} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <input
                        type="text"
                        placeholder="Material, Vendor, Remarks..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                    />
                </div>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 h-10">
                    Apply Filters
                </button>
            </form>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    {/* Desktop View */}
                    <table className="hidden md:table w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Material</th>
                                <th className="px-4 py-3">Quantity</th>
                                <th className="px-4 py-3">Project</th>
                                <th className="px-4 py-3">Vendor / Used For</th>
                                <th className="px-4 py-3">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {movements.length > 0 ? movements.map(move => (
                                <tr key={move._id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">{new Date(move.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${move.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {move.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium">{move.material}</td>
                                    <td className="px-4 py-3 font-bold">
                                        {move.quantity} {move.unit}
                                    </td>
                                    <td className="px-4 py-3">{move.project}</td>
                                    <td className="px-4 py-3">
                                        {move.type === 'IN' ? (
                                            <span className="text-gray-600">Vendor: {move.vendor}</span>
                                        ) : (
                                            <span className="text-gray-600">Used: {move.usedFor}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{move.remarks}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No records found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="md:hidden">
                        {movements.length > 0 ? (
                            <div className="divide-y divide-gray-200">
                                {movements.map(move => (
                                    <div key={move._id} className="p-4 bg-white hover:bg-gray-50">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${move.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {move.type}
                                                </span>
                                                <h3 className="font-bold text-gray-900">{move.material}</h3>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900">
                                                {move.quantity} {move.unit}
                                            </span>
                                        </div>

                                        <div className="text-sm text-gray-600 space-y-1 mb-2">
                                            <p><span className="font-medium">Date:</span> {new Date(move.date).toLocaleDateString()}</p>
                                            <p><span className="font-medium">Project:</span> {move.project}</p>
                                            <p>
                                                <span className="font-medium">{move.type === 'IN' ? 'Vendor:' : 'Used For:'}</span> {' '}
                                                {move.type === 'IN' ? move.vendor : move.usedFor}
                                            </p>
                                            {move.remarks && (
                                                <p className="text-gray-500 italic">"{move.remarks}"</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500">No records found</div>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between items-center">
                    <button
                        disabled={pagination.page <= 1}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        className="px-3 py-1 bg-white border rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-600">
                        Page {pagination.page} of {pagination.pages || 1}
                    </span>
                    <button
                        disabled={pagination.page >= pagination.pages}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        className="px-3 py-1 bg-white border rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Stock Out Modal */}
            {showOutForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">Record Stock Usage (Out)</h2>
                        <form onSubmit={handleStockOutSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Project</label>
                                <select
                                    value={outFormData.projectId}
                                    onChange={e => setOutFormData({ ...outFormData, projectId: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border rounded"
                                >
                                    <option value="">Select Project</option>
                                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Material Name</label>
                                <select
                                    required
                                    value={outFormData.materialName}
                                    onChange={e => setOutFormData({ ...outFormData, materialName: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                >
                                    <option value="">Select Material</option>
                                    {materials.map((mat, idx) => (
                                        <option key={idx} value={mat}>{mat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        required
                                        value={outFormData.quantity}
                                        onChange={e => setOutFormData({ ...outFormData, quantity: e.target.value })}
                                        className="w-full px-3 py-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Unit</label>
                                    <select
                                        value={outFormData.unit}
                                        onChange={e => setOutFormData({ ...outFormData, unit: e.target.value })}
                                        className="w-full px-3 py-2 border rounded"
                                    >
                                        {['kg', 'ltr', 'bags', 'pcs', 'meter', 'box', 'ton'].map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Used For (Details)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Block A Slab"
                                    value={outFormData.usedFor}
                                    onChange={e => setOutFormData({ ...outFormData, usedFor: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Remarks</label>
                                <input
                                    type="text"
                                    value={outFormData.remarks}
                                    onChange={e => setOutFormData({ ...outFormData, remarks: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowOutForm(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Record Out'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stock;
