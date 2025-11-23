import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search, Eye, Plus } from 'lucide-react';

const RequestList = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [searchTerm, requests]);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/goods-requests`);
      setRequests(response.data);
      setFilteredRequests(response.data);
    } catch (error) {
      toast.error('خطا در بارگذاری درخواست‌ها');
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    if (!searchTerm) {
      setFilteredRequests(requests);
      return;
    }
    const filtered = requests.filter(req =>
      req.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRequests(filtered);
  };

  const statusConfig = {
    'draft': { label: 'پیش‌نویس', color: 'bg-gray-100 text-gray-800 border-gray-300' },
    'pending_procurement': { label: 'در انتظار تامین', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    'pending_management': { label: 'در انتظار مدیریت', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    'pending_purchase': { label: 'آماده خرید', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    'pending_receipt': { label: 'در انتظار رسید', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    'pending_invoice': { label: 'در انتظار فاکتور', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    'pending_financial': { label: 'در انتظار مالی', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
    'completed': { label: 'تکمیل شده', color: 'bg-green-100 text-green-800 border-green-300' },
    'rejected': { label: 'رد شده', color: 'bg-red-100 text-red-800 border-red-300' }
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
      <div className="space-y-6 animate-fade-in" data-testid="request-list">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">درخواست‌های من</h1>
            <p className="text-gray-600 mt-1">مدیریت و پیگیری درخواست‌ها</p>
          </div>
          <Button
            onClick={() => navigate('/requests/new')}
            className="bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-lg"
            data-testid="new-request-button"
          >
            <Plus className="w-5 h-5 ml-2" />
            درخواست جدید
          </Button>
        </div>

        <Card className="p-6 bg-white">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="جستجو بر اساس شناسه، نام کالا یا متقاضی..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-gray-50 border-gray-300"
                data-testid="search-input"
              />
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500" data-testid="no-requests">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">درخواستی یافت نشد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="requests-table">
                <thead className="bg-amber-50 border-b border-amber-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">شناسه</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">نام کالا</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">تعداد</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">مرکز هزینه</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">متقاضی</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">وضعیت</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(request => (
                    <tr
                      key={request.id}
                      className="border-b border-gray-100 hover:bg-amber-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/requests/${request.id}`)}
                      data-testid={`request-row-${request.id}`}
                    >
                      <td className="px-6 py-4 text-gray-800 font-medium">{request.request_number}</td>
                      <td className="px-6 py-4 text-gray-800">{request.item_name}</td>
                      <td className="px-6 py-4 text-gray-800">{request.quantity}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{request.cost_center}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{request.requester_name}</td>
                      <td className="px-6 py-4">
                        <Badge className={`${statusConfig[request.status]?.color} border font-medium`}>
                          {statusConfig[request.status]?.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/requests/${request.id}`)}
                          className="border-amber-300 text-amber-700 hover:bg-amber-50"
                          data-testid={`view-request-${request.id}`}
                        >
                          <Eye className="w-4 h-4 ml-1" />
                          مشاهده
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default RequestList;