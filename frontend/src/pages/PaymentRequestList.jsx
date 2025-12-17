import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { CreditCard, Plus, Eye, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';

const PaymentRequestList = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/payment-requests`);
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch payment requests', error);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    'draft': { label: 'پیش‌نویس', color: 'bg-gray-100 text-gray-800', icon: Clock },
    'pending_financial': { label: 'در انتظار مالی', color: 'bg-blue-100 text-blue-800', icon: DollarSign },
    'pending_dev_manager': { label: 'در انتظار مدیر توسعه', color: 'bg-purple-100 text-purple-800', icon: Clock },
    'pending_payment': { label: 'آماده پرداخت', color: 'bg-yellow-100 text-yellow-800', icon: DollarSign },
    'completed': { label: 'تکمیل شده', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    'rejected': { label: 'رد شده', color: 'bg-red-100 text-red-800', icon: XCircle }
  };

  const reasonLabels = {
    'advance': 'پیش‌پرداخت',
    'on_account': 'علی‌الحساب'
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">در حال بارگذاری...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="payment-request-list">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-gray-800">درخواست‌های پرداخت</h1>
          </div>
          <Button
            onClick={() => navigate('/payments/new')}
            className="bg-amber-600 hover:bg-amber-700"
            data-testid="new-payment-button"
          >
            <Plus className="w-5 h-5 ml-2" />
            درخواست جدید
          </Button>
        </div>

        {/* Request List */}
        {requests.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-600 mb-2">هیچ درخواستی یافت نشد</h2>
            <p className="text-gray-500 mb-6">اولین درخواست پرداخت خود را ایجاد کنید</p>
            <Button onClick={() => navigate('/payments/new')} className="bg-amber-600 hover:bg-amber-700">
              ایجاد درخواست
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => {
              const StatusIcon = statusConfig[request.status]?.icon || Clock;
              return (
                <Card
                  key={request.id}
                  className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/payments/${request.id}`)}
                  data-testid={`payment-request-${request.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-800">
                          {request.request_number}
                        </h3>
                        <Badge className={`${statusConfig[request.status]?.color} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[request.status]?.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-500">مبلغ کل</p>
                          <p className="font-bold text-amber-700">{request.total_amount?.toLocaleString()} ریال</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">تعداد ردیف</p>
                          <p className="font-medium text-gray-800">{request.payment_rows?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">درخواست‌دهنده</p>
                          <p className="font-medium text-gray-800">{request.requester_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">تاریخ ایجاد</p>
                          <p className="font-medium text-gray-800">
                            {new Date(request.created_at).toLocaleDateString('fa-IR')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-amber-600">
                      <Eye className="w-5 h-5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PaymentRequestList;
