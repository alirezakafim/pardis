import React, { useState, useEffect, useContext } from 'react';
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
import { Package, Upload, Calendar } from 'lucide-react';
import DatePicker from '@hassanmojab/react-modern-calendar-datepicker';
import '@hassanmojab/react-modern-calendar-datepicker/lib/DatePicker.css';

const CreateRequest = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [costCenters, setCostCenters] = useState([]);
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: '',
    cost_center: '',
    need_date: '',
    description: '',
    image_base64: ''
  });
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    fetchCostCenters();
  }, []);

  const fetchCostCenters = async () => {
    try {
      const response = await axios.get(`${API}/cost-centers`);
      setCostCenters(response.data);
    } catch (error) {
      toast.error('خطا در بارگذاری مراکز هزینه');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم فایل نباید بیشتر از 5MB باشد');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_base64: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requestData = {
        ...formData,
        quantity: parseInt(formData.quantity),
        need_date: selectedDay ? `${selectedDay.year}/${selectedDay.month}/${selectedDay.day}` : null
      };
      const response = await axios.post(`${API}/goods-requests`, requestData);
      toast.success(`درخواست با شناسه ${response.data.request_number} ایجاد شد`);
      
      // Ask if user wants to submit immediately
      const shouldSubmit = window.confirm('آیا می‌خواهید این درخواست را بلافاصله ارسال کنید؟');
      
      if (shouldSubmit) {
        await axios.post(`${API}/goods-requests/${response.data.request_id}/submit`);
        toast.success('درخواست ارسال شد');
      }
      
      navigate('/requests');
    } catch (error) {
      toast.error('خطا در ایجاد درخواست');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-fade-in" data-testid="create-request-form">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Package className="w-8 h-8 text-amber-600" />
            درخواست جدید کالا
          </h1>
          <p className="text-gray-600 mt-2">فرم درخواست و تامین کالا</p>
        </div>

        <Card className="p-8 bg-white shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="item_name" className="text-gray-700 font-medium">
                نام کالا <span className="text-red-500">*</span>
              </Label>
              <Input
                id="item_name"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                required
                className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                placeholder="نام کالای مورد نیاز را وارد کنید"
                data-testid="item-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-gray-700 font-medium">
                تعداد <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                placeholder="تعداد مورد نیاز"
                data-testid="quantity-input"
              />
            </div>

            <div className="space-y-2 relative z-30">
              <Label htmlFor="cost_center" className="text-gray-700 font-medium">
                مرکز هزینه (واحد) <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.cost_center}
                onValueChange={(value) => setFormData({ ...formData, cost_center: value })}
                required
              >
                <SelectTrigger className="bg-white border-gray-300" data-testid="cost-center-select">
                  <SelectValue placeholder="انتخاب مرکز هزینه" />
                </SelectTrigger>
                <SelectContent dir="rtl" className="z-[100]" position="popper" sideOffset={5}>
                  {costCenters.map(center => (
                    <SelectItem key={center.id} value={center.name}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 relative z-20">
              <Label htmlFor="need_date" className="text-gray-700 font-medium">
                تاریخ ضرورت نیاز <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <DatePicker
                  value={selectedDay}
                  onChange={setSelectedDay}
                  locale="fa"
                  calendarClassName="custom-calendar"
                  inputPlaceholder="انتخاب تاریخ"
                  inputClassName="w-full px-4 py-2 border border-gray-300 rounded-md focus:border-amber-500 focus:ring-amber-500 bg-white"
                  wrapperClassName="w-full"
                  colorPrimary="#d97706"
                  shouldHighlightWeekends
                />
              </div>
            </div>

            <div className="space-y-2 relative z-10">
              <Label htmlFor="description" className="text-gray-700 font-medium">
                توضیحات (اختیاری)
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 min-h-[100px]"
                placeholder="توضیحات تکمیلی درباره کالا"
                data-testid="description-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image" className="text-gray-700 font-medium">
                تصویر (اختیاری)
              </Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors border-2 border-dashed border-amber-300">
                  <Upload className="w-5 h-5" />
                  <span>انتخاب تصویر</span>
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    data-testid="image-upload"
                  />
                </label>
                {formData.image_base64 && (
                  <span className="text-sm text-green-600 font-medium">✓ تصویر انتخاب شد</span>
                )}
              </div>
              {formData.image_base64 && (
                <img src={formData.image_base64} alt="Preview" className="mt-4 max-w-xs rounded-lg border-2 border-gray-200" />
              )}
            </div>

            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold py-6 shadow-lg"
                data-testid="submit-request-button"
              >
                {loading ? 'در حال ذخیره...' : 'ثبت درخواست'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/requests')}
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-6"
                data-testid="cancel-button"
              >
                انصراف
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default CreateRequest;