import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePresence } from '../context/PresenceContext';
import { 
  LayoutDashboard, 
  Users as UsersIcon, 
  UserCircle, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon,
  ShieldCheck,
  ChevronRight,
  Bell,
  AlertTriangle,
  FileText,
  Calendar as CalendarIcon
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import NotificationModal from './NotificationModal';
import { SelectCare } from '../types';

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { activeUsers } = usePresence();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [expiringAgreements, setExpiringAgreements] = useState<(SelectCare & { customerName: string })[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<(any & { customerName: string })[]>([]);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/login' && location.pathname !== '/register') {
      navigate('/login');
    }
  }, [user, loading, navigate, location.pathname]);

  useEffect(() => {
    const fetchExpiring = async () => {
      try {
        const url = user ? `/api/stats?sellerId=${user.id}` : '/api/stats';
        const res = await fetch(url);
        const data = await res.json();
        setExpiringAgreements(data.expiringSelectCare || []);
        setExpiringContracts(data.expiringContracts || []);
      } catch (error) {
        console.error('Failed to fetch expiring agreements:', error);
      }
    };
    if (user) {
      fetchExpiring();
      // Refresh every 5 minutes
      const interval = setInterval(fetchExpiring, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (user?.isAdmin) {
      const fetchPendingCount = async () => {
        try {
          const res = await fetch('/api/users/pending/count');
          const data = await res.json();
          setPendingUsersCount(data.count || 0);
        } catch (error) {
          console.error('Failed to fetch pending users count:', error);
        }
      };
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 60 * 1000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const navigation = [
    { name: 'Översikt', href: '/', icon: LayoutDashboard },
    { name: 'Kunder', href: '/kunder', icon: UsersIcon },
    { name: 'Kalender', href: '/kalender', icon: CalendarIcon },
    { name: 'Support', href: '/support', icon: ShieldCheck },
    ...(user?.isAdmin ? [{ 
      name: 'Användare', 
      href: '/anvandare', 
      icon: UsersIcon,
      badge: pendingUsersCount > 0 ? pendingUsersCount : undefined
    }] : []),
    { name: 'Nyheter', href: '/nyheter', icon: Bell },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <img 
                src="https://usercontent.one/wp/rejban.se/wp-content/uploads/2025/04/Select-Telecom-Logotyp.png" 
                alt="Select Telecom" 
                className="h-10 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </Link>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              
              return (
                <div key={item.name} className="space-y-1">
                  <Link
                    to={item.href}
                    onClick={() => {
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-blue-700 text-white shadow-lg shadow-blue-700/20" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="flex-1">{item.name}</span>
                    {'badge' in item && item.badge && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="ml-auto w-4 h-4" />}
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              {theme === 'light' ? 'Mörkt läge' : 'Ljust läge'}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logga ut
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <button 
            className="lg:hidden p-2 text-slate-600 dark:text-slate-400"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-6 ml-auto">
            {/* Notification Badge/Button */}
            {(expiringAgreements.length > 0 || expiringContracts.length > 0) && (
              <button 
                onClick={() => setIsNotificationModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-full text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all group shadow-sm animate-pulse hover:animate-none"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-bold whitespace-nowrap">
                  {expiringAgreements.length + expiringContracts.length} avtal löper ut
                </span>
              </button>
            )}

            {/* Presence Indicator */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2 overflow-hidden">
                {activeUsers.slice(0, 5).map((u) => (
                  <div 
                    key={u.id} 
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 overflow-hidden"
                    title={`${u.firstName} ${u.lastName}`}
                  >
                    {u.profilePic ? (
                      <img 
                        src={u.profilePic} 
                        alt={u.firstName} 
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                    )}
                  </div>
                ))}
                {activeUsers.length > 5 && (
                  <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                    +{activeUsers.length - 5}
                  </div>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-1.5 ml-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {activeUsers.length} {activeUsers.length === 1 ? 'inloggad' : 'inloggade'}
                </span>
              </div>
            </div>

            <Link to="/profil" className="flex items-center gap-3 group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user?.role || (user?.isAdmin ? 'Administratör' : 'Användare')}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-slate-100 dark:border-slate-800 overflow-hidden group-hover:border-blue-600 transition-colors">
                {user?.profilePic ? (
                  <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-slate-400" />
                  </div>
                )}
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        <NotificationModal 
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          items={[...expiringAgreements, ...expiringContracts]}
        />
      </div>
    </div>
  );
}
