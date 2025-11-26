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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Lightbulb, CheckCircle, XCircle, User, Clock } from 'lucide-react';

const ProposalDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCOOModal, setShowCOOModal] = useState(false);
  const [showDevManagerModal, setShowDevManagerModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [coo Review, setCOOReview] = useState({ is_aligned: true, notes: '' });
  const [assignment, setAssignment] = useState({ feasibility_manager_id: '', feasibility_manager_name: '', notes: '' });
  const [registration, setRegistration] = useState({ project_code: '', project_start_date: '', notes: '' });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchProposal();
    fetchUsers();
  }, [id]);

  const fetchProposal = async () => {
    try {
      const response = await axios.get(`${API}/project-proposals/${id}`);
      setProposal(response.data);
    } catch (error) {
      toast.error('خطا در بارگذاری پیشنهاد');
      navigate('/proposals');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users', error);
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post(`${API}/project-proposals/${id}/submit`);
      toast.success('پیشنهاد ارسال شد');
      fetchProposal();
    } catch (error) {
      toast.error('خطا در ارسال پیشنهاد');
    }
  };

  const handleCOOReview = async () => {
    try {
      await axios.post(`${API}/project-proposals/${id}/coo-review`, cooReview);
      toast.success(cooReview.is_aligned ? 'پیشنهاد تایید شد' : 'پیشنهاد رد شد');
      setShowCOOModal(false);
      fetchProposal();
    } catch (error) {
      toast.error('خطا در ثبت نظر');
    }
  };

  const handleAssignManager = async () => {
    try {
      await axios.post(`${API}/project-proposals/${id}/assign-manager`, assignment);
      toast.success('مسئول امکان‌سنجی تعیین شد');
      setShowDevManagerModal(false);
      fetchProposal();
    } catch (error) {
      toast.error('خطا در تعیین مسئول');
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post(`${API}/project-proposals/${id}/register`, registration);
      toast.success('پروژه ثبت شد');
      setShowRegisterModal(false);
      fetchProposal();
    } catch (error) {
      toast.error('خطا در ثبت پروژه');
    }
  };

  const statusConfig = {
    'draft': { label: 'پیش‌نویس', color: 'bg-gray-100 text-gray-800', icon: Clock },
    'pending_coo': { label: 'در انتظار مدیر ارشد', color: 'bg-blue-100 text-blue-800', icon: User },
    'rejected_by_coo': { label: 'رد شده', color: 'bg-red-100 text-red-800', icon: XCircle },
    'pending_dev_manager': { label: 'در انتظار مدیر توسعه', color: 'bg-purple-100 text-purple-800', icon: User },
    'pending_project_control': { label: 'در انتظار کنترل پروژه', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    'registered': { label: 'ثبت شده', color: 'bg-cyan-100 text-cyan-800', icon: CheckCircle },
    'completed': { label: 'تکمیل شده', color: 'bg-green-100 text-green-800', icon: CheckCircle }
  };

  const projectTypes = {
    'civil': 'عمرانی',
    'industrial': 'صنعتی',
    'economic': 'اقتصادی',
    'service': 'خدماتی',
    'organizational': 'سازمانی'
  };

  const canSubmit = proposal?.status === 'draft' && proposal?.proposer_id === user?.user_id;
  const canCOOReview = proposal?.status === 'pending_coo' && user?.roles?.includes('coo');
  const canAssignManager = proposal?.status === 'pending_dev_manager' && user?.roles?.includes('dev_manager');
  const canRegister = proposal?.status === 'pending_project_control' && user?.roles?.includes('project_control');

  if (loading) {
    return <Layout><div className=\"text-center py-12\">در حال بارگذاری...</div></Layout>;
  }

  if (!proposal) {
    return <Layout><div className=\"text-center py-12\">پیشنهاد یافت نشد</div></Layout>;
  }

  const StatusIcon = statusConfig[proposal.status]?.icon || Clock;

  return (
    <Layout>
      <div className=\"max-w-5xl mx-auto space-y-6 animate-fade-in\" data-testid=\"proposal-detail\">
        <div className=\"flex justify-between items-start\">
          <div>
            <h1 className=\"text-3xl font-bold text-gray-800 flex items-center gap-3\">
              <Lightbulb className=\"w-8 h-8 text-amber-600\" />
              جزئیات پیشنهاد {proposal.proposal_number}
            </h1>
            <div className=\"flex items-center gap-3 mt-3\">
              <Badge className={`${statusConfig[proposal.status]?.color} text-base px-4 py-1 flex items-center gap-2`}>
                <StatusIcon className=\"w-4 h-4\" />
                {statusConfig[proposal.status]?.label}
              </Badge>
              {proposal.project_code && (
                <Badge className=\"bg-cyan-600 text-white text-base px-4 py-1\">
                  کد: {proposal.project_code}
                </Badge>
              )}
            </div>
          </div>
          <div className=\"flex gap-2\">
            {canSubmit && (
              <Button onClick={handleSubmit} className=\"bg-amber-600 hover:bg-amber-700\" data-testid=\"submit-proposal-btn\">
                ارسال پیشنهاد
              </Button>
            )}
            {canCOOReview && (
              <Button onClick={() => setShowCOOModal(true)} className=\"bg-blue-600 hover:bg-blue-700\" data-testid=\"coo-review-btn\">
                بررسی هم‌راستایی
              </Button>
            )}
            {canAssignManager && (
              <Button onClick={() => setShowDevManagerModal(true)} className=\"bg-purple-600 hover:bg-purple-700\" data-testid=\"assign-manager-btn\">
                تعیین مسئول امکان‌سنجی
              </Button>
            )}
            {canRegister && (
              <Button onClick={() => setShowRegisterModal(true)} className=\"bg-green-600 hover:bg-green-700\" data-testid=\"register-btn\">
                ثبت پروژه
              </Button>
            )}
          </div>
        </div>

        <Card className=\"p-6 bg-white\">
          <h2 className=\"text-xl font-bold text-gray-800 mb-4\">اطلاعات پیشنهاد</h2>
          <div className=\"grid grid-cols-2 gap-4\">
            <div>
              <p className=\"text-sm text-gray-600\">عنوان پروژه</p>
              <p className=\"text-lg font-medium text-gray-800\">{proposal.title}</p>
            </div>
            <div>
              <p className=\"text-sm text-gray-600\">نوع پروژه</p>
              <p className=\"text-lg font-medium text-gray-800\">{projectTypes[proposal.project_type]}</p>
            </div>
            <div className=\"col-span-2\">
              <p className=\"text-sm text-gray-600\">هدف و ضرورت اجرا</p>
              <p className=\"text-gray-800\">{proposal.objective}</p>
            </div>
            {proposal.description && (
              <div className=\"col-span-2\">
                <p className=\"text-sm text-gray-600\">توضیحات تکمیلی</p>
                <p className=\"text-gray-800\">{proposal.description}</p>
              </div>
            )}
            <div>
              <p className=\"text-sm text-gray-600\">پیشنهاددهنده</p>
              <p className=\"text-lg font-medium text-gray-800\">{proposal.proposer_name}</p>
            </div>
          </div>
        </Card>

        {proposal.is_aligned !== null && (
          <Card className=\"p-6 bg-white\">
            <h2 className=\"text-xl font-bold text-gray-800 mb-4\">بررسی مدیر ارشد عملیات</h2>
            <div className=\"space-y-2\">
              <p className=\"text-sm text-gray-600\">
                وضعیت: <span className={`font-bold ${proposal.is_aligned ? 'text-green-600' : 'text-red-600'}`}>
                  {proposal.is_aligned ? 'هم‌راستا با اهداف سازمان' : 'هم‌راستا نمی‌باشد'}
                </span>
              </p>
              {proposal.coo_notes && <p className=\"text-gray-800\">توضیحات: {proposal.coo_notes}</p>}
            </div>
          </Card>
        )}

        {proposal.feasibility_manager_name && (
          <Card className=\"p-6 bg-white\">
            <h2 className=\"text-xl font-bold text-gray-800 mb-4\">مسئول امکان‌سنجی</h2>
            <p className=\"text-lg text-gray-800\">{proposal.feasibility_manager_name}</p>
            {proposal.dev_manager_notes && <p className=\"text-sm text-gray-600 mt-2\">{proposal.dev_manager_notes}</p>}
          </Card>
        )}

        {proposal.project_code && (
          <Card className=\"p-6 bg-white\">
            <h2 className=\"text-xl font-bold text-gray-800 mb-4\">اطلاعات ثبت پروژه</h2>
            <div className=\"grid grid-cols-2 gap-4\">
              <div>
                <p className=\"text-sm text-gray-600\">کد پروژه</p>
                <p className=\"text-lg font-bold text-gray-800\">{proposal.project_code}</p>
              </div>
              {proposal.project_start_date && (
                <div>
                  <p className=\"text-sm text-gray-600\">تاریخ شروع</p>
                  <p className=\"text-lg text-gray-800\">{new Date(proposal.project_start_date).toLocaleDateString('fa-IR')}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card className=\"p-6 bg-white\">
          <h2 className=\"text-xl font-bold text-gray-800 mb-4\">تاریخچه</h2>
          <div className=\"space-y-4\">
            {proposal.history?.map((hist, index) => (
              <div key={index} className=\"flex gap-4 pb-4 border-b border-gray-100 last:border-0\">
                <div className=\"flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center\">
                  <User className=\"w-5 h-5 text-amber-600\" />
                </div>
                <div className=\"flex-1\">
                  <div className=\"flex justify-between items-start\">
                    <div>
                      <p className=\"font-medium text-gray-800\">{hist.actor_name}</p>
                      <p className=\"text-sm text-gray-600\">{hist.action}</p>
                      {hist.notes && <p className=\"text-sm text-gray-700 mt-1\">{hist.notes}</p>}
                    </div>
                    <p className=\"text-xs text-gray-500\">{new Date(hist.timestamp).toLocaleString('fa-IR')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* COO Review Modal */}
        <Dialog open={showCOOModal} onOpenChange={setShowCOOModal}>
          <DialogContent className=\"rtl\" dir=\"rtl\">
            <DialogHeader>
              <DialogTitle>بررسی هم‌راستایی با اهداف سازمان</DialogTitle>
            </DialogHeader>
            <div className=\"space-y-4\">
              <div className=\"flex gap-4\">
                <Button 
                  onClick={() => setCOOReview({...cooReview, is_aligned: true})}
                  className={cooReview.is_aligned ? 'flex-1 bg-green-600' : 'flex-1'}
                  variant={cooReview.is_aligned ? 'default' : 'outline'}
                >
                  هم‌راستا می‌باشد
                </Button>
                <Button 
                  onClick={() => setCOOReview({...cooReview, is_aligned: false})}
                  className={!cooReview.is_aligned ? 'flex-1 bg-red-600' : 'flex-1'}
                  variant={!cooReview.is_aligned ? 'default' : 'outline'}
                >
                  هم‌راستا نمی‌باشد
                </Button>
              </div>
              <div>
                <Label>توضیحات (اختیاری)</Label>
                <Textarea
                  value={cooReview.notes}
                  onChange={(e) => setCOOReview({...cooReview, notes: e.target.value})}
                  className=\"min-h-[100px]\"
                />
              </div>
              <Button onClick={handleCOOReview} className=\"w-full bg-amber-600 hover:bg-amber-700\">
                ثبت نظر
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dev Manager Modal */}
        <Dialog open={showDevManagerModal} onOpenChange={setShowDevManagerModal}>
          <DialogContent className=\"rtl\" dir=\"rtl\">
            <DialogHeader>
              <DialogTitle>تعیین مسئول امکان‌سنجی</DialogTitle>
            </DialogHeader>
            <div className=\"space-y-4\">
              <div>
                <Label>انتخاب مسئول</Label>
                <Select
                  value={assignment.feasibility_manager_id}
                  onValueChange={(value) => {
                    const selectedUser = users.find(u => u.id === value);
                    setAssignment({
                      ...assignment,
                      feasibility_manager_id: value,
                      feasibility_manager_name: selectedUser?.full_name || ''
                    });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder=\"انتخاب کاربر\" /></SelectTrigger>
                  <SelectContent dir=\"rtl\">
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>توضیحات (اختیاری)</Label>
                <Textarea
                  value={assignment.notes}
                  onChange={(e) => setAssignment({...assignment, notes: e.target.value})}
                />
              </div>
              <Button onClick={handleAssignManager} className=\"w-full bg-amber-600 hover:bg-amber-700\">
                تعیین مسئول
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Register Project Modal */}
        <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
          <DialogContent className=\"rtl\" dir=\"rtl\">
            <DialogHeader>
              <DialogTitle>ثبت رسمی پروژه</DialogTitle>
            </DialogHeader>
            <div className=\"space-y-4\">
              <div>
                <Label>کد پروژه</Label>
                <Input
                  value={registration.project_code}
                  onChange={(e) => setRegistration({...registration, project_code: e.target.value})}
                  placeholder=\"PRJ-2024-001\"
                />
              </div>
              <div>
                <Label>تاریخ شروع</Label>
                <Input
                  type=\"date\"
                  value={registration.project_start_date}
                  onChange={(e) => setRegistration({...registration, project_start_date: e.target.value})}
                />
              </div>
              <div>
                <Label>توضیحات (اختیاری)</Label>
                <Textarea
                  value={registration.notes}
                  onChange={(e) => setRegistration({...registration, notes: e.target.value})}
                />
              </div>
              <Button onClick={handleRegister} className=\"w-full bg-green-600 hover:bg-green-700\">
                ثبت پروژه
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ProposalDetail;
