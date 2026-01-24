import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';

const Labour = () => {
  const { user } = useAuth();
  const { selectedProject } = useSiteManager();
  const baseUrl = user?.role === 'admin' ? '/admin' : '/site';
  const [labours, setLabours] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', dailyWage: '', designation: '', assignedSite: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []); // Fetch data on mount

  useEffect(() => {
    if (selectedProject) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]); // Re-fetch when selected project changes

  const fetchData = async () => {
    try {
      const [laboursRes, projectsRes] = await Promise.all([
        api.get(`${baseUrl}/labours`),
        api.get(`${baseUrl}/projects`)
      ]);

      if (laboursRes.data.success) {
        let filteredLabours = laboursRes.data.data;
        console.log('🔍 Labour - Selected Project:', selectedProject?.name);
        // Filter labours by selected project
        if (selectedProject) {
          filteredLabours = laboursRes.data.data.filter(l => {
            const labourSiteId = typeof l.assignedSite === 'object' ? l.assignedSite._id : l.assignedSite;
            return labourSiteId === selectedProject._id;
          });
          console.log(`✅ Filtered ${filteredLabours.length} labours for project: ${selectedProject.name}`);
        }
        setLabours(filteredLabours);
      }

      if (projectsRes.data.success) {
        let filteredProjects = projectsRes.data.data;
        // Filter to show only selected project if one is set
        if (selectedProject) {
          filteredProjects = projectsRes.data.data.filter(p => p._id === selectedProject._id);
        }
        setProjects(filteredProjects);
        if (filteredProjects.length > 0) {
          setFormData(prev => ({ ...prev, assignedSite: filteredProjects[0]._id }));
        }
      }
    } catch (error) {
      showToast('Failed to fetch data', 'error');
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await api.post(`${baseUrl}/labours`, formData);
      if (response.data.success) {
        showToast('Labour enrolled successfully', 'success');
        setShowForm(false);
        setFormData({ name: '', phone: '', dailyWage: '', designation: '', assignedSite: projects[0]?._id || '' });
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to enroll labour', 'error');
      console.error('Error enrolling labour:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Labour Management</h1>
      <button
        onClick={() => setShowForm(!showForm)}
        className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
      >
        {showForm ? 'Cancel' : 'Enroll New Labour'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-5 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Labour Name</label>
              <input
                type="text"
                placeholder="Labour Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Daily Wage (₹)</label>
              <input
                type="number"
                placeholder="Daily Wage"
                value={formData.dailyWage}
                onChange={(e) => setFormData({ ...formData, dailyWage: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
              <input
                type="text"
                placeholder="e.g., Mason, Helper"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Site</label>
              <select
                value={formData.assignedSite}
                onChange={(e) => setFormData({ ...formData, assignedSite: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`mt-5 px-6 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
            {isSubmitting ? 'Processing...' : 'Enroll Labour'}
          </button>
        </form>
      )}

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Labour List</h2>

        {/* Mobile View */}
        <div className="block md:hidden space-y-3">
          {labours.map(l => (
            <div key={l._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-bold text-gray-900 mb-2">{l.name}</div>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Phone:</span> {l.phone}</div>
                <div><span className="font-medium">Daily Wage:</span> <span className="text-green-600 font-bold">₹{l.dailyWage}</span></div>
                <div><span className="font-medium">Designation:</span> {l.designation}</div>
                <div><span className="font-medium">Site:</span> {l.assignedSite?.name || 'Not assigned'}</div>
                <div><span className="font-medium">Pending:</span> <span className="text-red-600 font-bold">₹{l.pendingPayout || 0}</span></div>
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Daily Wage</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Designation</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Site</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Pending Payout</th>
              </tr>
            </thead>
            <tbody>
              {labours.map(l => (
                <tr key={l._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{l.name}</td>
                  <td className="px-4 py-3">{l.phone}</td>
                  <td className="px-4 py-3 text-green-600 font-bold">₹{l.dailyWage}</td>
                  <td className="px-4 py-3">{l.designation}</td>
                  <td className="px-4 py-3">{l.assignedSite?.name || 'Not assigned'}</td>
                  <td className="px-4 py-3 text-red-600 font-bold">₹{l.pendingPayout || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Labour;
