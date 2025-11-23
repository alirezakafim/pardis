import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Download, FileSpreadsheet, TrendingUp } from 'lucide-react';

const Reports = () => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    rejected: 0,
    byStatus: {}
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/goods-requests`);
      const data = response.data;
      setRequests(data);
      
      // Calculate stats
      const statusCounts = {};
      data.forEach(req => {
        statusCounts[req.status] = (statusCounts[req.status] || 0) + 1;
      });

      setStats({
        total: data.length,
        completed: data.filter(r => r.status === 'completed').length,
        pending: data.filter(r => !['completed', 'rejected'].includes(r.status)).length,
        rejected: data.filter(r => r.status === 'rejected').length,
        byStatus: statusCounts
      });
    } catch (error) {
      toast.error('خطا در بارگذاری داده‌ها');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    try {
      const response = await axios.get(`${API}/reports/excel`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('گزارش Excel دانلود شد');
    } catch (error) {
      toast.error('خطا در دانلود گزارش');
    }
  };

  const statusLabels = {
    'draft': 'پیش‌نویس',
    'pending_procurement': 'در انتظار تامین',
    'pending_management': 'در انتظار مدیریت',
    'pending_purchase': 'آماده خرید',
    'pending_receipt': 'در انتظار رسید',
    'pending_invoice': 'در انتظار فاکتور',
    'pending_financial': 'در انتظار مالی',
    'completed': 'تکمیل شده',
    'rejected': 'رد شده'
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-600">در حال بارگذاری...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="reports-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-amber-600" />
              گزارش‌گیری و آمار
            </h1>
            <p className="text-gray-600 mt-1">مشاهده آمار و دریافت گزارش‌های جامع</p>
          </div>
          <Button
            onClick={downloadExcel}
            className="bg-gradient-to-l from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg"
            data-testid="download-excel-button"
          >
            <Download className="w-5 h-5 ml-2" />
            دانلود گزارش Excel
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" data-testid="stat-total-reports">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 text-sm font-medium">کل درخواست‌ها</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{stats.total}</p>
              </div>
              <FileSpreadsheet className="w-12 h-12 text-blue-500 opacity-80" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200" data-testid="stat-completed-reports">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-sm font-medium">تکمیل شده</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{stats.completed}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-500 opacity-80" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200" data-testid="stat-pending-reports">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-700 text-sm font-medium">در حال پیگیری</p>
                <p className="text-3xl font-bold text-yellow-900 mt-1">{stats.pending}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-yellow-500 opacity-80" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200" data-testid="stat-rejected-reports">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-700 text-sm font-medium">رد شده</p>
                <p className="text-3xl font-bold text-red-900 mt-1">{stats.rejected}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-red-500 opacity-80" />
            </div>
          </Card>
        </div>

        {/* Status Breakdown */}
        <Card className="p-6 bg-white">
          <h2 className="text-xl font-bold text-gray-800 mb-6">توزیع وضعیت درخواست‌ها</h2>
          <div className="space-y-3">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              const percentage = ((count / stats.total) * 100).toFixed(1);
              return (
                <div key={status} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{statusLabels[status]}</span>
                    <span className="text-sm font-bold text-gray-800">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-amber-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent Requests Summary */}
        <Card className="p-6 bg-white">
          <h2 className="text-xl font-bold text-gray-800 mb-6">خلاصه درخواست‌های اخیر</h2>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="recent-requests-table">
              <thead className="bg-amber-50 border-b border-amber-200">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">شناسه</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">نام کالا</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">متقاضی</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">وضعیت</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 10).map(request => (
                  <tr key={request.id} className="border-b border-gray-100 hover:bg-amber-50 transition-colors">
                    <td className="px-6 py-4 text-gray-800 font-medium">{request.request_number}</td>
                    <td className="px-6 py-4 text-gray-800">{request.item_name}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{request.requester_name}</td>
                    <td className="px-6 py-4 text-sm">{statusLabels[request.status]}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {new Date(request.created_at).toLocaleDateString('fa-IR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Export Info */}
        <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <h3 className="font-bold text-amber-900 mb-2">راهنمای گزارش‌گیری</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-amber-800">
            <li>گزارش Excel شامل تمام درخواست‌های قابل مشاهده برای شما می‌باشد</li>
            <li>برای متقاضی‌ها، قیمت‌ها در گزارش نمایش داده نمی‌شود</li>
            <li>مدیران و واحد مالی به گزارش کامل با قیمت‌ها دسترسی دارند</li>
            <li>گزارش‌ها به صورت خودکار بر اساس نقش کاربر فیلتر می‌شوند</li>
          </ul>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;
