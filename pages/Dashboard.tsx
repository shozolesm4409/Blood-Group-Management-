
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, DonationRecord, DonationStatus, User } from '../types';
import { getDonations, getUserDonations, getUsers } from '../services/api';
import { generateDonationInsight } from '../services/geminiService';
import { Card, Badge, Button } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Droplet, Users, Calendar, TrendingUp, Sparkles, Activity, Trophy, ArrowRight, CheckCircle } from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [d, u] = await Promise.all([
          user?.role === UserRole.ADMIN ? getDonations() : getUserDonations(user?.id || ''),
          getUsers()
        ]);
        setDonations(d);
        setAllUsers(u);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleGenerateInsight = async () => {
    setInsightLoading(true);
    const res = await generateDonationInsight(donations);
    setInsight(res);
    setInsightLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading intelligence hub...</div>;

  const totalUnits = donations.filter(d => d.status === DonationStatus.COMPLETED).reduce((a, b) => a + b.units, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 font-medium">Monitoring blood inventory and donor safety.</p>
        </div>
        <Button onClick={handleGenerateInsight} isLoading={insightLoading} variant="secondary">
          <Sparkles className="w-4 h-4 mr-2 text-yellow-400" /> AI Insights
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Volume" value={`${totalUnits}ml`} icon={Droplet} color="text-red-600" bg="bg-red-50" />
        <StatCard title="Active Donors" value={allUsers.length} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Completed" value={donations.filter(d => d.status === DonationStatus.COMPLETED).length} icon={CheckCircle} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Pending" value={donations.filter(d => d.status === DonationStatus.PENDING).length} icon={Calendar} color="text-yellow-600" bg="bg-yellow-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {insight && (
            <Card className="p-6 bg-slate-900 text-white border-0 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Sparkles size={100} />
               </div>
               <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <Sparkles className="text-yellow-400" size={20} /> Gemini Health Analysis
               </h3>
               <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                 {insight}
               </div>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-red-600" /> Donation Trends
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prepareChartData(donations)}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {prepareChartData(donations).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-red-600 to-red-700 text-white border-0 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} className="text-yellow-400" />
              <h3 className="text-xs font-black uppercase tracking-widest">Global Top Donor</h3>
            </div>
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-4 text-3xl font-bold border-4 border-white/30">
                {allUsers[0]?.name.charAt(0) || '?'}
              </div>
              <p className="text-xl font-bold">{allUsers[0]?.name || 'Hero Found'}</p>
              <p className="text-red-100 text-xs font-medium">{allUsers[0]?.location || 'System'}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/20 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase">Level</span>
              <Badge color="yellow">Elite Donor</Badge>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Recent Logs</h3>
            <div className="space-y-4">
              {donations.slice(0, 3).map(d => (
                <div key={d.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                    <Droplet size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{d.userName}</p>
                    <p className="text-[10px] text-slate-500">{new Date(d.donationDate).toLocaleDateString()}</p>
                  </div>
                  <Badge color={d.status === DonationStatus.COMPLETED ? 'green' : 'yellow'}>{d.status}</Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-6 text-xs" onClick={() => {}}>
              View Full History <ArrowRight className="ml-2 w-3 h-3" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (
  <Card className="p-4 border-0 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-xl ${bg}`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  </Card>
);

const prepareChartData = (donations: DonationRecord[]) => {
  const groups: Record<string, number> = {};
  donations.forEach(d => {
    groups[d.userBloodGroup] = (groups[d.userBloodGroup] || 0) + 1;
  });
  return Object.entries(groups).map(([name, value]) => ({ name, value }));
};
