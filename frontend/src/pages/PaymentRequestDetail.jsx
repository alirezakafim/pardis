import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import DatePicker from '@hassanmojab/react-modern-calendar-datepicker';
import '@hassanmojab/react-modern-calendar-datepicker/lib/DatePicker.css';
import {
  CreditCard, Clock, CheckCircle, XCircle, DollarSign,
  User, MessageSquare, FileText, Download, Paperclip
} from 'lucide-react';

const PaymentRequestDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRejectFinancialModal, setShowRejectFinancialModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectFinancialNotes, setRejectFinancialNotes] = useState('');
  const [processData, setProcessData] = useState({
    payment_date_obj: null,
    invoice_base64: '',
    notes: ''
  });

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      const response = await axios.get(`${API}/payment-requests/${id}`);
      setRequest(response.data);
    } catch (error) {
      toast.error('خطا در بارگذاری درخواست');
      navigate('/payments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    try {
      await axios.post(`${API}/payment-requests/${id}/submit`);
      toast.success('درخواست ارسال شد');
      fetchRequest();
    } catch (error) {
      toast.error('خطا در ارسال درخواست');
    }
  };

  const handleReviewFinancial = async () => {
    try {
      await axios.post(`${API}/payment-requests/${id}/review-financial`, {});
      toast.success('درخواست بررسی شد');
      fetchRequest();
    } catch (error) {
      toast.error('خطا در بررسی درخواست');
    }
  };

  const handleRejectFinancial = async () => {
    if (!rejectFinancialNotes.trim()) {
      toast.error('دلیل رد اجباری است');
      return;
    }
    try {
      await axios.post(`${API}/payment-requests/${id}/reject-financial`, {
        notes: rejectFinancialNotes
      });
      toast.success('درخواست رد و به متقاضی ارجاع شد');
      setShowRejectFinancialModal(false);
      setRejectFinancialNotes('');
      fetchRequest();
    } catch (error) {
      toast.error('خطا در رد درخواست');
    }
  };

  const handleApproveDevManager = async () => {
    try {
      await axios.post(`${API}/payment-requests/${id}/approve-dev-manager`, {});
      toast.success('درخواست تایید شد');
      fetchRequest();
    } catch (error) {
      toast.error('خطا در تایید درخواست');
    }
  };

  const handleRejectDevManager = async () => {
    if (!rejectNotes.trim()) {
      toast.error('دلیل رد اجباری است');
      return;
    }
    try {
      await axios.post(`${API}/payment-requests/${id}/reject-dev-manager`, {
        notes: rejectNotes
      });
      toast.success('درخواست رد شد');
      setShowRejectModal(false);
      fetchRequest();
    } catch (error) {
      toast.error('خطا در رد درخواست');
    }
  };

  const handleInvoiceUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProcessData({ ...processData, invoice_base64: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessPayment = async () => {
    if (!processData.payment_date_obj) {
      toast.error('لطفاً تاریخ پرداخت را وارد کنید');
      return;
    }
    try {
      const payment_date = `${processData.payment_date_obj.year}/${processData.payment_date_obj.month}/${processData.payment_date_obj.day}`;
      await axios.post(`${API}/payment-requests/${id}/process-payment`, {
        payment_date,
        invoice_base64: processData.invoice_base64,
        notes: processData.notes
      });
      toast.success('پرداخت انجام شد');
      setShowProcessModal(false);
      fetchRequest();
    } catch (error) {
      toast.error('خطا در پردازش پرداخت');
    }
  };

  const statusConfig = {
    'draft': { label: 'پیش‌نویس', color: 'bg-gray-100 text-gray-800', icon: Clock },
    'pending_financial': { label: 'در انتظار مالی', color: 'bg-blue-100 text-blue-800', icon: DollarSign },
    'pending_dev_manager': { label: 'در انتظار مدیر توسعه', color: 'bg-purple-100 text-purple-800', icon: User },
    'pending_payment': { label: 'آماده پرداخت', color: 'bg-yellow-100 text-yellow-800', icon: DollarSign },
    'completed': { label: 'تکمیل شده', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    'rejected': { label: 'رد شده', color: 'bg-red-100 text-red-800', icon: XCircle }
  };

  const requestTypeLabels = {
    'purchase': 'خرید کالا/خدمت',
    'project': 'پروژه',
    'petty_cash': 'تنخواه',
    'salary': 'حقوق و دستمزد',
    'other': 'سایر'
  };

  const reasonLabels = {
    'prepayment': 'پیش‌پرداخت',
    'settlement': 'تسویه'
  };

  const paymentMethodLabels = {
    'cash': 'نقدی',
    'check': 'چک',
    'other': 'سایر'
  };

  const canSubmit = request?.status === 'draft' && request?.requester_id === user?.user_id;
  const canReviewFinancial = request?.status === 'pending_financial' && user?.roles?.includes('financial');
  const canApproveDevManager = request?.status === 'pending_dev_manager' && user?.roles?.includes('dev_manager');
  const canProcessPayment = request?.status === 'pending_payment' && user?.roles?.includes('financial');

  if (loading) {
    return <Layout><div className="text-center py-12">در حال بارگذاری...</div></Layout>;
  }

  if (!request) {
    return <Layout><div className="text-center py-12">درخواست یافت نشد</div></Layout>;
  }

  const StatusIcon = statusConfig[request.status]?.icon || Clock;
  const paymentRow = request.payment_row;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in" data-testid="payment-request-detail">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-amber-600" />
              درخواست پرداخت {request.request_number}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <Badge className={`${statusConfig[request.status]?.color} text-base px-4 py-1 flex items-center gap-2`}>
                <StatusIcon className="w-4 h-4" />
                {statusConfig[request.status]?.label}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {canSubmit && (
              <Button onClick={handleSubmitRequest} className="bg-amber-600 hover:bg-amber-700" data-testid="submit-payment-button">
                ارسال درخواست
              </Button>
            )}
          </div>
        </div>

        {/* Request Info */}
        <Card className="p-6 bg-white">
          <h2 className="text-xl font-bold text-gray-800 mb-4">اطلاعات درخواست</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">نوع درخواست</p>
              <p className="text-lg font-medium text-gray-800">
                {request.request_type === 'other' 
                  ? request.request_type_other 
                  : requestTypeLabels[request.request_type] || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">مبلغ کل</p>
              <p className="text-2xl font-bold text-amber-700">{request.total_amount?.toLocaleString()} ریال</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">درخواست‌دهنده</p>
              <p className="text-lg font-medium text-gray-800">{request.requester_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">تاریخ ایجاد</p>
              <p className="text-lg font-medium text-gray-800">
                {new Date(request.created_at).toLocaleDateString('fa-IR')}
              </p>
            </div>
          </div>
        </Card>

        {/* Payment Row Details */}
        {paymentRow && (
          <Card className="p-6 bg-white">
            <h2 className="text-xl font-bold text-gray-800 mb-4">اطلاعات پرداخت</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">مبلغ</p>
                <p className="font-bold text-gray-800">{paymentRow.amount?.toLocaleString()} ریال</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">شماره فاکتور/قرارداد</p>
                <p className="font-medium text-gray-800">{paymentRow.invoice_contract_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">علت پرداخت</p>
                <p className="font-medium text-gray-800">{reasonLabels[paymentRow.reason] || paymentRow.reason}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">مرکز هزینه</p>
                <p className="font-medium text-gray-800">{paymentRow.cost_center || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">روش پرداخت</p>
                <p className="font-medium text-gray-800">
                  {paymentRow.payment_method === 'other' 
                    ? paymentRow.payment_method_other 
                    : paymentMethodLabels[paymentRow.payment_method] || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">شماره حساب</p>
                <p className="font-medium text-gray-800">{paymentRow.account_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">نام بانک</p>
                <p className="font-medium text-gray-800">{paymentRow.bank_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">نام صاحب حساب</p>
                <p className="font-medium text-gray-800">{paymentRow.account_holder_name || '-'}</p>
              </div>
              {paymentRow.payment_date && (
                <div>
                  <p className="text-sm text-gray-600">تاریخ پرداخت</p>
                  <p className="font-medium text-gray-800">{paymentRow.payment_date}</p>
                </div>
              )}
              {paymentRow.notes && (
                <div className="col-span-4">
                  <p className="text-sm text-gray-600">توضیحات</p>
                  <p className="text-gray-800">{paymentRow.notes}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Attachment */}
        {request.attachment_base64 && (
          <Card className="p-6 bg-white">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              فایل پیوست
            </h2>
            {request.attachment_base64.startsWith('data:image') ? (
              <img src={request.attachment_base64} alt="Attachment" className="max-w-md rounded-lg border-2 border-gray-200" />
            ) : (
              <a href={request.attachment_base64} download className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                <Download className="w-5 h-5" />
                دانلود فایل پیوست
              </a>
            )}
          </Card>
        )}

        {/* Financial Review */}
        {canReviewFinancial && (
          <Card className="p-6 bg-white">
            <h2 className="text-xl font-bold text-gray-800 mb-4">بررسی واحد مالی</h2>
            <div className="flex gap-4">
              <Button onClick={handleReviewFinancial} className="bg-green-600 hover:bg-green-700" data-testid="review-financial-button">
                تایید و ارسال به مدیر توسعه
              </Button>
              <Button onClick={() => setShowRejectFinancialModal(true)} variant="destructive" data-testid="reject-financial-button">
                رد و ارجاع به متقاضی
              </Button>
            </div>
          </Card>
        )}

        {/* Dev Manager Approval */}
        {canApproveDevManager && (
          <Card className="p-6 bg-white">
            <h2 className="text-xl font-bold text-gray-800 mb-4">تایید مدیر توسعه</h2>
            <div className="flex gap-4">
              <Button onClick={handleApproveDevManager} className="bg-green-600 hover:bg-green-700" data-testid="approve-dev-manager-button">
                تایید درخواست
              </Button>
              <Button onClick={() => setShowRejectModal(true)} variant="destructive" data-testid="reject-dev-manager-button">
                رد درخواست
              </Button>
            </div>
          </Card>
        )}

        {/* Process Payment */}
        {canProcessPayment && (
          <Card className="p-6 bg-white">
            <h2 className="text-xl font-bold text-gray-800 mb-4">پردازش پرداخت</h2>
            <Button onClick={() => setShowProcessModal(true)} className="bg-green-600 hover:bg-green-700" data-testid="process-payment-button">
              انجام پرداخت
            </Button>
          </Card>
        )}

        {/* Invoice */}
        {request.invoice_base64 && (
          <Card className="p-6 bg-white">
            <h2 className="text-xl font-bold text-gray-800 mb-4">فاکتور</h2>
            <img src={request.invoice_base64} alt="Invoice" className="max-w-md rounded-lg border-2 border-gray-200" />
          </Card>
        )}

        {/* History */}
        <Card className="p-6 bg-white">
          <h2 className="text-xl font-bold text-gray-800 mb-4">تاریخچه</h2>
          <div className="space-y-4">
            {request.history?.map((hist, index) => (
              <div key={index} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">{hist.actor_name}</p>
                      <p className="text-sm text-gray-600">{hist.action}</p>
                      {hist.notes && <p className="text-sm text-gray-700 mt-1">{hist.notes}</p>}
                    </div>
                    <p className="text-xs text-gray-500">{new Date(hist.timestamp).toLocaleString('fa-IR')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Modals */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent className="rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle>رد درخواست توسط مدیر توسعه</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>دلیل رد (اجباری)</Label>
                <Textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="min-h-[100px]"
                  placeholder="دلیل رد درخواست را وارد کنید"
                  data-testid="reject-notes-input"
                />
              </div>
              <Button onClick={handleRejectDevManager} variant="destructive" className="w-full" data-testid="confirm-reject-button">
                تایید رد درخواست
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showRejectFinancialModal} onOpenChange={setShowRejectFinancialModal}>
          <DialogContent className="rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle>رد درخواست توسط واحد مالی</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                با رد درخواست، آن به وضعیت پیش‌نویس برمی‌گردد و متقاضی می‌تواند آن را ویرایش کند.
              </p>
              <div>
                <Label>دلیل رد (اجباری) <span className="text-red-500">*</span></Label>
                <Textarea
                  value={rejectFinancialNotes}
                  onChange={(e) => setRejectFinancialNotes(e.target.value)}
                  className="min-h-[100px]"
                  placeholder="دلیل رد درخواست را وارد کنید"
                  data-testid="reject-financial-notes-input"
                />
              </div>
              <Button 
                onClick={() => {
                  if (!rejectFinancialNotes.trim()) {
                    toast.error('دلیل رد اجباری است');
                    return;
                  }
                  setRejectNotes(rejectFinancialNotes);
                  handleRejectFinancial();
                }} 
                variant="destructive" 
                className="w-full" 
                data-testid="confirm-reject-financial-button"
              >
                رد و ارجاع به متقاضی
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
          <DialogContent className="rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle>پردازش پرداخت</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>تاریخ پرداخت <span className="text-red-500">*</span></Label>
                <DatePicker
                  value={processData.payment_date_obj}
                  onChange={(date) => setProcessData({ ...processData, payment_date_obj: date })}
                  locale="fa"
                  inputPlaceholder="انتخاب تاریخ"
                  inputClassName="w-full px-4 py-2 border border-gray-300 rounded-md focus:border-amber-500 bg-white"
                  colorPrimary="#d97706"
                  shouldHighlightWeekends
                />
              </div>
              <div>
                <Label>فاکتور (اختیاری)</Label>
                <input type="file" accept="image/*" onChange={handleInvoiceUpload} className="block" data-testid="process-invoice-upload" />
                {processData.invoice_base64 && (
                  <img src={processData.invoice_base64} alt="Invoice Preview" className="max-w-xs rounded-lg mt-2" />
                )}
              </div>
              <div>
                <Label>توضیحات</Label>
                <Textarea
                  value={processData.notes}
                  onChange={(e) => setProcessData({ ...processData, notes: e.target.value })}
                  placeholder="توضیحات (اختیاری)"
                  data-testid="process-notes-input"
                />
              </div>
              <Button onClick={handleProcessPayment} className="w-full bg-green-600 hover:bg-green-700" data-testid="confirm-process-button">
                تایید و پرداخت
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default PaymentRequestDetail;
