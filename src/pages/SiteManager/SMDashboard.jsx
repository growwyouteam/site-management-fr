import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import { runSiteManagerDebug } from '../../utils/debugSiteManager';

const SMDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      console.log('🔄 Fetching Site Manager Dashboard...');
      const response = await api.get('/site/dashboard');
      console.log('Site Manager Dashboard Response:', response.data);

      if (response.data.success) {
        setData(response.data.data);
        console.log('✅ Dashboard data loaded:', {
          projects: response.data.data.assignedProjects?.length || 0,
          labours: response.data.data.labourCount || 0,
          attendance: response.data.data.todayAttendance?.length || 0,
          notifications: response.data.data.notifications?.length || 0
        });
      } else {
        console.error('❌ Dashboard API failed:', response.data.error);
        showToast(response.data.error || 'Failed to load dashboard', 'error');
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard:', error);
      showToast('Failed to fetch dashboard data', 'error');

      // Check if it's an authentication error
      if (error.response?.status === 401) {
        showToast('Please login again', 'error');
        // Optionally redirect to login
      } else if (error.response?.status === 403) {
        showToast('Access denied. You may not have site manager permissions.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const runDebug = async () => {
    setDebugMode(true);
    try {
      console.log('🔍 Starting Site Manager Debug...');

      // Simple debug check
      const token = localStorage.getItem('token');
      console.log('📝 Token exists:', !!token);
      console.log('👤 Current User:', user);

      // Test dashboard API
      const response = await api.get('/site/dashboard');
      console.log('✅ Dashboard Response:', response.data);

      if (response.data.success) {
        const data = response.data.data;
        console.log('📊 User Info:', {
          name: data.user?.name,
          role: data.user?.role,
          assignedSites: data.user?.assignedSites
        });
        console.log('🏗️ Assigned Projects:', data.assignedProjects?.length || 0);
        console.log('👷 Labour Count:', data.labourCount || 0);

        if (!data.user?.assignedSites || data.user.assignedSites.length === 0) {
          console.warn('⚠️ NO ASSIGNED SITES - Admin needs to assign projects to you!');
          showToast('No projects assigned. Contact admin.', 'warning');
        } else if (data.assignedProjects.length === 0) {
          console.warn('⚠️ NO PROJECTS FOUND - Check project assignments!');
          showToast('Projects not found. Contact admin.', 'warning');
        } else {
          console.log('✅ Everything looks good!');
          showToast('Dashboard working correctly!', 'success');
        }
      }

      showToast('Debug completed! Check console.', 'success');
    } catch (error) {
      console.error('❌ Debug Error:', error);
      showToast(`Debug failed: ${error.message}`, 'error');
    } finally {
      setDebugMode(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Site Manager Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome, {data?.user?.name}</p>
        </div>
        {/* <div className="flex gap-2">
          <button
            onClick={runDebug}
            disabled={debugMode}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            🔍 {debugMode ? 'Debugging...' : 'Debug'}
          </button>
          <button
            onClick={fetchDashboard}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            🔄 Refresh
          </button>
        </div> */}
      </div>

      <div className="mt-6 mb-6">
        <div className={`relative overflow-hidden rounded-2xl shadow-lg p-6 sm:p-8 transition-all ${(data?.user?.walletBalance || 0) < 0
          ? 'bg-gradient-to-br from-red-600 to-red-800'
          : 'bg-gradient-to-br from-indigo-600 to-blue-700'
          } text-white`}>
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-indigo-100 text-sm font-bold uppercase tracking-wider mb-1">My Wallet Balance</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold">
                  ₹{data?.user?.walletBalance?.toLocaleString() || 0}
                </span>
                {(data?.user?.walletBalance || 0) < 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                    OVERDRAFT
                  </span>
                )}
              </div>
              <p className="mt-2 text-indigo-100 opacity-90 text-sm max-w-xl">
                {(data?.user?.walletBalance || 0) >= 0
                  ? 'Funds allocated for site expenses. Use responsibly. Click to view history.'
                  : 'Warning: Your expenses exceed the allocated funds. Please request a top-up from Admin.'}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
              <div className="text-4xl">💰</div>
              <Link to="/site/wallet-history" className="absolute inset-0 z-0" aria-label="View Wallet History"></Link>
            </div>
          </div>


          {/* Decorative circles */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white opacity-5 rounded-full blur-3xl"></div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-500 text-white p-5 md:p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium opacity-90 mb-2">Assigned Projects</h3>
          <p className="text-2xl md:text-3xl font-bold">{data?.assignedProjects?.length || 0}</p>
        </div>
        <div className="bg-green-500 text-white p-5 md:p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium opacity-90 mb-2">Total Labours</h3>
          <p className="text-2xl md:text-3xl font-bold">{data?.labourCount || 0}</p>
        </div>
        <div className="bg-orange-500 text-white p-5 md:p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium opacity-90 mb-2">Today Attendance</h3>
          <p className="text-2xl md:text-3xl font-bold">{data?.todayAttendance?.length || 0}</p>
        </div>
        <div className="bg-purple-500 text-white p-5 md:p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium opacity-90 mb-2">Notifications</h3>
          <p className="text-2xl md:text-3xl font-bold">{data?.notifications?.length || 0}</p>
        </div>
      </div>

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link to="/site/attendance" className="bg-blue-500 text-white p-4 rounded-lg text-center font-semibold hover:bg-blue-600 transition-colors">
            <div className="text-2xl mb-1">📸</div>
            <div className="text-xs md:text-sm">Mark Attendance</div>
          </Link>
          <Link to="/site/labour" className="bg-green-500 text-white p-4 rounded-lg text-center font-semibold hover:bg-green-600 transition-colors">
            <div className="text-2xl mb-1">👷</div>
            <div className="text-xs md:text-sm">Manage Labour</div>
          </Link>
          <Link to="/site/stock-in" className="bg-orange-500 text-white p-4 rounded-lg text-center font-semibold hover:bg-orange-600 transition-colors">
            <div className="text-2xl mb-1">📦</div>
            <div className="text-xs md:text-sm">Stock In</div>
          </Link>
          <Link to="/site/daily-report" className="bg-purple-500 text-white p-4 rounded-lg text-center font-semibold hover:bg-purple-600 transition-colors">
            <div className="text-2xl mb-1">📝</div>
            <div className="text-xs md:text-sm">Daily Report</div>
          </Link>
          <Link to="/site/expenses" className="bg-red-500 text-white p-4 rounded-lg text-center font-semibold hover:bg-red-600 transition-colors">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-xs md:text-sm">Add Expense</div>
          </Link>
          <Link to="/site/gallery" className="bg-cyan-500 text-white p-4 rounded-lg text-center font-semibold hover:bg-cyan-600 transition-colors">
            <div className="text-2xl mb-1">📷</div>
            <div className="text-xs md:text-sm">Gallery</div>
          </Link>
        </div>
      </div>

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Assigned Projects</h2>
        {data?.assignedProjects && data.assignedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.assignedProjects.map(project => (
              <Link
                key={project._id}
                to={`/site/projects/${project._id}`}
                className="block p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <h3 className="font-bold text-gray-900 mb-2">{project.name}</h3>
                <p className="text-sm text-gray-600 mb-1">📍 {project.location}</p>
                <p className="text-sm text-gray-600 mb-2">Budget: ₹{project.budget?.toLocaleString()}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${project.status === 'running' ? 'bg-green-100 text-green-800' :
                  project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                  {project.status || 'Active'}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">🏗️</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Projects Assigned</h3>
            <p className="text-gray-500 mb-4">
              You haven't been assigned to any projects yet. Please contact your admin to get project assignments.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Admin needs to assign projects to site managers from the Admin panel.
              </p>
            </div>
            <div className="mt-4 text-left">
              <button
                onClick={() => {
                  console.log('Debug Info:', {
                    user: data?.user,
                    assignedSites: data?.user?.assignedSites,
                    projects: data?.assignedProjects,
                    labourCount: data?.labourCount
                  });
                  alert('Debug info logged to console. Check browser console.');
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                🔍 Debug Info
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SMDashboard;
