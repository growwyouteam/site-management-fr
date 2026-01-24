import { useState, useEffect } from 'react';
import api from '../../services/api';
import { showToast } from '../../components/Toast';
import Camera from '../../components/Camera';
import { useAuth } from '../../context/AuthContext';
import { useSiteManager } from '../../context/SiteManagerContext';

const Gallery = () => {
  const { user } = useAuth();
  const { selectedProject: contextSelectedProject } = useSiteManager();
  const baseUrl = user?.role === 'admin' ? '/admin' : '/site';
  const [projects, setProjects] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [capturedImages, setCapturedImages] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextSelectedProject]);

  const fetchData = async () => {
    try {
      const [projectsRes, galleryRes] = await Promise.all([
        api.get(`${baseUrl}/projects`),
        api.get(`${baseUrl}/gallery`)
      ]);

      if (projectsRes.data.success) {
        let filteredProjects = projectsRes.data.data;
        if (contextSelectedProject) {
          filteredProjects = projectsRes.data.data.filter(p => p._id === contextSelectedProject._id);
        }
        setProjects(filteredProjects);
        if (filteredProjects.length > 0) {
          setSelectedProject(filteredProjects[0]._id);
        }
      }

      if (galleryRes.data.success) {
        let filteredGallery = galleryRes.data.data;
        if (contextSelectedProject) {
          filteredGallery = galleryRes.data.data.filter(g => {
            const galleryProjectId = typeof g.projectId === 'object' ? g.projectId._id : g.projectId;
            return galleryProjectId === contextSelectedProject._id;
          });
        }
        setGallery(filteredGallery);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handlePhotoCapture = (photoData) => {
    setCapturedImages([...capturedImages, photoData]);
    setShowCamera(false);
  };

  const handleUpload = async () => {
    if (capturedImages.length === 0) {
      showToast('Please capture at least one photo', 'error');
      return;
    }
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await api.post(`${baseUrl}/gallery`, {
        projectId: selectedProject,
        images: capturedImages
      });

      if (response.data.success) {
        showToast('Images uploaded successfully', 'success');
        setCapturedImages([]);
        fetchData();
      }
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to upload images', 'error');
      console.error('Error uploading images:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Gallery</h1>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Progress Photos</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Project</label>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full md:max-w-md px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowCamera(true)} className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
            📸 Capture Photo
          </button>
          {capturedImages.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
            >
              {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
              {isSubmitting ? 'Uploading...' : `Upload ${capturedImages.length} Photo(s)`}
            </button>
          )}
        </div>
        {capturedImages.length > 0 && (
          <p className="mt-3 text-green-600 font-semibold">✓ {capturedImages.length} photo(s) captured</p>
        )}
      </div>

      {showCamera && <Camera onCapture={handlePhotoCapture} onClose={() => setShowCamera(false)} />}

      <div className="mt-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Gallery Images</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {gallery.map(g => (
            <div key={g._id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-32 md:h-40 bg-gray-100 flex items-center justify-center">
                <span className="text-4xl md:text-5xl">📷</span>
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-600 truncate">{typeof g.projectId === 'object' ? g.projectId?.name : g.projectId}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(g.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
