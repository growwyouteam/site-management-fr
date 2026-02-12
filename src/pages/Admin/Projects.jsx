import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { showToast } from '../../components/Toast';
import api from '../../services/api';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    budget: '',
    startDate: '',
    endDate: '',
    roadDistanceValue: '',
    roadDistanceUnit: 'km'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [editingProject, setEditingProject] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/admin/projects');
      if (response.data.success) {
        setProjects(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      showToast('Failed to fetch projects', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingProject) {
        const response = await api.put(`/admin/projects/${editingProject._id}`, formData);
        if (response.data.success) {
          showToast('Project updated successfully', 'success');
          setEditingProject(null);
          setShowForm(false);
          resetForm();
          fetchProjects();
        }
      } else {
        const response = await api.post('/admin/projects', formData);
        if (response.data.success) {
          showToast('Project created successfully', 'success');
          setShowForm(false);
          resetForm();
          fetchProjects();
        }
      }
    } catch (error) {
      console.error('Error saving project:', error);
      showToast(error.response?.data?.error || 'Failed to save project', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      const response = await api.delete(`/admin/projects/${id}`);
      if (response.data.success) {
        showToast('Project deleted successfully', 'success');
        fetchProjects();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      showToast('Failed to delete project', 'error');
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      location: project.location,
      budget: project.budget,
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      roadDistanceValue: project.roadDistanceValue || '',
      roadDistanceUnit: project.roadDistanceUnit || 'km'
    });
    setShowForm(true);
  };
  const getFilteredProjects = () => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.location.toLowerCase().includes(query)
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      budget: '',
      startDate: '',
      endDate: '',
      roadDistanceValue: '',
      roadDistanceUnit: 'km'
    });
    setShowForm(!showForm);
  };

  const filteredProjects = getFilteredProjects();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Projects</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          onClick={resetForm}
          className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          {showForm ? 'Cancel' : 'Create New Project'}
        </button>
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-5 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Residential Complex Phase 1"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Mumbai, Maharashtra"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Budget (₹)</label>
            <input
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="Total project budget"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Road Distance</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={formData.roadDistanceValue}
                onChange={(e) => setFormData({ ...formData, roadDistanceValue: e.target.value })}
                placeholder="Enter distance (e.g. 10)"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={formData.roadDistanceUnit}
                onChange={(e) => setFormData({ ...formData, roadDistanceUnit: e.target.value })}
                className="w-32 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="km">Kilometers (KM)</option>
                <option value="m">Meters (M)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
            {isSubmitting ? (editingProject ? 'Updating...' : 'Creating...') : (editingProject ? 'Update Project' : 'Create Project')}
          </button>
        </form>
      )}


      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map(p => (
          <div key={p._id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex-1">{p.name}</h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold ml-2">
                {p.status || 'Active'}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-3">📍 {p.location}</p>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Budget</p>
              <p className="text-xl font-bold text-gray-900">₹{p.budget?.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Start</p>
                <p className="text-gray-900 font-medium">{p.startDate ? new Date(p.startDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">End</p>
                <p className="text-gray-900 font-medium">{p.endDate ? new Date(p.endDate).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/admin/projects/${p._id}`}
                className="flex-1 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-center text-sm font-medium"
                title="View Details"
              >
                👁️
              </Link>
              <button
                onClick={() => handleEdit(p)}
                className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDelete(p._id)}
                className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {
        projects.length === 0 && !showForm && (
          <div className="mt-6 text-center p-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-400 text-lg">No projects yet. Create your first project!</p>
          </div>
        )
      }
    </div >
  );
};

export default Projects;
