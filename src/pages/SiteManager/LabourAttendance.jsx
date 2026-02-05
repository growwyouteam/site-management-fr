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


  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('present');

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
        api.get(`${baseUrl}/labour-attendance`)
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
    if (savingId) return;

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
        setLabours(prev => prev.filter(l => l._id !== labour._id));
        if (response.data.data) {
          setAttendance(prev => [response.data.data, ...prev]);
        }
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to mark attendance', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const startEdit = (record) => {
    setEditingId(record._id);
    setEditStatus(record.status || 'present');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (record) => {
    try {
      const response = await api.put(`${baseUrl}/labour-attendance/${record._id}`, {
        status: editStatus
      });

      if (response.data.success) {
        showToast('Status updated successfully', 'success');
        setEditingId(null);
        // Update local state
        setAttendance(prev => prev.map(a =>
          a._id === record._id ? { ...a, status: editStatus } : a
        ));
      }
    } catch (error) {
      showToast('Failed to update status', 'error');
      console.error(error);
    }
  };

  // Toggle form visibility logic if needed (Requirement 4), but LabourAttendance is split view.
  // The user requirement said: "labour attendness component me edit button is not working use working karo"
  // Requirement 4 said: "Form pre open na mile...". For LabourAttendance, the "Form" is the top list.
  // We can wrap the top list in a toggle.

  const [showMarkingList, setShowMarkingList] = useState(false);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Labour Attendance</h1>
        <button
          onClick={() => setShowMarkingList(!showMarkingList)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {showMarkingList ? 'Hide Marking List' : 'Mark New Attendance'}
        </button>
      </div>

      {showMarkingList && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 animate-fadeIn">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700">Mark Today's Attendance</h2>
            <p className="text-sm text-gray-500">Pick status (Present / Half / Absent) for each labour and hit Save.</p>
          </div>
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
                    {savingId === labour._id ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ))}

            {labours.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-500">All assigned labours have attendance marked for today.</div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Recent Attendance</h2>
        {attendance.length === 0 ? (
          <p className="text-gray-500 text-sm">No attendance records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <table className="hidden md:table w-full text-sm">
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
                  <tr key={a._id} className="border-b border-gray-100 animate-fadeIn hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(a.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium">{a.labourName}</td>
                    <td className="px-4 py-3">{typeof a.projectId === 'object' ? a.projectId?.name : a.projectId}</td>
                    <td className="px-4 py-3 capitalize">
                      {editingId === a._id ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="px-2 py-1 border rounded text-xs"
                        >
                          <option value="present">Present</option>
                          <option value="half">Half</option>
                          <option value="absent">Absent</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${a.status === 'absent' ? 'bg-red-100 text-red-700' : a.status === 'half' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {a.status || 'present'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(a.time || a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3">
                      {editingId === a._id ? (
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(a)} className="text-green-600 hover:text-green-800 font-bold text-xs">Save</button>
                          <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 text-xs">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(a)}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-semibold hover:bg-blue-600"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {attendance.map(a => (
                <div key={a._id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{a.labourName}</p>
                      <p className="text-xs text-gray-500">{typeof a.projectId === 'object' ? a.projectId?.name : a.projectId}</p>
                    </div>
                    {editingId === a._id ? (
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="px-2 py-1 border rounded text-xs"
                      >
                        <option value="present">Present</option>
                        <option value="half">Half</option>
                        <option value="absent">Absent</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${a.status === 'absent' ? 'bg-red-100 text-red-700' : a.status === 'half' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {a.status || 'present'}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600 mt-2">
                    <span>{new Date(a.date).toLocaleDateString()}</span>
                    <span>{new Date(a.time || a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="mt-3 text-right">
                    {editingId === a._id ? (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => saveEdit(a)} className="px-4 py-2 bg-green-500 text-white rounded text-sm font-semibold hover:bg-green-600">Save</button>
                        <button onClick={cancelEdit} className="px-4 py-2 bg-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-400">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(a)}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded text-sm font-semibold hover:bg-blue-600"
                      >
                        Edit Status
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabourAttendance;
