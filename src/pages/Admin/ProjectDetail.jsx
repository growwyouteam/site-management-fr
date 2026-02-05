import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { showToast } from '../../components/Toast';

const ProjectDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);

      // Validate ID before making API call
      if (!id || id === 'undefined') {
        showToast('Invalid project ID', 'error');
        setData(null);
        setLoading(false);
        return;
      }

      // Make all API calls in parallel for better performance
      // Make API call for optimized project details (includes all related data)
      const projectResponse = await api.get(`/admin/projects/${id}`);

      if (!projectResponse.data.success) {
        setData(null);
        setLoading(false);
        showToast(projectResponse.data.error || 'Failed to fetch project details', 'error');
        return;
      }

      const projectData = projectResponse.data.data;

      setData({
        project: projectData.project,
        expenses: projectData.expenses || [],
        stocks: projectData.stocks || [],
        machines: projectData.machines || [],
        labours: projectData.labours || [],
        contractors: projectData.contractors || []
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching project:', error);
      showToast('Failed to load project details', 'error');
      setData(null);
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="p-8 text-center text-gray-500">
      <p>Loading project details...</p>
    </div>
  );

  if (!data) return (
    <div className="p-8 text-center text-gray-500">
      <p>Project not found.</p>
      <Link to="/admin/projects" className="text-blue-500 font-medium">Back to Projects</Link>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{data.project.name}</h1>
      <p className="text-gray-600 mt-2">📍 {data.project.location}</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Budget</h3>
          <p className="text-2xl md:text-3xl font-bold text-blue-600">₹{data.project.budget?.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Expenses</h3>
          <p className="text-2xl md:text-3xl font-bold text-red-600">₹{data.project.expenses?.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Labours</h3>
          <p className="text-2xl md:text-3xl font-bold text-green-600">
            {data.labours?.reduce((sum, l) => sum + (l.dailyWage || 0), 0).toLocaleString()}
            <span className="text-sm text-gray-500 font-normal ml-1">/day</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">{data.labours?.length || 0} active workers</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Stock Items</h3>
          <p className="text-2xl md:text-3xl font-bold text-orange-600">{data.stocks?.length || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Contractors</h3>
          <p className="text-2xl md:text-3xl font-bold text-purple-600">{data.contractors?.length || 0}</p>
        </div>
      </div>



      {/* Active Machines Section */}
      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Active Machines ({data.machines?.length || 0})</h2>
        {data.machines && data.machines.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Machine Name</th>
                  <th className="px-4 py-3">Model/Plate</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rental</th>
                </tr>
              </thead>
              <tbody>
                {data.machines.map(machine => (
                  <tr key={machine._id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{machine.name}</td>
                    <td className="px-4 py-3">
                      {machine.model && <span>{machine.model}</span>}
                      {machine.plateNumber && <span className="ml-1">({machine.plateNumber})</span>}
                    </td>
                    <td className="px-4 py-3">{machine.category}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${machine.status === 'in-use' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {machine.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {machine.assignedAsRental ? (
                        <span className="text-purple-600 font-bold">₹{machine.assignedRentalPerDay}/day</span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400">No machines assigned to this project</p>
        )}
      </div>

      {/* Stock Items Section */}
      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Stock Items ({data.stocks?.length || 0})</h2>
        {data.stocks && data.stocks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Consumed</th>
                  <th className="px-4 py-3">Left</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.stocks.map(stock => (
                  <tr key={stock._id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{stock.materialName}</td>
                    <td className="px-4 py-3">{stock.vendorId?.name || '-'}</td>
                    <td className="px-4 py-3 font-semibold">{stock.quantity} {stock.unit}</td>
                    <td className="px-4 py-3 text-red-600">{stock.consumed || 0} {stock.unit}</td>
                    <td className="px-4 py-3 text-green-600 font-bold">{(stock.quantity - (stock.consumed || 0))} {stock.unit}</td>
                    <td className="px-4 py-3">₹{stock.unitPrice}</td>
                    <td className="px-4 py-3 font-bold text-green-600">₹{stock.totalPrice?.toLocaleString()}</td>
                    <td className="px-4 py-3">{new Date(stock.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400">No stock items for this project</p>
        )}
      </div>

      {/* Labours Section */}
      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Labours ({data.labours?.length || 0})</h2>
        {data.labours && data.labours.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Wage/Day</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.labours.map(labour => (
                  <tr key={labour._id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{labour.name}</td>
                    <td className="px-4 py-3">{labour.designation || '-'}</td>
                    <td className="px-4 py-3">{labour.phone || '-'}</td>
                    <td className="px-4 py-3 font-bold text-blue-600">₹{labour.dailyWage}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${labour.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {labour.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400">No labours assigned to this project</p>
        )}
      </div>

      {/* Contractors Section */}
      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Contractors ({data.contractors?.length || 0})</h2>
        {data.contractors && data.contractors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3">Expense/Unit</th>
                  <th className="px-4 py-3">Total Payable</th>
                </tr>
              </thead>
              <tbody>
                {data.contractors.map(contractor => (
                  <tr key={contractor._id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{contractor.name}</td>
                    <td className="px-4 py-3">{contractor.mobile}</td>
                    <td className="px-4 py-3">{contractor.address}</td>
                    <td className="px-4 py-3">{contractor.distanceValue} {contractor.distanceUnit}</td>
                    <td className="px-4 py-3 font-bold text-blue-600">₹{contractor.expensePerUnit?.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-green-600">
                      ₹{((contractor.distanceValue || 0) * (contractor.expensePerUnit || 0)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400">No contractors assigned to this project</p>
        )}
      </div>

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Expenses</h2>
        {data.expenses && data.expenses.length > 0 ? (
          <>
            {/* Mobile View */}
            <div className="block md:hidden space-y-3">
              {data.expenses.slice(0, 5).map(e => (
                <div key={e._id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900">{e.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    <div className="font-bold text-green-600">₹{e.amount?.toLocaleString()}</div>
                    <div>{new Date(e.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.slice(0, 5).map(e => (
                    <tr key={e._id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">{e.name}</td>
                      <td className="px-4 py-3 font-bold text-green-600">₹{e.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3">{new Date(e.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-gray-400">No expenses recorded</p>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
