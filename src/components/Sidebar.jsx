import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const adminMenuItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/attendance', label: 'Attendance', icon: '📸' },
    { path: '/admin/machines', label: 'Machines', icon: '🚜' },
    { path: '/admin/stock-details', label: 'Stock Detail', icon: '📋' },
    { path: '/admin/stock', label: 'Stock', icon: '📦' },
    { path: '/admin/projects', label: 'Projects', icon: '🏗️' },
    { path: '/admin/vendors', label: 'Vendors', icon: '🏪' },
    { path: '/admin/contractors', label: 'Contractors', icon: '👷' },
    { path: '/admin/creditors', label: 'Creditors', icon: '🔖' },
    { path: '/admin/expenses', label: 'Expenses', icon: '💰' },
    { path: '/admin/payments', label: 'Payments', icon: '💵' },
    { path: '/admin/transfer', label: 'Transfer', icon: '🔄' },
    { path: '/admin/accounts', label: 'Accounts', icon: '💳' },
    { path: '/admin/users', label: 'Users', icon: '👥' },
    { path: '/admin/reports', label: 'Reports', icon: '📈' },
    { path: '/admin/bank-details', label: 'Bank Detail', icon: '🏦' },
    { path: '/admin/notifications', label: 'Notifications', icon: '🔔' }
  ];

  const siteManagerMenuItems = [
    { path: '/site', label: 'Dashboard', icon: '📊' },
    { path: '/site/attendance', label: 'My Attendance', icon: '📸' },
    { path: '/site/labour', label: 'Labour', icon: '👷' },
    { path: '/site/labour-attendance', label: 'Labour Attendance', icon: '✅' },
    { path: '/site/stock', label: 'Site Stock', icon: '📊' },
    { path: '/site/stock-in', label: 'Stock In', icon: '📦' },
    { path: '/site/transfer', label: 'Transfer', icon: '🔄' },
    { path: '/site/daily-report', label: 'Daily Report', icon: '📝' },
    { path: '/site/gallery', label: 'Gallery', icon: '📷' },
    { path: '/site/expenses', label: 'Expenses', icon: '💰' },
    { path: '/site/payment', label: 'Payment', icon: '💵' },
    { path: '/site/machines', label: 'Machines', icon: '🚜' },
    { path: '/site/notifications', label: 'Notifications', icon: '🔔' },
    { path: '/site/profile', label: 'Profile', icon: '👤' }
  ];

  const menuItems = user?.role === 'admin' ? adminMenuItems : siteManagerMenuItems;

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-[1001] bg-dark p-2 rounded-lg text-white"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-[999]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen bg-dark z-[1000]
        transition-all duration-300 ease-in-out overflow-y-auto scrollbar-custom
        md:w-60 md:translate-x-0
        ${isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-16'}
      `}>
        {/* Logo Section */}
        <div className=" pl-20 py-8 px-5 border-b border-border-light">
          <h2 className={`text-primary font-bold tracking-widest uppercase ${isOpen || window.innerWidth >= 768 ? 'text-lg' : 'text-xs text-center'
            }`}>
            {isOpen || window.innerWidth >= 768 ? (user?.role === 'admin' ? 'ADMIN' : 'MANAGER') : (user?.role === 'admin' ? 'AD' : 'MG')}
          </h2>
        </div>

        {/* Menu Items */}
        <nav className="py-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={`
                flex items-center gap-4 px-5 py-3 mx-4 my-1 rounded-lg
                transition-all duration-200 no-underline
                ${isActive(item.path)
                  ? 'bg-primary text-dark-darker font-medium'
                  : 'text-white hover:bg-primary hover:bg-opacity-15'
                }
                ${!isOpen && 'md:justify-center md:px-2'}
              `}
            >
              <span className="text-lg min-w-[24px] flex items-center justify-center flex-shrink-0">{item.icon}</span>
              <span className={`text-[15px] whitespace-nowrap flex-1 ${isOpen ? 'block' : 'hidden lg:block'}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* User Info at Bottom */}
        <div className="relatable bottom-0 left-0 right-0 p-4 border-t border-border-light bg-black bg-opacity-20">
          <div className={`flex items-center gap-3 ${!isOpen && 'md:justify-center'}`}>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-dark-darker font-semibold text-sm flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className={`flex-1 overflow-hidden ${isOpen ? 'block' : 'hidden lg:block'}`}>
              <p className="m-0 text-white text-[13px] font-medium truncate">
                {user?.name}
              </p>
              <p className="m-0 text-gray-400 text-[11px] truncate">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Install PWA Button */}
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className={`mt-4 w-full flex items-center justify-center gap-2 bg-primary text-dark-darker py-2 rounded-lg text-sm font-bold hover:bg-opacity-90 transition-colors ${!isOpen && 'md:hidden'}`}
            >
              <span>⬇️</span>
              <span className={`${isOpen ? 'block' : 'hidden lg:block'}`}>Install App</span>
            </button>
          )}
        </div>
      </div>
    </>

  );
};

export default Sidebar;
