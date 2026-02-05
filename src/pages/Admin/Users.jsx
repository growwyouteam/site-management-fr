import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', salary: '', dateOfJoining: new Date().toISOString().split('T')[0] });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      showToast('Failed to fetch users', 'error');
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (editingUser) {
        const response = await api.put(`/admin/users/${editingUser._id}`, formData);
        if (response.data.success) {
          showToast('User updated successfully', 'success');
          setEditingUser(null);
        }
      } else {
        const response = await api.post('/admin/users', {
          ...formData,
          role: 'sitemanager'
        });
        if (response.data.success) {
          showToast('Site manager created successfully', 'success');
        }
      }
      setShowForm(false);
      setShowPassword(false);
      setFormData({ name: '', email: '', password: '', phone: '', salary: '', dateOfJoining: new Date().toISOString().split('T')[0] });
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to save user', 'error');
      console.error('Error saving user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone || '',
      salary: user.salary || '',
      dateOfJoining: user.dateOfJoining || new Date().toISOString().split('T')[0]
    });
    setShowForm(true);
    setShowPassword(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await api.delete(`/admin/users/${id}`);
      if (response.data.success) {
        showToast('User deleted successfully', 'success');
        fetchUsers();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to delete user', 'error');
      console.error('Error deleting user:', error);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const response = await api.put(`/admin/users/${user._id}`, { active: !user.active });
      if (response.data.success) {
        showToast(`User ${!user.active ? 'activated' : 'deactivated'} successfully`, 'success');
        fetchUsers();
      }
    } catch (error) {
      showToast('Failed to update status', 'error');
      console.error('Error updating status:', error);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setShowPassword(false);
    setFormData({ name: '', email: '', password: '', phone: '', salary: '', dateOfJoining: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">User Management</h1>
      <button
        onClick={() => showForm ? handleCancelForm() : setShowForm(true)}
        className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
      >
        {showForm ? 'Cancel' : 'Add Site Manager'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-5 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min 6 chars)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength="6"
                  className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Salary</label>
              <input
                type="number"
                placeholder="Monthly Salary"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Joining</label>
              <input
                type="date"
                value={formData.dateOfJoining}
                onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`mt-5 px-6 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
            {isSubmitting ? 'Processing...' : (editingUser ? 'Update User' : 'Create User')}
          </button>
        </form>
      )}

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Site Managers</h2>

        {/* Mobile View */}
        <div className="block md:hidden space-y-3">
          {users.map(u => (
            <div key={u._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-bold text-gray-900 mb-2">{u.name}</div>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">User ID:</span> <span className="font-mono text-xs">{u.userId || 'N/A'}</span></div>
                <div><span className="font-medium">Email:</span> {u.email}</div>
                <div><span className="font-medium">Phone:</span> {u.phone || 'N/A'}</div>
                <div><span className="font-medium">DOJ:</span> {u.dateOfJoining ? new Date(u.dateOfJoining).toLocaleDateString() : 'N/A'}</div>
                <div><span className="font-medium">Salary:</span> <span className="text-green-600 font-bold">₹{u.salary?.toLocaleString()}</span></div>
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${u.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setViewingUser(u)}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600"
                >
                  👁️ View
                </button>
                <button
                  onClick={() => handleEdit(u)}
                  className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded text-sm font-medium hover:bg-yellow-600"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(u._id)}
                  className="flex-1 px-3 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">DOJ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Salary</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{u.userId || 'N/A'}</td>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.phone || 'N/A'}</td>
                  <td className="px-4 py-3">{u.dateOfJoining ? new Date(u.dateOfJoining).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-4 py-3 text-green-600 font-bold">₹{u.salary?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${u.active ? 'bg-green-500' : 'bg-gray-200'}`}
                    >
                      <span className="sr-only">Enable</span>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.active ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                    <span className="ml-2 text-sm text-gray-500">
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingUser(u)}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => handleEdit(u)}
                        className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                        title="Edit User"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(u._id)}
                        className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        title="Delete User"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View User Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">User Details</h3>
            <div className="space-y-3">
              <div>
                <span className="font-semibold">User ID:</span> <span className="font-mono text-sm">{viewingUser.userId}</span>
              </div>
              <div>
                <span className="font-semibold">Name:</span> {viewingUser.name}
              </div>
              <div>
                <span className="font-semibold">Email:</span> {viewingUser.email}
              </div>
              <div>
                <span className="font-semibold">Phone:</span> {viewingUser.phone || 'N/A'}
              </div>
              <div>
                <span className="font-semibold">Password:</span> {viewingUser.password}
              </div>
              <div>
                <span className="font-semibold">Monthly Salary:</span> <span className="text-green-600 font-bold">₹{viewingUser.salary?.toLocaleString()}</span>
              </div>
              <div>
                <span className="font-semibold">Date of Joining:</span> {viewingUser.dateOfJoining ? new Date(viewingUser.dateOfJoining).toLocaleDateString() : 'N/A'}
              </div>
              <div>
                <span className="font-semibold">Status:</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${viewingUser.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {viewingUser.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setViewingUser(null)}
              className="mt-6 w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
