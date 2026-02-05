import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ recipientId: '', title: '', message: '', type: 'general' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [notifRes, usersRes] = await Promise.all([
        api.get('/admin/notifications'),
        api.get('/admin/users')
      ]);

      if (notifRes.data.success) {
        setNotifications(notifRes.data.data);
      }

      if (usersRes.data.success) {
        setUsers(usersRes.data.data);
        if (!formData.recipientId && usersRes.data.data.length > 0) {
          setFormData(prev => ({ ...prev, recipientId: usersRes.data.data[0]._id }));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/admin/notifications', formData);
      if (response.data.success) {
        showToast('Notification sent successfully', 'success');
        setShowForm(false);
        setFormData({ recipientId: users[0]?._id || '', title: '', message: '', type: 'general' });
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to send notification', 'error');
      console.error('Error sending notification:', error);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Notifications</h1>
      <button
        onClick={() => setShowForm(!showForm)}
        className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
      >
        {showForm ? 'Cancel' : 'Send Notification'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-5 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Recipient</label>
            <select
              value={formData.recipientId}
              onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Broadcast to All Site Managers</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              placeholder="Notification Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              placeholder="Type your message here..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="general">General</option>
              <option value="urgent">Urgent</option>
              <option value="info">Info</option>
            </select>
          </div>
          <button type="submit" className="px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
            Send Notification
          </button>
        </form>
      )}

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Notification History</h2>
        <div className="space-y-3">
          {notifications.map(n => (
            <div key={n._id} className="p-4 border-b border-gray-200 last:border-b-0 flex flex-col md:flex-row md:justify-between md:items-start gap-3">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">{n.title}</p>
                <p className="text-gray-800 mb-2">{n.message}</p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">To:</span> {n.recipient ? (users.find(u => u._id === n.recipient) || users.find(u => u._id === n.recipient._id))?.name || 'Me' : 'All Site Managers'}
                  {' | '}
                  <span className="font-medium">From:</span> {n.relatedModel === 'User' ? (n.relatedId?.name || 'Admin') : 'System'}
                  {' | '}
                  <span className="font-medium">Type:</span> <span className="capitalize">{n.type}</span>
                  {' | '}
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${n.read ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {n.read ? 'Read' : 'Unread'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
