import React, { useState, useContext } from 'react';
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
import { CreditCard, Plus, Trash2 } from 'lucide-react';

const CreatePaymentRequest = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    total_amount: '',
    description: ''
  });
  const [paymentRows, setPaymentRows] = useState([
    { amount: '', reason: 'advance', notes: '' }
  ]);

  const reasonLabels = {
    'advance': 'پیش‌پرداخت',
    'on_account': 'علی‌الحساب'
  };

  const addRow = () => {
    setPaymentRows([...paymentRows, { amount: '', reason: 'advance', notes: '' }]);
  };

  const removeRow = (index) => {
    if (paymentRows.length > 1) {
      const newRows = paymentRows.filter((_, i) => i !== index);
      setPaymentRows(newRows);
      calculateTotal(newRows);
    }
  };

  const updateRow = (index, field, value) => {
    const newRows = [...paymentRows];
    newRows[index][field] = value;
    setPaymentRows(newRows);
    
    if (field === 'amount') {
      calculateTotal(newRows);
    }
  };

  const calculateTotal = (rows) => {
    const total = rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
    setFormData({ ...formData, total_amount: total.toString() });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      toast.error('لطفاً مبلغ کل را وارد کنید');
      return;
    }
    
    if (paymentRows.some(row => !row.amount || parseFloat(row.amount) <= 0)) {
      toast.error('لطفاً مبلغ همه ردیف‌ها را وارد کنید');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        total_amount: parseFloat(formData.total_amount),
        payment_rows: paymentRows.map(row => ({
          amount: parseFloat(row.amount),
          reason: row.reason,
          notes: row.notes
        }))
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
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in" data-testid="create-payment-request">
        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-gray-800">درخواست پرداخت جدید</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="p-6 bg-white space-y-6">
            {/* Payment Rows */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <Label className="text-lg font-bold">ردیف‌های پرداخت</Label>
                <Button type="button" onClick={addRow} variant="outline" size="sm">
                  <Plus className="w-4 h-4 ml-2" />
                  افزودن ردیف
                </Button>
              </div>
              
              <div className="space-y-4">
                {paymentRows.map((row, index) => (
                  <Card key={index} className="p-4 border border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-sm font-medium text-gray-700">ردیف {index + 1}</span>
                      {paymentRows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>مبلغ (ریال) <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          value={row.amount}
                          onChange={(e) => updateRow(index, 'amount', e.target.value)}
                          placeholder="مبلغ"
                          data-testid={`payment-row-amount-${index}`}
                        />
                      </div>
                      <div>
                        <Label>علت پرداخت <span className="text-red-500">*</span></Label>
                        <Select
                          value={row.reason}
                          onValueChange={(value) => updateRow(index, 'reason', value)}
                        >
                          <SelectTrigger data-testid={`payment-row-reason-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="advance">پیش‌پرداخت</SelectItem>
                            <SelectItem value="on_account">علی‌الحساب</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>توضیحات</Label>
                        <Input
                          value={row.notes}
                          onChange={(e) => updateRow(index, 'notes', e.target.value)}
                          placeholder="توضیحات (اختیاری)"
                          data-testid={`payment-row-notes-${index}`}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Total Amount */}
            <div className="bg-amber-50 p-4 rounded-lg">
              <Label className="text-lg font-bold">مبلغ کل (ریال)</Label>
              <p className="text-3xl font-bold text-amber-700 mt-2" data-testid="total-amount">
                {parseFloat(formData.total_amount || 0).toLocaleString()}
              </p>
            </div>

            {/* Description */}
            <div>
              <Label>توضیحات کلی</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="توضیحات درخواست (اختیاری)"
                className="min-h-[100px]"
                data-testid="payment-description"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-4">
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
