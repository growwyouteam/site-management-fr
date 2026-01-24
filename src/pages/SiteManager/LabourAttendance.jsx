import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';

const LabourAttendance = () => {
  const { user } = useAuth();
  const { selectedProject } = useSiteManager();
  const baseUrl = user?.role === 'admin' ? '/admin' : '/site';
  const [labours, setLabours] = useState([]);
  const [projects, setProjects] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [savingId, setSavingId] = useState(null); // Track which labour is being saved

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const fetchData = async () => {
    try {
      const labourQuery = selectedProject ? `?projectId=${selectedProject._id}` : '';

      const [laboursRes, projectsRes, attendanceRes] = await Promise.all([
        api.get(`${baseUrl}/labours${labourQuery}`),
        api.get(`${baseUrl}/projects`),
        api.get(`${baseUrl}/labour-attendance`) // We'll filter this client-side for now as endpoint update might be needed
      ]);

      let labs = [];
      let attendanceData = [];

      if (laboursRes.data.success) {
        labs = laboursRes.data.data;
      }

      if (projectsRes.data.success) {
        setProjects(projectsRes.data.data);
      }

      if (attendanceRes.data.success) {
        // Sort by date/time desc and filter by project
        let filteredAttendance = attendanceRes.data.data;

        if (selectedProject) {
          filteredAttendance = filteredAttendance.filter(a => {
            const attProjectId = typeof a.projectId === 'object' ? a.projectId._id : a.projectId;
            return attProjectId === selectedProject._id;
          });
        }

        const sorted = filteredAttendance.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
        attendanceData = sorted;
        setAttendance(sorted);
      }

      // Filter out labours who already have attendance marked today
      const today = new Date().toISOString().split('T')[0];
      const labourIdsWithAttendanceToday = attendanceData
        .filter(a => {
          const attDate = new Date(a.date).toISOString().split('T')[0];
          return attDate === today;
        })
        .map(a => a.labourId?._id || a.labourId);

      const filteredLabours = labs.filter(l => !labourIdsWithAttendanceToday.includes(l._id));
      setLabours(filteredLabours);

      const defaults = {};
      filteredLabours.forEach(l => { defaults[l._id] = 'present'; });
      setStatusMap(defaults);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSave = async (labour) => {
    if (savingId) return; // Prevent multiple clicks

    const status = statusMap[labour._id] || 'present';
    setSavingId(labour._id);

    try {
      const response = await api.post(`${baseUrl}/labour-attendance`, {
        labourId: labour._id,
        labourName: labour.name,
        projectId: labour.assignedSite?._id || projects[0]?._id || '',
        date: new Date().toISOString().split('T')[0],
        status,
        remarks: ''
      });

      if (response.data.success) {
        showToast(`${labour.name} marked ${status}`, 'success');

        // Remove labour from list immediately
        setLabours(prev => prev.filter(l => l._id !== labour._id));

        // Add new record to top of attendance list
        if (response.data.data) {
          setAttendance(prev => [response.data.data, ...prev]);
        }
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to mark attendance', 'error');
      console.error('Error marking attendance:', error);
    } finally {
      setSavingId(null);
    }
  };

  const handleEditLoad = (record) => {
    setStatusMap((prev) => ({ ...prev, [record.labourId]: record.status || 'present' }));
    showToast('Status loaded. Update dropdown and Save.', 'info');
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Labour Attendance</h1>
      <p className="text-gray-600 mb-4">Pick status (Present / Half / Absent) for each labour and hit Save.</p>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 border-b bg-gray-50 text-sm font-semibold text-gray-700">
          <span className="col-span-1 text-center">#</span>
          <span className="col-span-6">Name</span>
          <span className="col-span-3">Status</span>
          <span className="col-span-2 text-center">Action</span>
        </div>

        <div className="divide-y divide-gray-200">
          {labours.map((labour, idx) => (
            <div key={labour._id} className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-4 items-center">
              <div className="md:col-span-1 text-sm font-semibold text-gray-700 text-center md:text-left">{idx + 1}</div>
              <div className="md:col-span-6">
                <div className="text-base font-bold text-gray-900">{labour.name}</div>
                <div className="text-sm text-gray-500">{labour.designation || 'Labour'}</div>
              </div>
              <div className="md:col-span-3">
                <select
                  value={statusMap[labour._id] || 'present'}
                  onChange={(e) => setStatusMap(prev => ({ ...prev, [labour._id]: e.target.value }))}
                  disabled={savingId === labour._id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="present">Present</option>
                  <option value="half">Half</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div className="md:col-span-2 flex md:justify-center">
                <button
                  onClick={() => handleSave(labour)}
                  disabled={savingId === labour._id}
                  className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-semibold w-full md:w-auto flex justify-center items-center gap-2 ${savingId === labour._id ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
                >
                  {savingId === labour._id ? (
                    <>
                      <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                      Saving
                    </>
                  ) : 'Save'}
                </button>
              </div>
            </div>
          ))}

          {labours.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-500">No labour found.</div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Recent Attendance</h2>
        {attendance.length === 0 ? (
          <p className="text-gray-500 text-sm">No attendance records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Labour</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Project</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Time</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => (
                  <tr key={a._id} className="border-b border-gray-100 animate-fadeIn">
                    <td className="px-4 py-2">{a.date}</td>
                    <td className="px-4 py-2 font-medium">{a.labourName}</td>
                    <td className="px-4 py-2">{typeof a.projectId === 'object' ? a.projectId?.name : a.projectId}</td>
                    <td className="px-4 py-2 capitalize">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${a.status === 'absent' ? 'bg-red-100 text-red-700' : a.status === 'half' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {a.status || 'present'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{new Date(a.time || a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleEditLoad(a)}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-semibold hover:bg-blue-600"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabourAttendance;
