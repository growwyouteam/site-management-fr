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

  // History Details State
  const [selectedLabour, setSelectedLabour] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchData();
    }
  }, [selectedProject]);

  const fetchData = async () => {
    try {
      const [laboursRes, projectsRes] = await Promise.all([
        api.get(`${baseUrl}/labours`),
        api.get(`${baseUrl}/projects`)
      ]);

      if (laboursRes.data.success) {
        let filteredLabours = laboursRes.data.data;
        if (selectedProject) {
          filteredLabours = laboursRes.data.data.filter(l => {
            const labourSiteId = typeof l.assignedSite === 'object' ? l.assignedSite._id : l.assignedSite;
            return labourSiteId === selectedProject._id;
          });
        }
        setLabours(filteredLabours);
      }

      if (projectsRes.data.success) {
        let filteredProjects = projectsRes.data.data;
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
    }
  };

  const fetchLabourHistory = async (id) => {
    setLoadingHistory(true);
    try {
      const response = await api.get(`/site/labours/${id}/details`);
      if (response.data.success) {
        setHistoryData(response.data.data);
        setShowHistoryModal(true);
      }
    } catch (error) {
      showToast('Failed to load history', 'error');
    } finally {
      setLoadingHistory(false);
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
            {/* Form Inputs (Unchanged) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Labour Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Daily Wage (₹)</label>
              <input type="number" value={formData.dailyWage} onChange={(e) => setFormData({ ...formData, dailyWage: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
              <input type="text" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Site</label>
              <select value={formData.assignedSite} onChange={(e) => setFormData({ ...formData, assignedSite: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className={`mt-5 px-6 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}>
            {isSubmitting ? 'Processing...' : 'Enroll Labour'}
          </button>
        </form>
      )}

      {/* Labour List */}
      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Labour List</h2>

        {/* Mobile View */}
        <div className="block md:hidden space-y-3">
          {labours.map(l => (
            <div key={l._id} onClick={() => fetchLabourHistory(l._id)} className="p-4 bg-gray-50 rounded-lg border border-gray-200 active:bg-blue-50 cursor-pointer">
              <div className="font-bold text-gray-900 mb-2 flex justify-between">
                {l.name}
                <span className="text-blue-600 text-xs bg-blue-100 px-2 py-1 rounded">View History</span>
              </div>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Phone:</span> {l.phone}</div>
                <div><span className="font-medium">Daily Wage:</span> <span className="text-green-600 font-bold">₹{l.dailyWage}</span></div>
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Pending Payout</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {labours.map(l => (
                <tr key={l._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{l.name}</td>
                  <td className="px-4 py-3">{l.phone}</td>
                  <td className="px-4 py-3 text-green-600 font-bold">₹{l.dailyWage}</td>
                  <td className="px-4 py-3">{l.designation}</td>
                  <td className="px-4 py-3 text-red-600 font-bold">₹{l.pendingPayout || 0}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => fetchLabourHistory(l._id)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                      View History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && historyData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">{historyData.labour.name} - History</h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-blue-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">₹{historyData.totalPaid}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Advances</p>
                  <p className="text-2xl font-bold text-orange-600">₹{historyData.totalAdvances || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Deductions</p>
                  <p className="text-2xl font-bold text-purple-600">₹{historyData.totalDeductions || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Pending</p>
                  <p className="text-2xl font-bold text-red-600">₹{historyData.labour.pendingPayout}</p>
                </div>
              </div>

              {/* Wage Payments Section */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-700 mb-3">💰 Wage Payments</h3>
                {historyData.payments && historyData.payments.length > 0 ? (
                  <div className="overflow-x-auto border rounded-lg max-h-60 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Date</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Amount</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Deduction</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Final</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Mode</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Paid By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {historyData.payments.map((p) => (
                          <tr key={p._id}>
                            <td className="px-4 py-2">{new Date(p.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-2 font-medium text-green-600">₹{p.amount}</td>
                            <td className="px-4 py-2 text-purple-600">{p.deduction > 0 ? `-₹${p.deduction}` : '-'}</td>
                            <td className="px-4 py-2 font-bold text-blue-600">₹{p.finalAmount}</td>
                            <td className="px-4 py-2 capitalize text-xs">{p.paymentMode}</td>
                            <td className="px-4 py-2">{p.userId?.name || 'Unknown'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No wage payments found.</p>
                )}
              </div>

              {/* Advances Section */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 mb-3">🔶 Advance Payments</h3>
                {historyData.advances && historyData.advances.length > 0 ? (
                  <div className="overflow-x-auto border rounded-lg max-h-60 overflow-y-auto bg-orange-50">
                    <table className="min-w-full text-sm">
                      <thead className="bg-orange-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Date</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Advance Amount</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Mode</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Paid By</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-200">
                        {historyData.advances.map((p) => (
                          <tr key={p._id} className="bg-white">
                            <td className="px-4 py-2">{new Date(p.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-2 font-bold text-orange-600">₹{p.advance}</td>
                            <td className="px-4 py-2 capitalize text-xs">{p.paymentMode}</td>
                            <td className="px-4 py-2">{p.userId?.name || 'Unknown'}</td>
                            <td className="px-4 py-2 text-xs text-gray-600">{p.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No advances given.</p>
                )}
              </div>

              <div>
                <h3 className="font-bold text-gray-700 mb-3">Recent Attendance</h3>
                {historyData.attendance.length > 0 ? (
                  <div className="overflow-x-auto border rounded-lg max-h-60 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Date</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Project</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {historyData.attendance.map((a) => (
                          <tr key={a._id}>
                            <td className="px-4 py-2">{new Date(a.date).toLocaleDateString()}</td>
                            <td className="px-4 py-2">{a.projectId?.name || 'Unknown'}</td>
                            <td className="px-4 py-2 capitalize">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${a.status === 'present' ? 'bg-green-100 text-green-800' :
                                a.status === 'half' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No attendance records found.</p>
                )}
              </div>

            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setShowHistoryModal(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Labour;
