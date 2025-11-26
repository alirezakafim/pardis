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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Building, Plus, Edit, Trash2 } from 'lucide-react';

const CostCentersManagement = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [centers, setCenters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [formData, setFormData] = useState({ name: '', name_en: '' });

  useEffect(() => {
    if (!user?.roles?.includes('admin')) {
      navigate('/');
      return;
    }
    fetchCenters();
  }, [user, navigate]);

  const fetchCenters = async () => {
    try {
      const response = await axios.get(`${API}/cost-centers`);
      setCenters(response.data);
    } catch (error) {
      toast.error('خطا در بارگذاری مراکز هزینه');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCenter) {
        await axios.put(`${API}/cost-centers/${editingCenter.id}?name=${formData.name}&name_en=${formData.name_en}`);
        toast.success('مرکز هزینه به‌روزرسانی شد');
      } else {
        await axios.post(`${API}/cost-centers`, formData);
        toast.success('مرکز هزینه جدید ایجاد شد');
      }
      setShowModal(false);
      setEditingCenter(null);
      setFormData({ name: '', name_en: '' });
      fetchCenters();
    } catch (error) {
      toast.error('خطا در ذخیره مرکز هزینه');
    }
  };

  const handleDelete = async (centerId) => {
    if (window.confirm('آیا مطمئن هستید؟')) {
      try {
        await axios.delete(`${API}/cost-centers/${centerId}`);
        toast.success('مرکز هزینه حذف شد');
        fetchCenters();
      } catch (error) {
        toast.error('خطا در حذف مرکز هزینه');
      }
    }
  };

  const handleEdit = (center) => {
    setEditingCenter(center);
    setFormData({ name: center.name, name_en: center.name_en });
    setShowModal(true);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="cost-centers-management">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Building className="w-8 h-8 text-amber-600" />
              مدیریت مراکز هزینه
            </h1>
            <p className="text-gray-600 mt-1">افزودن، ویرایش و حذف مراکز هزینه</p>
          </div>
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-lg"
                onClick={() => {
                  setEditingCenter(null);
                  setFormData({ name: '', name_en: '' });
                }}
                data-testid="add-center-button"
              >
                <Plus className="w-5 h-5 ml-2" />
                مرکز هزینه جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rtl" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editingCenter ? 'ویرایش مرکز هزینه' : 'مرکز هزینه جدید'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>نام فارسی</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="center-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>نام انگلیسی</Label>
                  <Input
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    required
                    data-testid="center-name-en-input"
                  />
                </div>
                <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" data-testid="save-center-button">
                  ذخیره
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-6 bg-white" data-testid="centers-table">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {centers.map(center => (
              <Card key={center.id} className="p-4 border-2 border-gray-100 hover:border-amber-300 transition-colors" data-testid={`center-card-${center.id}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="font-bold text-gray-800">{center.name}</h3>
                      <p className="text-sm text-gray-600">{center.name_en}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(center)}
                    className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                    data-testid={`edit-center-${center.id}`}
                  >
                    <Edit className="w-4 h-4 ml-1" />
                    ویرایش
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(center.id)}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    data-testid={`delete-center-${center.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default CostCentersManagement;