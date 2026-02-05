/**
 * Admin Dashboard
 * Shows summary and overview of all projects
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import optimizedApi from '../../services/optimizedApi';
import { showToast } from '../../components/Toast';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      console.log('🚀 Fetching dashboard data with optimization...');
      const startTime = Date.now();

      // Use optimized dashboard fetch
      const response = await optimizedApi.getDashboard();

      if (response.data.success) {
        setData(response.data.data);
        console.log(`⚡ Dashboard loaded in ${Date.now() - startTime}ms`);
      }
    } catch (error) {
      showToast('Failed to fetch dashboard data', 'error');
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 md:p-12 text-center text-lg text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">Admin Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-8">
        <Link to="/admin/projects" className="p-5 md:p-6 rounded-xl bg-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer no-underline">
          <h3 className="text-sm font-medium opacity-90 mb-2">Total Projects</h3>
          <p className="text-3xl md:text-4xl font-bold m-0">{data?.totalProjects || 0}</p>
        </Link>

        <Link to="/admin/projects" className="p-5 md:p-6 rounded-xl bg-green-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer no-underline">
          <h3 className="text-sm font-medium opacity-90 mb-2">Running Projects</h3>
          <p className="text-3xl md:text-4xl font-bold m-0">{data?.runningProjects || 0}</p>
        </Link>

        <Link to="/admin/projects" className="p-5 md:p-6 rounded-xl bg-purple-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer no-underline">
          <h3 className="text-sm font-medium opacity-90 mb-2">Completed Projects</h3>
          <p className="text-3xl md:text-4xl font-bold m-0">{data?.completedProjects || 0}</p>
        </Link>

        <Link to="/admin/users" className="p-5 md:p-6 rounded-xl bg-orange-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer no-underline">
          <h3 className="text-sm font-medium opacity-90 mb-2">Site Managers</h3>
          <p className="text-3xl md:text-4xl font-bold m-0">{data?.totalSiteManagers || 0}</p>
        </Link>

        <Link to="/admin/projects" className="p-5 md:p-6 rounded-xl bg-red-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer no-underline">
          <h3 className="text-sm font-medium opacity-90 mb-2">Total Labours</h3>
          <p className="text-3xl md:text-4xl font-bold m-0">{data?.totalLabours || 0}</p>
        </Link>

        <Link to="/admin/expenses" className="p-5 md:p-6 rounded-xl bg-yellow-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer no-underline">
          <h3 className="text-sm font-medium opacity-90 mb-2">Total Expenses</h3>
          <p className="text-3xl md:text-4xl font-bold m-0">₹{(data?.totalExpenses || 0).toLocaleString()}</p>
        </Link>
      </div>

      {/* Projects List */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 m-0">Projects</h2>
          <Link to="/admin/projects" className="text-blue-500 no-underline font-medium hover:text-blue-600">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {data?.projects && data.projects.length > 0 ? (
            data.projects.map(project => (
              <Link
                key={project._id}
                to={`/admin/projects/${project._id}`}
                className="p-4 md:p-5 bg-white rounded-lg shadow-sm border border-gray-200 no-underline text-inherit hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">{project.name}</h3>
                <p className="text-sm text-gray-600 mb-3">📍 {project.location}</p>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${project.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                    {project.status}
                  </span>
                  <span className="text-sm text-gray-600 font-medium">
                    Budget: ₹{(project.budget || 0).toLocaleString()}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-center text-gray-400 py-10 col-span-full">No projects found</p>
          )}
        </div>
      </div>
    </div>
  );
};


export default Dashboard;
