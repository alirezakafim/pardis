import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search, Eye, Plus, Lightbulb } from 'lucide-react';

const ProjectProposalList = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [filteredProposals, setFilteredProposals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
  }, []);

  useEffect(() => {
    filterProposals();
  }, [searchTerm, proposals]);

  const fetchProposals = async () => {
    try {
      const response = await axios.get(`${API}/project-proposals`);
      setProposals(response.data);
      setFilteredProposals(response.data);
    } catch (error) {
      toast.error('خطا در بارگذاری پیشنهادات');
    } finally {
      setLoading(false);
    }
  };

  const filterProposals = () => {
    if (!searchTerm) {
      setFilteredProposals(proposals);
      return;
    }
    const filtered = proposals.filter(prop =>
      prop.proposal_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.proposer_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProposals(filtered);
  };

  const statusConfig = {
    'draft': { label: 'پیش‌نویس', color: 'bg-gray-100 text-gray-800' },
    'pending_coo': { label: 'در انتظار مدیر ارشد', color: 'bg-blue-100 text-blue-800' },
    'rejected_by_coo': { label: 'رد شده', color: 'bg-red-100 text-red-800' },
    'pending_dev_manager': { label: 'در انتظار مدیر توسعه', color: 'bg-purple-100 text-purple-800' },
    'pending_project_control': { label: 'در انتظار کنترل پروژه', color: 'bg-yellow-100 text-yellow-800' },
    'registered': { label: 'ثبت شده', color: 'bg-cyan-100 text-cyan-800' },
    'completed': { label: 'تکمیل شده', color: 'bg-green-100 text-green-800' }
  };

  const projectTypes = {
    'civil': 'عمرانی',
    'industrial': 'صنعتی',
    'economic': 'اقتصادی',
    'service': 'خدماتی',
    'organizational': 'سازمانی'
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-600">در حال بارگذاری...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="proposal-list">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-amber-600" />
              پیشنهادات پروژه
            </h1>
            <p className="text-gray-600 mt-1">مدیریت و پیگیری پیشنهادات پروژه</p>
          </div>
          <Button
            onClick={() => navigate('/proposals/new')}
            className="bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-lg"
            data-testid="new-proposal-button"
          >
            <Plus className="w-5 h-5 ml-2" />
            پیشنهاد جدید
          </Button>
        </div>

        <Card className="p-6 bg-white">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="جستجو بر اساس شناسه، عنوان یا پیشنهاددهنده..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-gray-50 border-gray-300"
                data-testid="search-input"
              />
            </div>
          </div>

          {filteredProposals.length === 0 ? (
            <div className="text-center py-12 text-gray-500" data-testid="no-proposals">
              <Lightbulb className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">پیشنهادی یافت نشد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="proposals-table">
                <thead className="bg-amber-50 border-b border-amber-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">شناسه</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">عنوان پروژه</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">نوع پروژه</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">پیشنهاددهنده</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">کد پروژه</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">وضعیت</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProposals.map(proposal => (
                    <tr
                      key={proposal.id}
                      className="border-b border-gray-100 hover:bg-amber-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/proposals/${proposal.id}`)}
                      data-testid={`proposal-row-${proposal.id}`}
                    >
                      <td className="px-6 py-4 text-gray-800 font-medium">{proposal.proposal_number}</td>
                      <td className="px-6 py-4 text-gray-800">{proposal.title}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{projectTypes[proposal.project_type]}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{proposal.proposer_name}</td>
                      <td className="px-6 py-4 text-gray-800 font-medium">{proposal.project_code || '-'}</td>
                      <td className="px-6 py-4">
                        <Badge className={`${statusConfig[proposal.status]?.color} border font-medium`}>
                          {statusConfig[proposal.status]?.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/proposals/${proposal.id}`)}
                          className="border-amber-300 text-amber-700 hover:bg-amber-50"
                          data-testid={`view-proposal-${proposal.id}`}
                        >
                          <Eye className="w-4 h-4 ml-1" />
                          مشاهده
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default ProjectProposalList;