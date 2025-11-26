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
import { Lightbulb, Upload } from 'lucide-react';

const CreateProposal = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    objective: '',
    project_type: '',
    description: '',
    documents: []
  });

  const projectTypes = [
    { value: 'civil', label: 'عمرانی' },
    { value: 'industrial', label: 'صنعتی' },
    { value: 'economic', label: 'اقتصادی' },
    { value: 'service', label: 'خدماتی' },
    { value: 'organizational', label: 'سازمانی' }
  ];

  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          documents: [...prev.documents, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/project-proposals`, formData);
      toast.success(`پیشنهاد با شناسه ${response.data.proposal_number} ایجاد شد`);
      
      const shouldSubmit = window.confirm('آیا می‌خواهید این پیشنهاد را بلافاصله ارسال کنید؟');
      
      if (shouldSubmit) {
        await axios.post(`${API}/project-proposals/${response.data.proposal_id}/submit`);
        toast.success('پیشنهاد ارسال شد');
      }
      
      navigate('/proposals');
    } catch (error) {
      toast.error('خطا در ایجاد پیشنهاد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-fade-in" data-testid="create-proposal-form">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Lightbulb className="w-8 h-8 text-amber-600" />
            پیشنهاد پروژه جدید
          </h1>
          <p className="text-gray-600 mt-2">فرم پیشنهاد پروژه</p>
        </div>

        <Card className="p-8 bg-white shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-700 font-medium">
                عنوان پروژه <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                placeholder="عنوان پروژه را وارد کنید"
                data-testid="title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective" className="text-gray-700 font-medium">
                هدف و ضرورت اجرا <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="objective"
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                required
                className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 min-h-[120px]"
                placeholder="هدف و ضرورت اجرای پروژه را توضیح دهید"
                data-testid="objective-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_type" className="text-gray-700 font-medium">
                نوع پروژه <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.project_type}
                onValueChange={(value) => setFormData({ ...formData, project_type: value })}
                required
              >
                <SelectTrigger className="bg-white border-gray-300" data-testid="project-type-select">
                  <SelectValue placeholder="انتخاب نوع پروژه" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {projectTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-700 font-medium">
                توضیحات تکمیلی (اختیاری)
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 min-h-[100px]"
                placeholder="توضیحات تکمیلی در مورد پروژه"
                data-testid="description-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documents" className="text-gray-700 font-medium">
                مستندات (اختیاری)
              </Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors border-2 border-dashed border-amber-300">
                  <Upload className="w-5 h-5" />
                  <span>انتخاب فایل</span>
                  <input
                    id="documents"
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleDocumentUpload}
                    className="hidden"
                    data-testid="documents-upload"
                  />
                </label>
                {formData.documents.length > 0 && (
                  <span className="text-sm text-green-600 font-medium">✓ {formData.documents.length} فایل انتخاب شد</span>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold py-6 shadow-lg"
                data-testid="submit-proposal-button"
              >
                {loading ? 'در حال ذخیره...' : 'ثبت پیشنهاد'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/proposals')}
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

export default CreateProposal;