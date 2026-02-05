import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';

const SMNotifications = () => {
  const { user } = useAuth();
  const baseUrl = user?.role === 'admin' ? '/admin' : '/site';
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get(`${baseUrl}/notifications`);
      if (response.data.success) {
        setNotifications(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      const response = await api.put(`${baseUrl}/notifications/${id}/read`);
      if (response.data.success) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Notifications</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {notifications.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {notifications.map(n => (
              <div
                key={n._id}
                className={`p-4 md:p-5 cursor-pointer hover:bg-gray-50 transition-colors ${n.read ? 'bg-white' : 'bg-blue-50'
                  }`}
                onClick={() => !n.read && markAsRead(n._id)}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${n.type === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                      {n.type}
                    </span>
                    {!n.read && (
                      <span className="inline-block px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold">
                        New
                      </span>
                    )}
                  </div>
                  <span className="text-gray-600 text-sm">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-base text-gray-900 mb-2">{n.message}</p>
                <p className="text-sm text-gray-600">From: {n.senderName}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-12">No notifications</p>
        )}
      </div>
    </div>
  );
};

export default SMNotifications;
