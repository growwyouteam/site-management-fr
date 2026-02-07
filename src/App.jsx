/**
 * Main App Component
 * Handles routing and layout
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SiteManagerProvider } from './context/SiteManagerContext';
import { ToastManager } from './components/Toast';
import { useEffect, Suspense, lazy } from 'react';
import { onNotification } from './services/socket';
import { showToast } from './components/Toast';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
const Login = lazy(() => import('./pages/Login'));

// Admin Pages
const Dashboard = lazy(() => import('./pages/Admin/Dashboard'));
const Attendance = lazy(() => import('./pages/Admin/Attendance'));
const Machines = lazy(() => import('./pages/Admin/Machines'));
const MachineCategory = lazy(() => import('./pages/Admin/MachineCategory'));
const Stock = lazy(() => import('./pages/Admin/Stock'));
const StockDetails = lazy(() => import('./pages/Admin/StockDetails'));
const Projects = lazy(() => import('./pages/Admin/Projects'));
const ProjectDetail = lazy(() => import('./pages/Admin/ProjectDetail'));
const Vendors = lazy(() => import('./pages/Admin/Vendors'));
const Contractors = lazy(() => import('./pages/Admin/Contractors'));
const Creditors = lazy(() => import('./pages/Admin/Creditors'));
const Expenses = lazy(() => import('./pages/Admin/Expenses'));
const Transfer = lazy(() => import('./pages/Admin/Transfer'));
const Accounts = lazy(() => import('./pages/Admin/Accounts'));
const Users = lazy(() => import('./pages/Admin/Users'));
const Reports = lazy(() => import('./pages/Admin/Reports'));
const Payments = lazy(() => import('./pages/Admin/Payments'));
const BankDetails = lazy(() => import('./pages/Admin/BankDetails'));
const BankDetailData = lazy(() => import('./pages/Admin/BankDetailData'));
const Notifications = lazy(() => import('./pages/Admin/Notifications'));

// Site Manager Pages
const SMDashboard = lazy(() => import('./pages/SiteManager/SMDashboard'));
const SMProjectDetail = lazy(() => import('./pages/SiteManager/SMProjectDetail'));
const SMAttendance = lazy(() => import('./pages/SiteManager/SMAttendance'));
const Labour = lazy(() => import('./pages/SiteManager/Labour'));
const LabourAttendance = lazy(() => import('./pages/SiteManager/LabourAttendance'));
const StockIn = lazy(() => import('./pages/SiteManager/StockIn'));
const SiteStock = lazy(() => import('./pages/SiteManager/Stock'));
const SMTransfer = lazy(() => import('./pages/SiteManager/SMTransfer'));
const DailyReport = lazy(() => import('./pages/SiteManager/DailyReport'));
const Gallery = lazy(() => import('./pages/SiteManager/Gallery'));
const SMExpenses = lazy(() => import('./pages/SiteManager/SMExpenses'));
const Payment = lazy(() => import('./pages/SiteManager/Payment'));
const SMMachines = lazy(() => import('./pages/SiteManager/SMMachines'));
const SMContractors = lazy(() => import('./pages/SiteManager/SMContractors'));
const SMNotifications = lazy(() => import('./pages/SiteManager/SMNotifications'));
const Profile = lazy(() => import('./pages/SiteManager/Profile'));
const WalletHistory = lazy(() => import('./pages/SiteManager/WalletHistory'));

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Layout with Sidebar and Navbar
const Layout = ({ children }) => {
  const { user } = useAuth();

  // Setup notification listener
  useEffect(() => {
    if (user) {
      // Play notification sound
      const playNotificationSound = () => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };

      onNotification((notification) => {
        showToast(notification.message, 'info', 5000);
        playNotificationSound();
      });
      onNotification((notification) => {
        showToast(notification.message, 'info', 5000);
        playNotificationSound();
      });
    }

    // Global listener to prevent scroll-to-change on number inputs
    const handleWheel = (e) => {
      if (document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [user]);

  return (
    <div className="flex min-h-screen bg-bg-main overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-60 ml-0 transition-all duration-300 overflow-x-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

// Loading Component
const Loading = () => (
  <div className="flex items-center justify-center h-full w-full min-h-[50vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Main App Routes
const AppRoutes = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <Suspense fallback={<Loading />}>
        <Login />
      </Suspense>
    );
  }

  const LayoutWrapper = user.role === 'sitemanager' ? (
    <SiteManagerProvider>
      <Layout>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Navigate to="/site" replace />} />
            <Route path="/site" element={<SMDashboard />} />
            <Route path="/site/projects/:id" element={<SMProjectDetail />} />
            <Route path="/site/attendance" element={<SMAttendance />} />
            <Route path="/site/labour" element={<Labour />} />
            <Route path="/site/labour-attendance" element={<LabourAttendance />} />
            <Route path="/site/stock" element={<SiteStock />} />
            <Route path="/site/stock-in" element={<StockIn />} />
            <Route path="/site/transfer" element={<SMTransfer />} />
            <Route path="/site/daily-report" element={<DailyReport />} />
            <Route path="/site/gallery" element={<Gallery />} />
            <Route path="/site/expenses" element={<SMExpenses />} />
            <Route path="/site/payment" element={<Payment />} />
            <Route path="/site/machines" element={<SMMachines />} />
            <Route path="/site/contractors" element={<SMContractors />} />
            <Route path="/site/notifications" element={<SMNotifications />} />
            <Route path="/site/profile" element={<Profile />} />
            <Route path="/site/wallet-history" element={<WalletHistory />} />
            <Route path="*" element={<Navigate to="/site" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </SiteManagerProvider>
  ) : (
    <Layout>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Admin Routes */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/attendance" element={<Attendance />} />
          <Route path="/admin/machines" element={<Machines />} />
          <Route path="/admin/machines/:category" element={<MachineCategory />} />
          <Route path="/admin/stock-details" element={<StockDetails />} />
          <Route path="/admin/stock" element={<Stock />} />
          <Route path="/admin/projects" element={<Projects />} />
          <Route path="/admin/projects/:id" element={<ProjectDetail />} />
          <Route path="/admin/vendors" element={<Vendors />} />
          <Route path="/admin/contractors" element={<Contractors />} />
          <Route path="/admin/creditors" element={<Creditors />} />
          <Route path="/admin/expenses" element={<Expenses />} />
          <Route path="/admin/transfer" element={<Transfer />} />
          <Route path="/admin/accounts" element={<Accounts />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/payments" element={<Payments />} />
          <Route path="/admin/bank-details" element={<BankDetails />} />
          <Route path="/admin/bank-details/:id" element={<BankDetailData />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/notifications" element={<Notifications />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );

  return LayoutWrapper;
};

// Main App
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastManager />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
