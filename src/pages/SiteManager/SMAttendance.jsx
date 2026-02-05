import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import Camera from '../../components/Camera';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';

const SMAttendance = () => {
  const { user } = useAuth();
  const { selectedProject, setSelectedProject } = useSiteManager();
  const baseUrl = user?.role === 'admin' ? '/admin' : '/site';
  const [attendance, setAttendance] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], projectId: '', photo: '', remarks: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Sync local form state with global context selectedProject
    if (selectedProject) {
      setFormData(prev => ({ ...prev, projectId: selectedProject._id }));
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchData();
  }, [selectedProject]); // Re-fetch when project changes

  const fetchData = async () => {
    try {
      // Build query string
      let attendanceUrl = `${baseUrl}/attendance`;
      if (selectedProject?._id) {
        attendanceUrl += `?projectId=${selectedProject._id}`;
      }

      const [attendanceRes, projectsRes] = await Promise.all([
        api.get(attendanceUrl),
        api.get(`${baseUrl}/projects`)
      ]);

      if (attendanceRes.data.success) {
        setAttendance(attendanceRes.data.data);
      }

      if (projectsRes.data.success) {
        // Filter projects assigned to this user
        const assignedProjects = projectsRes.data.data.filter(project => {
          if (user?.assignedSites && Array.isArray(user.assignedSites)) {
            return user.assignedSites.some(siteId => {
              const projectIdStr = typeof project._id === 'object' ? project._id.toString() : project._id;
              const siteIdStr = typeof siteId === 'object' ? siteId.toString() : siteId;
              return projectIdStr === siteIdStr;
            });
          }
          return false;
        });

        setProjects(assignedProjects);

        // Initial setup: If no project selected in context, select the first available
        if (!selectedProject && assignedProjects.length > 0) {
          setSelectedProject(assignedProjects[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handlePhotoCapture = (photoData) => {
    setFormData({ ...formData, photo: photoData });
    setShowCamera(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Photo is now optional, removed validation
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await api.post(`${baseUrl}/attendance`, formData);
      if (response.data.success) {
        showToast('Attendance marked successfully', 'success');

        // Set the selected project in context
        const selectedProj = projects.find(p => p._id === formData.projectId);
        if (selectedProj) {
          setSelectedProject(selectedProj);
          console.log('✅ Selected project set:', selectedProj.name);
        }

        setFormData({ date: new Date().toISOString().split('T')[0], projectId: projects[0]?._id || '', photo: '', remarks: '' });
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to mark attendance', 'error');
      console.error('Error marking attendance:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Mark Attendance</h1>

      <form onSubmit={handleSubmit} className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
            <select
              value={selectedProject?._id || ''}
              onChange={(e) => {
                const proj = projects.find(p => p._id === e.target.value);
                if (proj) setSelectedProject(proj);
              }}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Photo (optional)</label>
          <button type="button" onClick={() => setShowCamera(true)} className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
            📸 Capture Photo
          </button>
          {formData.photo && <span className="ml-4 text-green-600 font-semibold">✓ Photo captured</span>}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (optional)</label>
          <input type="text" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} placeholder="Any remarks" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-6 py-3 text-white rounded-lg transition-colors font-semibold flex justify-center items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
        >
          {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
          {isSubmitting ? 'Marking Attendance...' : 'Mark Attendance'}
        </button>
      </form>

      {showCamera && <Camera onCapture={handlePhotoCapture} onClose={() => setShowCamera(false)} />}

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">My Attendance History</h2>

        {/* Mobile View */}
        <div className="block md:hidden space-y-3">
          {attendance.map(a => (
            <div key={a._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-bold text-gray-900 mb-2">{a.date}</div>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Project:</span> {typeof a.projectId === 'object' ? a.projectId?.name : a.projectId}</div>
                <div><span className="font-medium">Time:</span> {new Date(a.time).toLocaleTimeString()}</div>
                <div><span className="font-medium">Remarks:</span> {a.remarks || '-'}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Project</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map(a => (
                <tr key={a._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{a.date}</td>
                  <td className="px-4 py-3">{typeof a.projectId === 'object' ? a.projectId?.name : a.projectId}</td>
                  <td className="px-4 py-3">{new Date(a.time).toLocaleTimeString()}</td>
                  <td className="px-4 py-3">{a.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SMAttendance;
