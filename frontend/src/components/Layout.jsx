import React, { useContext, useState, useEffect } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Bell, LogOut, Home, Package, Users, TrendingUp, Menu, X, Lightbulb, CreditCard } from 'lucide-react';
import { Badge } from './ui/badge';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data.slice(0, 10));
      setUnreadCount(response.data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/${notificationId}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const menuItems = [
    { name: 'داشبورد', path: '/', icon: Home, show: true },
    { name: 'درخواست کالا', path: '/requests', icon: Package, show: true },
    { name: 'پیشنهاد پروژه', path: '/proposals', icon: Lightbulb, show: true },
    { name: 'درخواست پرداخت', path: '/payments', icon: CreditCard, show: true },
    { name: 'پنل مدیریت', path: '/admin', icon: Users, show: user?.roles?.includes('admin') },
    { name: 'گزارش‌گیری', path: '/reports', icon: TrendingUp, show: true }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 rtl" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-amber-200 shadow-sm sticky top-0 z-50" data-testid="header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <img
                src="https://customer-assets.emergentagent.com/job_83c5a98e-8567-4cd4-a74d-6f37b95fe680/artifacts/ave6xfti_logo.png"
                alt="لوگو"
                className="h-10 w-auto cursor-pointer"
                onClick={() => navigate('/')}
                data-testid="logo"
              />
              <div className="hidden md:block">
                <h2 className="text-lg font-bold text-gray-800">پرتال سازمانی</h2>
                <p className="text-xs text-gray-600">گروه صنعتی پردیس پاژ خراسان</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center gap-2">
              {menuItems.filter(item => item.show).map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 ${
                    location.pathname === item.path
                      ? 'bg-amber-100 text-amber-800 font-medium'
                      : 'text-gray-700 hover:bg-amber-50 hover:text-amber-800'
                  }`}
                  data-testid={`menu-${item.path}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Button>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative hover:bg-amber-50"
                  data-testid="notifications-button"
                >
                  <Bell className="w-5 h-5 text-gray-700" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 left-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50" data-testid="notifications-dropdown">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-bold text-gray-800">اعلان‌ها</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">اعلانی وجود ندارد</div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-amber-50 ${
                              !notif.is_read ? 'bg-amber-50/50' : ''
                            }`}
                            onClick={() => {
                              markAsRead(notif.id);
                              navigate(`/requests/${notif.request_id}`);
                              setShowNotifications(false);
                            }}
                            data-testid={`notification-item-${notif.id}`}
                          >
                            <p className="text-sm text-gray-800">{notif.message}</p>
                            <p className="text-xs text-gray-500 mt-1">شناسه: {notif.request_number}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-amber-50 rounded-lg">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800" data-testid="user-name">{user?.full_name}</p>
                  <p className="text-xs text-gray-600">{user?.username}</p>
                </div>
              </div>

              {/* Logout */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-red-600 hover:bg-red-50"
                data-testid="logout-button"
              >
                <LogOut className="w-5 h-5" />
              </Button>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden"
                data-testid="mobile-menu-toggle"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-amber-200 bg-white" data-testid="mobile-menu">
            <nav className="px-4 py-2 space-y-1">
              {menuItems.filter(item => item.show).map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full justify-start gap-2 ${
                    location.pathname === item.path
                      ? 'bg-amber-100 text-amber-800 font-medium'
                      : 'text-gray-700 hover:bg-amber-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Button>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;