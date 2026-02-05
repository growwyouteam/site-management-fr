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
        fetchAllItems();
    }, []);

    const fetchAllItems = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/item-names');
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

    const fetchItemNames = async () => {
        // Refresh all items instead of just by category to keep table updated
        fetchAllItems();
    };

    const openCategory = (id) => {
        setActiveCategory(id);
        setShowModal(true);
    };

    const closeCategory = () => {
        setShowModal(false);
        setActiveCategory(null);
        setNewItemName('');
    };

    const handleAddName = async (e) => {
        e.preventDefault();
        if (!newItemName.trim() || !activeCategory) return;

        try {
            const response = await api.post('/admin/item-names', {
                category: activeCategory,
                name: newItemName
            });

            if (response.data.success) {
                showToast('Item name added successfully', 'success');
                fetchItemNames();
                closeCategory();
            }
        } catch (error) {
            console.error('Error adding item name:', error);
            showToast(error.response?.data?.error || 'Failed to add item name', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item name?')) return;

        try {
            const response = await api.delete(`/admin/item-names/${id}`);
            if (response.data.success) {
                showToast('Item name deleted successfully', 'success');
                fetchItemNames();
            }
        } catch (error) {
            console.error('Error deleting item name:', error);
            showToast('Failed to delete item name', 'error');
        }
    };

    const activeCategoryLabel = categories.find(c => c.id === activeCategory)?.label;

    // Filter items for the table view
    const machineItems = itemNames.filter(i => i.category === 'big');
    const labItems = itemNames.filter(i => i.category === 'lab');
    const consumableItems = itemNames.filter(i => i.category === 'consumables');
    const equipmentItems = itemNames.filter(i => i.category === 'equipment');

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Stock Details</h1>

            {/* Quick Add Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => openCategory(cat.id)}
                        className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-500 transition-all text-center group flex flex-col items-center justify-center gap-3"
                    >
                        <div className="text-3xl group-hover:scale-110 transition-transform">➕</div>
                        <span className="font-semibold text-gray-700 group-hover:text-blue-600">Add {cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">

                    {/* Column 1: Machines */}
                    <div className="flex flex-col h-full">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-800 text-center">
                            🏗️ Machine Name
                        </div>
                        <div className="p-0 divide-y divide-gray-100">
                            {machineItems.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-sm italic">No machines added</div>
                            ) : (
                                machineItems.map(item => (
                                    <div key={item._id} className="p-3 hover:bg-blue-50 transition-colors text-sm text-gray-700 flex justify-between group">
                                        <span>{item.name}</span>
                                        <button onClick={() => handleDelete(item._id)} className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600">×</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Column 2: Lab Equipment */}
                    <div className="flex flex-col h-full">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-800 text-center">
                            🧪 Lab Equipment Name
                        </div>
                        <div className="p-0 divide-y divide-gray-100">
                            {labItems.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-sm italic">No lab equipment added</div>
                            ) : (
                                labItems.map(item => (
                                    <div key={item._id} className="p-3 hover:bg-purple-50 transition-colors text-sm text-gray-700 flex justify-between group">
                                        <span>{item.name}</span>
                                        <button onClick={() => handleDelete(item._id)} className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600">×</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Column 3: Consumables */}
                    <div className="flex flex-col h-full">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-800 text-center">
                            📦 Consumable Goods Name
                        </div>
                        <div className="p-0 divide-y divide-gray-100">
                            {consumableItems.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-sm italic">No consumables added</div>
                            ) : (
                                consumableItems.map(item => (
                                    <div key={item._id} className="p-3 hover:bg-green-50 transition-colors text-sm text-gray-700 flex justify-between group">
                                        <span>{item.name}</span>
                                        <button onClick={() => handleDelete(item._id)} className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600">×</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Column 4: Equipment */}
                    <div className="flex flex-col h-full">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-800 text-center">
                            🔧 Equipment Name
                        </div>
                        <div className="p-0 divide-y divide-gray-100">
                            {equipmentItems.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-sm italic">No equipment added</div>
                            ) : (
                                equipmentItems.map(item => (
                                    <div key={item._id} className="p-3 hover:bg-orange-50 transition-colors text-sm text-gray-700 flex justify-between group">
                                        <span>{item.name}</span>
                                        <button onClick={() => handleDelete(item._id)} className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600">×</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Manage Names Modal - Simplified for Adding Only */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl animate-fade-in-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">
                                Add {activeCategoryLabel}
                            </h3>
                            <button onClick={closeCategory} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <form onSubmit={handleAddName}>
                            <input
                                type="text"
                                placeholder={`Enter ${activeCategoryLabel}...`}
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeCategory}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newItemName.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Add Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockDetails;
