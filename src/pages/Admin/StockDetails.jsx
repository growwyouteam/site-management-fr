import { useState, useEffect } from 'react';
import { showToast } from '../../components/Toast';
import api from '../../services/api';

const StockDetails = () => {
    const [activeCategory, setActiveCategory] = useState(null);
    const [itemNames, setItemNames] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const categories = [
        { id: 'big', label: 'Machine Name' },
        { id: 'lab', label: 'Lab Equipment Name' },
        { id: 'consumables', label: 'Consumable Goods Name' },
        { id: 'equipment', label: 'Equipment Name' }
    ];

    useEffect(() => {
        if (activeCategory) {
            fetchItemNames();
        }
    }, [activeCategory]);

    const fetchItemNames = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/item-names?category=${activeCategory}`);
            if (response.data.success) {
                setItemNames(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching item names:', error);
            showToast('Failed to load item names', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddName = async (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        try {
            const response = await api.post('/admin/item-names', {
                name: newItemName,
                category: activeCategory
            });
            if (response.data.success) {
                showToast('Item name added successfully', 'success');
                setNewItemName('');
                fetchItemNames();
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to add item name', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this name?')) return;
        try {
            const response = await api.delete(`/admin/item-names/${id}`);
            if (response.data.success) {
                showToast('Item name deleted', 'success');
                fetchItemNames();
            }
        } catch (error) {
            showToast('Failed to delete item name', 'error');
        }
    };

    const openCategory = (categoryId) => {
        setActiveCategory(categoryId);
        setShowModal(true);
    };

    const closeCategory = () => {
        setShowModal(false);
        setActiveCategory(null);
        setItemNames([]);
        setNewItemName('');
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Stock Details</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => openCategory(cat.id)}
                        className="p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-500 transition-all text-center group"
                    >
                        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📦</div>
                        <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600">{cat.label}</h3>
                    </button>
                ))}
            </div>

            {/* Manage Names Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900">
                                {categories.find(c => c.id === activeCategory)?.label}
                            </h3>
                            <button onClick={closeCategory} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
                        </div>

                        <form onSubmit={handleAddName} className="flex gap-2 mb-6">
                            <input
                                type="text"
                                placeholder="Enter name to add..."
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={!newItemName.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add
                            </button>
                        </form>

                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="text-center py-8 text-gray-500">Loading...</div>
                            ) : itemNames.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No names added yet.</div>
                            ) : (
                                <div className="space-y-2">
                                    {itemNames.map(item => (
                                        <div key={item._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group hover:bg-gray-100">
                                            <span className="font-medium text-gray-700">{item.name}</span>
                                            <button
                                                onClick={() => handleDelete(item._id)}
                                                className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 p-1 rounded"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockDetails;
