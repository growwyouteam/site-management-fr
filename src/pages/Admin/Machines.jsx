import { Link } from 'react-router-dom';

const Machines = () => {
  const categories = [
    { id: 'big', name: 'Big Machines' },
    { id: 'lab', name: 'Lab Test Equipment' },
    // { id: 'consumables', name: 'Consumable Goods' },
    { id: 'equipment', name: 'Equipment' }
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Machines & Equipment</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {categories.map(cat => (
          <Link
            key={cat.id}
            to={`/admin/machines/${cat.id}`}
            className="block p-4 md:p-5 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 text-center font-semibold"
          >
            <div className="text-3xl mb-2">
              {cat.id === 'big' && '🚜'}
              {cat.id === 'lab' && '🔬'}
              {cat.id === 'consumables' && '📦'}
              {cat.id === 'equipment' && '🔧'}
            </div>
            <div className="text-sm md:text-base">{cat.name}</div>
          </Link>
        ))}
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Info</h2>
        <div className="space-y-3">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-500">
            <div className="font-semibold text-blue-900">🚜 Big Machines</div>
            <div className="text-sm text-blue-700 mt-1">Heavy construction equipment like JCB, Cranes, Rollers</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border-l-4 border-purple-500">
            <div className="font-semibold text-purple-900">🔬 Lab Equipment</div>
            <div className="text-sm text-purple-700 mt-1">Testing equipment for quality control</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-l-4 border-green-500">
            <div className="font-semibold text-green-900">📦 Consumable Goods</div>
            <div className="text-sm text-green-700 mt-1">Items that get consumed during construction</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border-l-4 border-orange-500">
            <div className="font-semibold text-orange-900">🔧 Equipment</div>
            <div className="text-sm text-orange-700 mt-1">Tools and general equipment</div>
          </div>
        </div>
        <div className="mt-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            💡 Click on any category above to view and manage items
          </p>
        </div>
      </div>
    </div>
  );
};

export default Machines;
