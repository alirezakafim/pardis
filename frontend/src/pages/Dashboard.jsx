import React, { useContext, useEffect, useState } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileText, Package, Users, FileCheck, Bell, TrendingUp, Lightbulb, CreditCard } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchNotifications();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/goods-requests`);
      const requests = response.data;
      setStats({
        total: requests.length,
        pending: requests.filter(r => !['completed', 'rejected'].includes(r.status)).length,
        completed: requests.filter(r => r.status === 'completed').length
      });
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const quickActions = [
    {
      title: 'درخواست جدید',
      description: 'ثبت درخواست کالای جدید',
      icon: FileText,
      action: () => navigate('/requests/new'),
      color: 'from-amber-500 to-orange-500',
      show: true,
      testId: 'new-request-card'
    },
    {
      title: 'درخواست‌های من',
      description: 'مشاهده و مدیریت درخواست‌ها',
      icon: Package,
      action: () => navigate('/requests'),
      color: 'from-blue-500 to-cyan-500',
      show: true,
      testId: 'my-requests-card'
    },
    {
      title: 'پنل مدیریت',
      description: 'مدیریت کاربران و نقش‌ها',
      icon: Users,
      action: () => navigate('/admin'),
      color: 'from-purple-500 to-pink-500',
      show: user?.roles?.includes('admin'),
      testId: 'admin-panel-card'
    },
    {
      title: 'گزارش‌گیری',
      description: 'مشاهده و دریافت گزارش‌ها',
      icon: TrendingUp,
      action: () => navigate('/reports'),
      color: 'from-green-500 to-emerald-500',
      show: true,
      testId: 'reports-card'
    },
    {
      title: 'پیشنهاد پروژه',
      description: 'ثبت و پیگیری پیشنهادات پروژه',
      icon: Lightbulb,
      action: () => navigate('/proposals'),
      color: 'from-yellow-500 to-orange-500',
      show: true,
      testId: 'proposals-card'
    },
    {
      title: 'درخواست پرداخت',
      description: 'ثبت و پیگیری درخواست‌های پرداخت',
      icon: CreditCard,
      action: () => navigate('/payments'),
      color: 'from-teal-500 to-cyan-500',
      show: true,
      testId: 'payments-card'
    }
  ];

  const statusLabels = {
    'draft': 'پیش‌نویس',
    'pending_procurement': 'در انتظار واحد تامین',
    'pending_management': 'در انتظار مدیریت',
    'pending_purchase': 'در انتظار خرید',
    'pending_receipt': 'در انتظار رسید',
    'pending_invoice': 'در انتظار فاکتور',
    'pending_financial': 'در انتظار واحد مالی',
    'completed': 'تکمیل شده',
    'rejected': 'رد شده'
  };

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in" data-testid="dashboard">
        {/* Welcome Section */}
        <div className="bg-gradient-to-l from-amber-600 to-amber-500 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-3xl font-bold mb-2" data-testid="welcome-message">خوش آمدید, {user?.full_name}</h1>
          <p className="text-amber-100">پرتال مدیریت فرآیندها و درخواست‌ها</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 card-hover" data-testid="stat-total">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 text-sm font-medium">کل درخواست‌ها</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{stats.total}</p>
              </div>
              <FileCheck className="w-12 h-12 text-blue-500 opacity-80" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 card-hover" data-testid="stat-pending">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-700 text-sm font-medium">در حال پیگیری</p>
                <p className="text-3xl font-bold text-yellow-900 mt-1">{stats.pending}</p>
              </div>
              <Package className="w-12 h-12 text-yellow-500 opacity-80" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200 card-hover" data-testid="stat-completed">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-sm font-medium">تکمیل شده</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{stats.completed}</p>
              </div>
              <FileCheck className="w-12 h-12 text-green-500 opacity-80" />
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">دسترسی سریع</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.filter(action => action.show).map((action, index) => (
              <Card
                key={index}
                className="p-6 cursor-pointer card-hover bg-white border-2 border-gray-100 hover:border-amber-300"
                onClick={action.action}
                data-testid={action.testId}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <action.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">آخرین اعلان‌ها</h2>
            <Card className="p-6 bg-white" data-testid="notifications-list">
              <div className="space-y-4">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-start gap-4 p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/requests/${notif.request_id}`)}
                    data-testid={`notification-${notif.id}`}
                  >
                    <Bell className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium">{notif.message}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        شناسه: {notif.request_number}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 bg-amber-600 rounded-full mt-2 notification-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;