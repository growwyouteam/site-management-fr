import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';

const Profile = () => {
  const { user } = useAuth();
  const baseUrl = user?.role === 'admin' ? '/admin' : '/site';
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get(`${baseUrl}/profile`);
      if (response.data.success) {
        setProfile(response.data.data);
      } else {
        setProfile(null);
      }
    } catch (error) {
      showToast('Failed to load profile', 'error');
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-gray-500">Profile not found</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-8">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-blue-500 flex items-center justify-center text-3xl md:text-4xl text-white font-bold flex-shrink-0">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{profile.name}</h2>
            <p className="text-gray-600">Site Manager</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Email</label>
            <p className="text-base text-gray-900">{profile.email}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Phone</label>
            <p className="text-base text-gray-900">{profile.phone || 'Not provided'}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Monthly Salary</label>
            <p className="text-base text-gray-900 font-bold text-green-600">
              ₹{profile.salary?.toLocaleString() || 0}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Status</label>
            <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-semibold ${profile.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
              {profile.active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-600 mb-2">Assigned Sites</label>
            <div className="flex flex-wrap gap-2">
              {profile.assignedSites && profile.assignedSites.length > 0 ? (
                profile.assignedSites.map((site, index) => (
                  <span key={index} className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                    {site}
                  </span>
                ))
              ) : (
                <p className="text-gray-400">No sites assigned</p>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-600 mb-2">Member Since</label>
            <p className="text-base text-gray-900">
              {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
