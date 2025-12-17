import React, { useState, useContext, useEffect } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CreditCard, Upload, FileText } from 'lucide-react';

const CreatePaymentRequest = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [costCenters, setCostCenters] = useState([]);
  
  const [formData, setFormData] = useState({
    request_type: '',
    request_type_other: '',
    total_amount: ''
  });
  
  const [paymentRow, setPaymentRow] = useState({
    amount: '',
    invoice_contract_number: '',
    reason: 'prepayment',
    cost_center: '',
    payment_method: '',
    payment_method_other: '',
    account_number: '',
    bank_name: '',
    account_holder_name: '',
    notes: ''
  });
  
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');

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

  useEffect(() => {
    fetchCostCenters();
  }, []);

  const fetchCostCenters = async () => {
    try {
      const response = await axios.get(`${API}/cost-centers`);
      setCostCenters(response.data);
    } catch (error) {
      console.error('Failed to fetch cost centers', error);
    }
  };

  const handleAttachmentUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const updatePaymentRow = (field, value) => {
    const newRow = { ...paymentRow, [field]: value };
    setPaymentRow(newRow);
    
    if (field === 'amount') {
      setFormData({ ...formData, total_amount: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.request_type) {
      toast.error('لطفاً نوع درخواست را انتخاب کنید');
      return;
    }
    
    if (formData.request_type === 'other' && !formData.request_type_other) {
      toast.error('لطفاً نوع درخواست را وارد کنید');
      return;
    }
    
    if (!paymentRow.amount || parseFloat(paymentRow.amount) <= 0) {
      toast.error('لطفاً مبلغ را وارد کنید');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        request_type: formData.request_type,
        request_type_other: formData.request_type_other || null,
        total_amount: parseFloat(paymentRow.amount),
        payment_row: {
          amount: parseFloat(paymentRow.amount),
          invoice_contract_number: paymentRow.invoice_contract_number || null,
          reason: paymentRow.reason,
          cost_center: paymentRow.cost_center || null,
          payment_method: paymentRow.payment_method || null,
          payment_method_other: paymentRow.payment_method_other || null,
          account_number: paymentRow.account_number || null,
          bank_name: paymentRow.bank_name || null,
          account_holder_name: paymentRow.account_holder_name || null,
          notes: paymentRow.notes || null
        },
        attachment_base64: attachmentPreview || null
      };

      const response = await axios.post(`${API}/payment-requests`, payload);
      toast.success('درخواست پرداخت ایجاد شد');
      navigate(`/payments/${response.data.request_id}`);
    } catch (error) {
      toast.error('خطا در ایجاد درخواست');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in" data-testid="create-payment-request">
        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-gray-800">درخواست پرداخت جدید</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="p-6 bg-white space-y-6">
            {/* Request Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>نوع درخواست <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.request_type}
                  onValueChange={(value) => setFormData({ ...formData, request_type: value })}
                >
                  <SelectTrigger data-testid="request-type-select">
                    <SelectValue placeholder="انتخاب نوع درخواست" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">خرید کالا/خدمت</SelectItem>
                    <SelectItem value="project">پروژه</SelectItem>
                    <SelectItem value="petty_cash">تنخواه</SelectItem>
                    <SelectItem value="salary">حقوق و دستمزد</SelectItem>
                    <SelectItem value="other">سایر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.request_type === 'other' && (
                <div>
                  <Label>توضیح نوع درخواست <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.request_type_other}
                    onChange={(e) => setFormData({ ...formData, request_type_other: e.target.value })}
                    placeholder="نوع درخواست را وارد کنید"
                    data-testid="request-type-other-input"
                  />
                </div>
              )}
            </div>

            {/* Payment Row */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">اطلاعات پرداخت</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>مبلغ (ریال) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={paymentRow.amount}
                    onChange={(e) => updatePaymentRow('amount', e.target.value)}
                    placeholder="مبلغ"
                    data-testid="payment-amount-input"
                  />
                </div>
                
                <div>
                  <Label>شماره فاکتور/قرارداد</Label>
                  <Input
                    value={paymentRow.invoice_contract_number}
                    onChange={(e) => updatePaymentRow('invoice_contract_number', e.target.value)}
                    placeholder="شماره فاکتور یا قرارداد"
                    data-testid="invoice-contract-input"
                  />
                </div>
                
                <div>
                  <Label>علت پرداخت <span className="text-red-500">*</span></Label>
                  <Select
                    value={paymentRow.reason}
                    onValueChange={(value) => updatePaymentRow('reason', value)}
                  >
                    <SelectTrigger data-testid="payment-reason-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prepayment">پیش‌پرداخت</SelectItem>
                      <SelectItem value="settlement">تسویه</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>مرکز هزینه</Label>
                  <Select
                    value={paymentRow.cost_center}
                    onValueChange={(value) => updatePaymentRow('cost_center', value)}
                  >
                    <SelectTrigger data-testid="cost-center-select">
                      <SelectValue placeholder="انتخاب مرکز هزینه" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters.map((center) => (
                        <SelectItem key={center.id} value={center.name}>
                          {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>روش پرداخت</Label>
                  <Select
                    value={paymentRow.payment_method}
                    onValueChange={(value) => updatePaymentRow('payment_method', value)}
                  >
                    <SelectTrigger data-testid="payment-method-select">
                      <SelectValue placeholder="انتخاب روش پرداخت" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدی</SelectItem>
                      <SelectItem value="check">چک</SelectItem>
                      <SelectItem value="other">سایر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {paymentRow.payment_method === 'other' && (
                  <div>
                    <Label>توضیح روش پرداخت</Label>
                    <Input
                      value={paymentRow.payment_method_other}
                      onChange={(e) => updatePaymentRow('payment_method_other', e.target.value)}
                      placeholder="روش پرداخت را وارد کنید"
                      data-testid="payment-method-other-input"
                    />
                  </div>
                )}
                
                <div>
                  <Label>شماره حساب</Label>
                  <Input
                    value={paymentRow.account_number}
                    onChange={(e) => updatePaymentRow('account_number', e.target.value)}
                    placeholder="شماره حساب"
                    data-testid="account-number-input"
                  />
                </div>
                
                <div>
                  <Label>نام بانک</Label>
                  <Input
                    value={paymentRow.bank_name}
                    onChange={(e) => updatePaymentRow('bank_name', e.target.value)}
                    placeholder="نام بانک"
                    data-testid="bank-name-input"
                  />
                </div>
                
                <div>
                  <Label>نام صاحب حساب</Label>
                  <Input
                    value={paymentRow.account_holder_name}
                    onChange={(e) => updatePaymentRow('account_holder_name', e.target.value)}
                    placeholder="نام صاحب حساب"
                    data-testid="account-holder-input"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <Label>توضیحات</Label>
                <Textarea
                  value={paymentRow.notes}
                  onChange={(e) => updatePaymentRow('notes', e.target.value)}
                  placeholder="توضیحات (اختیاری)"
                  className="min-h-[80px]"
                  data-testid="payment-notes-input"
                />
              </div>
            </div>

            {/* Total Amount Display */}
            <div className="bg-amber-50 p-4 rounded-lg">
              <Label className="text-lg font-bold">مبلغ کل (ریال)</Label>
              <p className="text-3xl font-bold text-amber-700 mt-2" data-testid="total-amount">
                {parseFloat(paymentRow.amount || 0).toLocaleString()}
              </p>
            </div>

            {/* Attachment */}
            <div className="border-t pt-6">
              <Label className="text-lg font-bold mb-4 block">فایل پیوست</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">انتخاب فایل</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleAttachmentUpload}
                    className="hidden"
                    data-testid="attachment-upload"
                  />
                </label>
                {attachment && (
                  <div className="flex items-center gap-2 text-green-600">
                    <FileText className="w-5 h-5" />
                    <span>{attachment.name}</span>
                  </div>
                )}
              </div>
              {attachmentPreview && attachmentPreview.startsWith('data:image') && (
                <img src={attachmentPreview} alt="Preview" className="mt-4 max-w-xs rounded-lg border" />
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4 border-t">
              <Button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 flex-1"
                disabled={loading}
                data-testid="create-payment-button"
              >
                {loading ? 'در حال ایجاد...' : 'ایجاد درخواست'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/payments')}
              >
                انصراف
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </Layout>
  );
};

export default CreatePaymentRequest;
