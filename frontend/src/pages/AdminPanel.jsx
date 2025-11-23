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
import { UserPlus, Edit, Trash2, Shield } from 'lucide-react';

const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    roles: []
  });

  useEffect(() => {
    if (!user?.roles?.includes('admin')) {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('خطا در بارگذاری کاربران');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`${API}/users/${editingUser.id}`, formData);
        toast.success('کاربر به‌روزرسانی شد');
      } else {
        await axios.post(`${API}/auth/register`, formData);
        toast.success('کاربر جدید ایجاد شد');
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ username: '', full_name: '', password: '', roles: [] });
      fetchUsers();
    } catch (error) {
      toast.error('خطا در ذخیره کاربر');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('آیا مطمئن هستید؟')) {
      try {
        await axios.delete(`${API}/users/${userId}`);
        toast.success('کاربر حذف شد');
        fetchUsers();
      } catch (error) {
        toast.error('خطا در حذف کاربر');
      }
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      password: '',
      roles: user.roles
    });
    setShowModal(true);
  };

  const toggleRole = (role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const roleLabels = {
    admin: 'مدیر سیستم',
    requester: 'متقاضی',
    procurement: 'واحد تامین',
    financial: 'واحد مالی',
    management: 'مدیریت'
  };

  const allRoles = ['admin', 'requester', 'procurement', 'financial', 'management'];

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="admin-panel">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">پنل مدیریت</h1>
            <p className="text-gray-600 mt-1">مدیریت کاربران و نقش‌ها</p>
          </div>
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-lg"
                onClick={() => {
                  setEditingUser(null);
                  setFormData({ username: '', full_name: '', password: '', roles: ['requester'] });
                }}
                data-testid="add-user-button"
              >
                <UserPlus className="w-5 h-5 ml-2" />
                کاربر جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rtl" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editingUser ? 'ویرایش کاربر' : 'کاربر جدید'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>نام کاربری</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    disabled={!!editingUser}
                    data-testid="user-username-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>نام کامل</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    data-testid="user-fullname-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رمز عبور {editingUser && '(خالی بگذارید برای عدم تغییر)'}</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    data-testid="user-password-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>نقش‌ویی</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {allRoles.map(role => (
                      <label key={role} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.roles.includes(role)}
                          onChange={() => toggleRole(role)}
                          className="w-4 h-4 text-amber-600 rounded"
                          data-testid={`role-${role}-checkbox`}
                        />
                        <span className="text-sm">{roleLabels[role]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" data-testid="save-user-button">
                  ذخیره
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-6 bg-white" data-testid="users-table">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-amber-50 border-b border-amber-200">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">نام کاربری</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">نام کامل</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">نقش‌ها</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-amber-50 transition-colors" data-testid={`user-row-${user.id}`}>
                    <td className="px-6 py-4 text-gray-800">{user.username}</td>
                    <td className="px-6 py-4 text-gray-800">{user.full_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {user.roles.map(role => (
                          <span key={role} className="px-3 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
                            {roleLabels[role]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(user)}
                          className="border-amber-300 text-amber-700 hover:bg-amber-50"
                          data-testid={`edit-user-${user.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(user.id)}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          data-testid={`delete-user-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminPanel;