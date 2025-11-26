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
  const [cooReview, setCOOReview] = useState({ is_aligned: true, notes: '' });
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
      toast.error('خطا در بارگذاری');
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
      console.error('Error', error);
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post(`${API}/project-proposals/${id}/submit`);
      toast.success('ارسال شد');
      fetchProposal();
    } catch (error) {
      toast.error('خطا');
    }
  };

  const handleCOOReview = async () => {
    try {
      await axios.post(`${API}/project-proposals/${id}/coo-review`, cooReview);
      toast.success(cooReview.is_aligned ? 'تایید شد' : 'رد شد');
      setShowCOOModal(false);
      fetchProposal();
    } catch (error) {
      toast.error('خطا');
    }
  };

  const handleAssignManager = async () => {
    try {
      await axios.post(`${API}/project-proposals/${id}/assign-manager`, assignment);
      toast.success('ثبت شد');
      setShowDevManagerModal(false);
      fetchProposal();
    } catch (error) {
      toast.error('خطا');
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post(`${API}/project-proposals/${id}/register`, registration);
      toast.success('ثبت شد');
      setShowRegisterModal(false);
      fetchProposal();
    } catch (error) {
      toast.error('خطا');
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
    return <Layout><div className="text-center py-12">Loading...</div></Layout>;
  }

  if (!proposal) {
    return <Layout><div className="text-center py-12">Not found</div></Layout>;
  }

  const StatusIcon = statusConfig[proposal.status]?.icon || Clock;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6" data-testid="proposal-detail">
        <Card className="p-6 bg-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-amber-600" />
                {proposal.proposal_number}
              </h1>
              <Badge className={`${statusConfig[proposal.status]?.color} mt-2`}>
                <StatusIcon className="w-4 h-4 mr-1" />
                {statusConfig[proposal.status]?.label}
              </Badge>
            </div>
            <div className="flex gap-2">
              {canSubmit && <Button onClick={handleSubmit}>ارسال</Button>}
              {canCOOReview && <Button onClick={() => setShowCOOModal(true)}>بررسی</Button>}
              {canAssignManager && <Button onClick={() => setShowDevManagerModal(true)}>تعیین مسئول</Button>}
              {canRegister && <Button onClick={() => setShowRegisterModal(true)}>ثبت</Button>}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">عنوان</p>
              <p className="font-medium">{proposal.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">نوع</p>
              <p>{projectTypes[proposal.project_type]}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">هدف</p>
              <p>{proposal.objective}</p>
            </div>
            {proposal.project_code && (
              <div>
                <p className="text-sm text-gray-600">کد پروژه</p>
                <p className="font-bold">{proposal.project_code}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Modals */}
        <Dialog open={showCOOModal} onOpenChange={setShowCOOModal}>
          <DialogContent className="rtl" dir="rtl">
            <DialogHeader><DialogTitle>بررسی</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => setCOOReview({...cooReview, is_aligned: true})} className="flex-1">تایید</Button>
                <Button onClick={() => setCOOReview({...cooReview, is_aligned: false})} variant="outline" className="flex-1">رد</Button>
              </div>
              <Textarea value={cooReview.notes} onChange={(e) => setCOOReview({...cooReview, notes: e.target.value})} />
              <Button onClick={handleCOOReview} className="w-full">ثبت</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showDevManagerModal} onOpenChange={setShowDevManagerModal}>
          <DialogContent className="rtl" dir="rtl">
            <DialogHeader><DialogTitle>تعیین مسئول</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={assignment.feasibility_manager_id} onValueChange={(v) => {
                const u = users.find(x => x.id === v);
                setAssignment({...assignment, feasibility_manager_id: v, feasibility_manager_name: u?.full_name || ''});
              }}>
                <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                <SelectContent dir="rtl">
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleAssignManager} className="w-full">ثبت</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
          <DialogContent className="rtl" dir="rtl">
            <DialogHeader><DialogTitle>ثبت پروژه</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="کد پروژه" value={registration.project_code} onChange={(e) => setRegistration({...registration, project_code: e.target.value})} />
              <Input type="date" value={registration.project_start_date} onChange={(e) => setRegistration({...registration, project_start_date: e.target.value})} />
              <Button onClick={handleRegister} className="w-full">ثبت</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ProposalDetail;
