import { createContext, useContext, useState, useEffect } from 'react';

const SiteManagerContext = createContext();

export const useSiteManager = () => {
    const context = useContext(SiteManagerContext);
    if (!context) {
        throw new Error('useSiteManager must be used within SiteManagerProvider');
    }
    return context;
};

export const SiteManagerProvider = ({ children }) => {
    const [selectedProject, setSelectedProject] = useState(() => {
        // Load from localStorage on init
        const saved = localStorage.getItem('siteManagerSelectedProject');
        return saved ? JSON.parse(saved) : null;
    });

    // Save to localStorage whenever selectedProject changes
    useEffect(() => {
        if (selectedProject) {
            localStorage.setItem('siteManagerSelectedProject', JSON.stringify(selectedProject));
        } else {
            localStorage.removeItem('siteManagerSelectedProject');
        }
    }, [selectedProject]);

    const clearSelectedProject = () => {
        setSelectedProject(null);
        localStorage.removeItem('siteManagerSelectedProject');
    };

    return (
        <SiteManagerContext.Provider value={{ selectedProject, setSelectedProject, clearSelectedProject }}>
            {children}
        </SiteManagerContext.Provider>
    );
};

export default SiteManagerContext;
