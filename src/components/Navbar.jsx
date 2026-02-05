/**
 * Navbar Component
 * Navigation bar with user info and logout
 */

import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <nav className="bg-white px-4 md:px-8 py-4 md:py-5 shadow-sm flex justify-between items-center border-b border-border sticky top-0 z-50">
      <div className="ml-12 md:ml-0">
        <h1 className="m-0 text-xl md:text-2xl text-dark-darker font-semibold">
          {user?.role === 'admin' ? 'Dashboard' : 'Site Dashboard'}
        </h1>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden sm:block px-3 md:px-4 py-2 bg-bg-secondary rounded-lg text-dark-darker text-xs md:text-sm font-medium border border-border">
          {user?.name}
        </div>
        <button
          onClick={handleLogout}
          className="px-4 md:px-6 py-2 bg-dark text-white rounded-lg cursor-pointer font-medium text-sm transition-all duration-200 hover:bg-dark-darker"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
