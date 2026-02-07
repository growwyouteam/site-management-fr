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
    <nav className="bg-white px-3 sm:px-4 md:px-8 py-3 md:py-5 shadow-sm flex justify-between items-center border-b border-border sticky top-0 z-50 overflow-hidden w-full">
      <div className="ml-12 md:ml-0 flex-shrink-0">
        <h1 className="m-0 text-lg sm:text-xl md:text-2xl text-dark-darker font-semibold truncate max-w-[200px] sm:max-w-none">
          {user?.role === 'admin' ? 'Dashboard' : 'Site Dashboard'}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        <div className="hidden sm:block px-2 md:px-4 py-1.5 md:py-2 bg-bg-secondary rounded-lg text-dark-darker text-xs md:text-sm font-medium border border-border max-w-[120px] md:max-w-[150px] truncate">
          {user?.name}
        </div>
        <button
          onClick={handleLogout}
          className="px-3 sm:px-4 md:px-6 py-1.5 md:py-2 bg-dark text-white rounded-lg cursor-pointer font-medium text-xs sm:text-sm transition-all duration-200 hover:bg-dark-darker whitespace-nowrap"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
