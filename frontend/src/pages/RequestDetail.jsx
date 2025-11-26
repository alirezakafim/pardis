import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { 
  Package, FileText, CheckCircle, XCircle, Upload, 
  Clock, User, Building, MessageSquare, Receipt, FileCheck 
} from 'lucide-react';

const RequestDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [inquiries, setInquiries] = useState([
    { unit_price: '', quantity: '', total_price: '', image_base64: '' },
    { unit_price: '', quantity: '', total_price: '', image_base64: '' },
    { unit_price: '', quantity: '', total_price: '', image_base64: '' }
  ]);
  const [receiptData, setReceiptData] = useState({
    quantity: '',
    unit_price: '',
    total_price: ''
  });
  const [invoiceBase64, setInvoiceBase64] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    item_name: '',
    quantity: '',
    cost_center: '',
    description: '',
    image_base64: ''
  });

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      const response = await axios.get(`${API}/goods-requests/${id}`);
      setRequest(response.data);
      setEditFormData({
        item_name: response.data.item_name,
        quantity: response.data.quantity,
        cost_center: response.data.cost_center,
        description: response.data.description || '',
        image_base64: response.data.image_base64 || ''
      });
    } catch (error) {
      toast.error('خطا در بارگذاری درخواست');
      navigate('/requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    try {
      await axios.post(`${API}/goods-requests/${id}/submit`);
      toast.success('درخواست ارسال شد');
      fetchRequest();
    } catch (error) {
      toast.error('خطا در ارسال درخواست');
    }
  };

  const handleImageUpload = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newInquiries = [...inquiries];
        newInquiries[index].image_base64 = reader.result;
        setInquiries(newInquiries);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInvoiceUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoiceBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddInquiries = async () => {
    try {
      const formattedInquiries = inquiries.map(inq => ({
        unit_price: parseFloat(inq.unit_price),
        quantity: parseInt(inq.quantity),
        total_price: parseFloat(inq.total_price),
        image_base64: inq.image_base64
      }));
      await axios.post(`${API}/goods-requests/${id}/inquiries`, formattedInquiries);
      toast.success('استعلام‌ها ثبت شد');
      setShowInquiryModal(false);
      fetchRequest();
    } catch (error) {
      toast.error('خطا در ثبت استعلام‌ها');
    }
  };

  const handleSelectInquiry = async (inquiryId) => {
    try {
      await axios.post(`${API}/goods-requests/${id}/select-inquiry`, { inquiry_id: inquiryId, action: 'approve' });
      toast.success('استعلام برنده انتخاب شد');
      fetchRequest();
    } catch (error) {
      toast.error('خطا در انتخاب استعلام');
    }
  };

  const handleSelectInquiryWithAction = async (inquiryId, action) => {
    try {
      await axios.post(`${API}/goods-requests/${id}/select-inquiry`, { 
        inquiry_id: inquiryId, 
        action: action 
      });
      
      const messages = {
        'approve': 'استعلام تایید و به عنوان برنده انتخاب شد',
        'reject_with_edit': 'درخواست برای اصلاح به واحد تامین بازگردانده شد',
        'reject_complete': 'درخواست به طور کامل رد شد'
      };
      
      toast.success(messages[action]);
      fetchRequest();
    } catch (error) {
      toast.error('خطا در انجام عملیات');
    }
  };

  const handleSelectInquiryWithAction = async (inquiryId, action) => {
    try {
      let endpoint, successMessage;
      
      switch (action) {
        case 'approve':
          endpoint = 'select-inquiry';
          successMessage = 'استعلام تایید و به عنوان برنده انتخاب شد';
          break;
        case 'reject_with_edit':
          endpoint = 'reject-for-edit';
          successMessage = 'درخواست برای اصلاح به متقاضی بازگردانده شد';
          break;
        case 'reject_complete':
          endpoint = 'reject-complete';
          successMessage = 'درخواست به طور کامل رد شد';
          break;
        default:
          throw new Error('Invalid action');
      }

      const payload = action === 'approve' 
        ? { inquiry_id: inquiryId }
        : { inquiry_id: inquiryId, action };

      await axios.post(`${API}/goods-requests/${id}/${endpoint}`, payload);
      toast.success(successMessage);
      fetchRequest();
    } catch (error) {
      toast.error('خطا در انجام عملیات');
    }
  };

  const handleAddReceipt = async () => {
    try {
      await axios.post(`${API}/goods-requests/${id}/receipts`, {
        quantity: parseInt(receiptData.quantity),
        unit_price: parseFloat(receiptData.unit_price),
        total_price: parseFloat(receiptData.total_price)
      });
      toast.success('رسید ثبت شد');
      setShowReceiptModal(false);
      setReceiptData({ quantity: '', unit_price: '', total_price: '' });
      fetchRequest();
    } catch (error) {
      toast.error('خطا در ثبت رسید');
    }
  };

  const handleConfirmReceipt = async (receiptId, type) => {
    try {
      const endpoint = type === 'procurement' 
        ? 'receipts/confirm-procurement' 
        : 'receipts/confirm-requester';
      await axios.post(`${API}/goods-requests/${id}/${endpoint}`, { receipt_id: receiptId });
      toast.success('رسید تایید شد');
      fetchRequest();
    } catch (error) {
      toast.error('خطا در تایید رسید');
    }
  };

  const handleUploadInvoice = async () => {
    try {
      await axios.post(`${API}/goods-requests/${id}/invoice`, { invoice_base64: invoiceBase64 });
      toast.success('فاکتور بارگذاری شد');
      setInvoiceBase64('');
      fetchRequest();
    } catch (error) {
      toast.error('خطا در بارگذاری فاکتور');
    }
  };

  const handleApproveFinancial = async () => {
    try {
      await axios.post(`${API}/goods-requests/${id}/approve-financial`, {});
      toast.success('درخواست تایید نهایی شد');
      fetchRequest();
    } catch (error) {
      toast.error('خطا در تایید نهایی');
    }
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) {
      toast.error('دلیل رد اجباری است');
      return;
    }
    try {
      await axios.post(`${API}/goods-requests/${id}/reject`, { notes: rejectNotes });
      toast.success('درخواست رد شد');
      setShowRejectModal(false);
      setRejectNotes('');
      fetchRequest();
    } catch (error) {
      toast.error('خطا در رد درخواست');
    }
  };

  const handleEditImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditFormData({ ...editFormData, image_base64: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditRequest = async () => {
    try {
      await axios.put(`${API}/goods-requests/${id}`, {
        item_name: editFormData.item_name,
        quantity: parseInt(editFormData.quantity),
        cost_center: editFormData.cost_center,
        description: editFormData.description,
        image_base64: editFormData.image_base64
      });
      toast.success('درخواست ویرایش شد');
      setShowEditModal(false);
      fetchRequest();
    } catch (error) {
      toast.error('خطا در ویرایش درخواست');
    }
  };

  const statusConfig = {
    'draft': { label: 'پیش‌نویس', color: 'bg-gray-100 text-gray-800', icon: FileText },
    'pending_procurement': { label: 'در انتظار تامین', color: 'bg-blue-100 text-blue-800', icon: Clock },
    'pending_management': { label: 'در انتظار مدیریت', color: 'bg-purple-100 text-purple-800', icon: User },
    'pending_purchase': { label: 'آماده خرید', color: 'bg-yellow-100 text-yellow-800', icon: Package },
    'pending_receipt': { label: 'در انتظار رسید', color: 'bg-orange-100 text-orange-800', icon: Receipt },
    'pending_invoice': { label: 'در انتظار فاکتور', color: 'bg-amber-100 text-amber-800', icon: FileText },
    'pending_financial': { label: 'در انتظار مالی', color: 'bg-cyan-100 text-cyan-800', icon: FileCheck },
    'completed': { label: 'تکمیل شده', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    'rejected': { label: 'رد شده', color: 'bg-red-100 text-red-800', icon: XCircle }
  };

  const canSubmit = request?.status === 'draft' && request?.requester_id === user?.user_id;
  const canEdit = request?.status === 'draft' && request?.requester_id === user?.user_id;
  const canAddInquiries = request?.status === 'pending_procurement' && user?.roles?.includes('procurement');
  const canSelectInquiry = request?.status === 'pending_management' && user?.roles?.includes('management');
  const canAddReceipt = ['pending_purchase', 'pending_receipt'].includes(request?.status) && user?.roles?.includes('procurement');
  const canConfirmReceiptProcurement = request?.status === 'pending_receipt' && user?.roles?.includes('procurement');
  const canConfirmReceiptRequester = request?.status === 'pending_receipt' && request?.requester_id === user?.user_id;
  const canUploadInvoice = request?.status === 'pending_invoice' && user?.roles?.includes('procurement');
  const canApproveFinancial = request?.status === 'pending_financial' && user?.roles?.includes('financial');
  const canReject = !['draft', 'completed', 'rejected'].includes(request?.status);

  // Hide prices from requester
  const isRequester = user?.roles?.includes('requester') && 
                       !user?.roles?.includes('admin') && 
                       !user?.roles?.includes('management') &&
                       !user?.roles?.includes('procurement') &&
                       !user?.roles?.includes('financial');

  if (loading) {
    return <Layout><div className="text-center py-12">در حال بارگذاری...</div></Layout>;
  }

  if (!request) {
    return <Layout><div className="text-center py-12">درخواست یافت نشد</div></Layout>;
  }

  const StatusIcon = statusConfig[request.status]?.icon || FileText;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in" data-testid="request-detail">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Package className="w-8 h-8 text-amber-600" />
              جزئیات درخواست {request.request_number}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <Badge className={`${statusConfig[request.status]?.color} text-base px-4 py-1 flex items-center gap-2`}>
                <StatusIcon className="w-4 h-4" />
                {statusConfig[request.status]?.label}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button onClick={() => setShowEditModal(true)} className="bg-blue-600 hover:bg-blue-700" data-testid="edit-request-button">
                ویرایش درخواست
              </Button>
            )}
            {canSubmit && (
              <Button onClick={handleSubmitRequest} className="bg-amber-600 hover:bg-amber-700" data-testid="submit-request-button">
                ارسال درخواست
              </Button>
            )}
            {canReject && (
              <Button 
                onClick={() => setShowRejectModal(true)} 
                variant="destructive"
                data-testid="reject-button"
              >
                رد درخواست
              </Button>
            )}
          </div>
        </div>

        {/* Request Info */}
        <Card className="p-6 bg-white">
          <h2 className="text-xl font-bold text-gray-800 mb-4">اطلاعات درخواست</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">نام کالا</p>
              <p className="text-lg font-medium text-gray-800">{request.item_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">تعداد</p>
              <p className="text-lg font-medium text-gray-800">{request.quantity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">مرکز هزینه</p>
              <p className="text-lg font-medium text-gray-800">{request.cost_center}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">متقاضی</p>
              <p className="text-lg font-medium text-gray-800">{request.requester_name}</p>
            </div>
            {request.description && (
              <div className="col-span-2">
                <p className="text-sm text-gray-600">توضیحات</p>
                <p className="text-gray-800">{request.description}</p>
              </div>
            )}
            {request.image_base64 && (
              <div className="col-span-2">
                <p className="text-sm text-gray-600 mb-2">تصویر کالا</p>
                <img src={request.image_base64} alt="Item" className="max-w-sm rounded-lg border-2 border-gray-200" />
              </div>
            )}
          </div>
        </Card>

        {/* Inquiries Section */}
        {(canAddInquiries || request.inquiries?.length > 0) && (
          <Card className="p-6 bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">استعلام‌ها</h2>
              {canAddInquiries && (
                <Button onClick={() => setShowInquiryModal(true)} className="bg-amber-600 hover:bg-amber-700" data-testid="add-inquiries-button">
                  افزودن استعلام‌ها
                </Button>
              )}
            </div>
            {request.inquiries?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {request.inquiries.map((inq, index) => (
                  <Card key={inq.id} className={`p-4 ${inq.is_selected ? 'border-2 border-green-500 bg-green-50' : 'border border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-gray-800">استعلام {index + 1}</h3>
                      {inq.is_selected && <Badge className="bg-green-600">برنده</Badge>}
                    </div>
                    {!isRequester && (
                      <>
                        <p className="text-sm text-gray-600">فی: <span className="font-medium text-gray-800">{inq.unit_price.toLocaleString()} ریال</span></p>
                        <p className="text-sm text-gray-600">تعداد: <span className="font-medium text-gray-800">{inq.quantity}</span></p>
                        <p className="text-sm text-gray-600 mb-3">قیمت کل: <span className="font-medium text-gray-800">{inq.total_price.toLocaleString()} ریال</span></p>
                      </>
                    )}
                    {inq.image_base64 && (
                      <img src={inq.image_base64} alt={`Inquiry ${index + 1}`} className="w-full rounded-lg mb-3" />
                    )}
                    {canSelectInquiry && !inq.is_selected && (
                      <div className="space-y-2 mt-3">
                        <Button 
                          onClick={() => handleSelectInquiryWithAction(inq.id, 'approve')} 
                          size="sm" 
                          className="w-full bg-green-600 hover:bg-green-700"
                          data-testid={`approve-inquiry-${index}`}
                        >
                          تایید و انتخاب برنده
                        </Button>
                        <Button 
                          onClick={() => handleSelectInquiryWithAction(inq.id, 'reject_with_edit')} 
                          size="sm" 
                          variant="outline"
                          className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                          data-testid={`reject-edit-inquiry-${index}`}
                        >
                          بازگشت برای اصلاح
                        </Button>
                        <Button 
                          onClick={() => handleSelectInquiryWithAction(inq.id, 'reject_complete')} 
                          size="sm" 
                          variant="destructive"
                          className="w-full"
                          data-testid={`reject-complete-inquiry-${index}`}
                        >
                          رد کامل درخواست
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Receipts Section */}
        {(canAddReceipt || request.receipts?.length > 0) && (
          <Card className="p-6 bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">رسیدها</h2>
              {canAddReceipt && (
                <Button onClick={() => setShowReceiptModal(true)} className="bg-amber-600 hover:bg-amber-700" data-testid="add-receipt-button">
                  افزودن رسید
                </Button>
              )}
            </div>
            {request.receipts?.length > 0 && (
              <div className="space-y-4">
                {request.receipts.map((receipt) => (
                  <Card key={receipt.id} className="p-4 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800 mb-2">رسید {receipt.receipt_number}</h3>
                        {!isRequester && (
                          <>
                            <p className="text-sm text-gray-600">تعداد: {receipt.quantity}</p>
                            <p className="text-sm text-gray-600">فی: {receipt.unit_price.toLocaleString()} ریال</p>
                            <p className="text-sm text-gray-600">قیمت کل: {receipt.total_price.toLocaleString()} ریال</p>
                          </>
                        )}
                      </div>
                      <div className="space-y-2">
                        {receipt.confirmed_by_procurement ? (
                          <Badge className="bg-green-600">✓ تایید واحد تامین</Badge>
                        ) : canConfirmReceiptProcurement && (
                          <Button 
                            onClick={() => handleConfirmReceipt(receipt.id, 'procurement')} 
                            size="sm"
                            data-testid={`confirm-receipt-procurement-${receipt.id}`}
                          >
                            تایید واحد تامین
                          </Button>
                        )}
                        {receipt.confirmed_by_requester ? (
                          <Badge className="bg-green-600">✓ تایید متقاضی</Badge>
                        ) : canConfirmReceiptRequester && (
                          <Button 
                            onClick={() => handleConfirmReceipt(receipt.id, 'requester')} 
                            size="sm"
                            data-testid={`confirm-receipt-requester-${receipt.id}`}
                          >
                            تایید متقاضی
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Invoice Section */}
        {(canUploadInvoice || request.invoice_base64) && (
          <Card className="p-6 bg-white">
            <h2 className="text-xl font-bold text-gray-800 mb-4">فاکتور</h2>
            {request.invoice_base64 ? (
              <div>
                <img src={request.invoice_base64} alt="Invoice" className="max-w-md rounded-lg border-2 border-gray-200" />
              </div>
            ) : canUploadInvoice && (
              <div className="space-y-4">
                <input type="file" accept="image/*" onChange={handleInvoiceUpload} className="block" data-testid="invoice-upload" />
                {invoiceBase64 && (
                  <div>
                    <img src={invoiceBase64} alt="Invoice Preview" className="max-w-sm rounded-lg mb-4" />
                    <Button onClick={handleUploadInvoice} className="bg-amber-600 hover:bg-amber-700" data-testid="upload-invoice-button">
                      بارگذاری فاکتور
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Financial Approval */}
        {canApproveFinancial && (
          <Card className="p-6 bg-white">
            <h2 className="text-xl font-bold text-gray-800 mb-4">تایید نهایی واحد مالی</h2>
            <Button onClick={handleApproveFinancial} className="bg-green-600 hover:bg-green-700" data-testid="approve-financial-button">
              تایید نهایی و تکمیل درخواست
            </Button>
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
        <Dialog open={showInquiryModal} onOpenChange={setShowInquiryModal}>
          <DialogContent className="max-w-4xl rtl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>افزودن 3 استعلام</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {inquiries.map((inq, index) => (
                <Card key={index} className="p-4">
                  <h3 className="font-bold mb-3">استعلام {index + 1}</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>فی (ریال)</Label>
                      <Input
                        type="number"
                        value={inq.unit_price}
                        onChange={(e) => {
                          const newInquiries = [...inquiries];
                          newInquiries[index].unit_price = e.target.value;
                          setInquiries(newInquiries);
                        }}
                        data-testid={`inquiry-unit-price-${index}`}
                      />
                    </div>
                    <div>
                      <Label>تعداد</Label>
                      <Input
                        type="number"
                        value={inq.quantity}
                        onChange={(e) => {
                          const newInquiries = [...inquiries];
                          newInquiries[index].quantity = e.target.value;
                          setInquiries(newInquiries);
                        }}
                        data-testid={`inquiry-quantity-${index}`}
                      />
                    </div>
                    <div>
                      <Label>قیمت کل (ریال)</Label>
                      <Input
                        type="number"
                        value={inq.total_price}
                        onChange={(e) => {
                          const newInquiries = [...inquiries];
                          newInquiries[index].total_price = e.target.value;
                          setInquiries(newInquiries);
                        }}
                        data-testid={`inquiry-total-price-${index}`}
                      />
                    </div>
                    <div>
                      <Label>تصویر</Label>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, index)} className="text-sm" />
                      {inq.image_base64 && <p className="text-xs text-green-600 mt-1">✓ تصویر انتخاب شد</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <Button onClick={handleAddInquiries} className="w-full bg-amber-600 hover:bg-amber-700 mt-4" data-testid="save-inquiries-button">
              ذخیره استعلام‌ها
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
          <DialogContent className="rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle>افزودن رسید جدید</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>تعداد</Label>
                <Input
                  type="number"
                  value={receiptData.quantity}
                  onChange={(e) => setReceiptData({ ...receiptData, quantity: e.target.value })}
                  data-testid="receipt-quantity-input"
                />
              </div>
              <div>
                <Label>فی (ریال)</Label>
                <Input
                  type="number"
                  value={receiptData.unit_price}
                  onChange={(e) => setReceiptData({ ...receiptData, unit_price: e.target.value })}
                  data-testid="receipt-unit-price-input"
                />
              </div>
              <div>
                <Label>قیمت کل (ریال)</Label>
                <Input
                  type="number"
                  value={receiptData.total_price}
                  onChange={(e) => setReceiptData({ ...receiptData, total_price: e.target.value })}
                  data-testid="receipt-total-price-input"
                />
              </div>
              <Button onClick={handleAddReceipt} className="w-full bg-amber-600 hover:bg-amber-700" data-testid="save-receipt-button">
                ثبت رسید
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent className="rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle>رد درخواست</DialogTitle>
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
              <Button onClick={handleReject} variant="destructive" className="w-full" data-testid="confirm-reject-button">
                تایید رد درخواست
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="rtl max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>ویرایش درخواست</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>نام کالا</Label>
                <Input
                  value={editFormData.item_name}
                  onChange={(e) => setEditFormData({ ...editFormData, item_name: e.target.value })}
                  data-testid="edit-item-name-input"
                />
              </div>
              <div>
                <Label>تعداد</Label>
                <Input
                  type="number"
                  value={editFormData.quantity}
                  onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                  data-testid="edit-quantity-input"
                />
              </div>
              <div>
                <Label>مرکز هزینه</Label>
                <Input
                  value={editFormData.cost_center}
                  onChange={(e) => setEditFormData({ ...editFormData, cost_center: e.target.value })}
                  data-testid="edit-cost-center-input"
                />
              </div>
              <div>
                <Label>توضیحات</Label>
                <Textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="min-h-[100px]"
                  data-testid="edit-description-input"
                />
              </div>
              <div>
                <Label>تصویر</Label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleEditImageUpload} 
                  className="block text-sm"
                  data-testid="edit-image-upload"
                />
                {editFormData.image_base64 && (
                  <img src={editFormData.image_base64} alt="Preview" className="mt-2 max-w-xs rounded-lg" />
                )}
              </div>
              <Button onClick={handleEditRequest} className="w-full bg-amber-600 hover:bg-amber-700" data-testid="save-edit-button">
                ذخیره تغییرات
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RequestDetail;
