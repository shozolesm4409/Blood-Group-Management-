
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, DonationRecord, DonationStatus, User } from '../types';
import { getDonations, getUsers } from '../services/api';
import { generateDonationInsight } from '../services/geminiService';
import { Card, Badge, Button } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { 
  Droplet, Users, TrendingUp, Sparkles, 
  Activity, ArrowRight, CheckCircle, 
  Target, Crown, Bell
} from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

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
        const [d, u] = await Promise.all([getDonations(), getUsers()]);
        setDonations(d);
        setAllUsers(u);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleGenerateInsight = async () => {
    setInsightLoading(true);
    const res = await generateDonationInsight(donations);
    setInsight(res);
    setInsightLoading(false);
  };

  if (loading) return (
    <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing Data Nodes...</p>
    </div>
  );

  const completedDonations = donations.filter(d => d.status === DonationStatus.COMPLETED);
  const pendingDonations = donations.filter(d => d.status === DonationStatus.PENDING);
  const pendingAccess = allUsers.filter(u => u.directoryAccessRequested || u.supportAccessRequested);
  
  const globalTotalUnits = completedDonations.reduce((a, b) => a + b.units, 0);
  
  // Compact Top Donor Logic
  const donorRankings = completedDonations.reduce((acc, d) => {
    acc[d.userId] = (acc[d.userId] || 0) + d.units;
    return acc;
  }, {} as Record<string, number>);

  const sortedDonorIds = Object.entries(donorRankings).sort((a, b) => b[1] - a[1]);
  const topDonorId = sortedDonorIds[0]?.[0];
  const topDonor = allUsers.find(u => u.id === topDonorId);
  const topDonorVolume = donorRankings[topDonorId || ''] || 0;

  const isAdmin = user?.role === UserRole.ADMIN;
  const hasPendingAlerts = isAdmin && (pendingDonations.length > 0 || pendingAccess.length > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      {/* Admin Alert Banner */}
      {hasPendingAlerts && (
        <div className="bg-red-600 text-white px-5 py-3 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wider">
              Operational Alert: {pendingDonations.length} Pending Records & {pendingAccess.length} Access Requests
            </p>
          </div>
          <Link to="/notifications" className="bg-white text-red-600 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">
            Resolve Tasks
          </Link>
        </div>
      )}

      {/* Premium Hero Section */}
      <div className="relative overflow-hidden rounded-[32px] bg-slate-900 p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-600/10 to-transparent pointer-events-none"></div>
        <div className="relative z-10 max-w-xl">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9] mb-6">
            Unified <span className="text-red-500">Blood</span> <br/>Management Hub.
          </h1>
          <p className="text-slate-400 font-medium text-lg mb-10 max-w-md">
            Advanced biological resource tracking, donor networking, and AI-powered health analytics.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/my-donations">
              <Button variant="danger" className="rounded-2xl px-8 py-4 text-[11px] uppercase font-black tracking-widest shadow-xl shadow-red-900/40">
                Log Donation
              </Button>
            </Link>
            <Button variant="outline" className="rounded-2xl px-8 py-4 text-[11px] uppercase font-black tracking-widest border-white/10 text-white hover:bg-white/5" onClick={handleGenerateInsight} isLoading={insightLoading}>
              <Sparkles className="w-4 h-4 mr-2" /> AI Insights
            </Button>
          </div>
        </div>
        
        {/* COMPACT TOP DONOR WIDGET */}
        {topDonor && (
          <div className="absolute bottom-10 right-10 hidden xl:block animate-in slide-in-from-right-10 duration-700">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[28px] flex items-center gap-4 w-64 shadow-2xl">
               <div className="relative">
                 <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center font-black text-white border border-white/20">
                   {topDonor.name[0]}
                 </div>
                 <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-slate-900 p-1 rounded-lg shadow-lg">
                   <Crown size={12} />
                 </div>
               </div>
               <div className="min-w-0">
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Top Contributor</p>
                 <p className="font-black text-sm text-white truncate">{topDonor.name.split(' ')[0]}</p>
                 <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-red-500">{topDonor.bloodGroup}</span>
                   <span className="text-[10px] font-bold text-emerald-400">{topDonorVolume}ml</span>
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Volume" value={`${globalTotalUnits}ml`} icon={Droplet} color="text-red-500" bg="bg-red-50" />
        <StatCard title="Donors" value={allUsers.length} icon={Users} color="text-blue-500" bg="bg-blue-50" />
        <StatCard title="Completed" value={completedDonations.length} icon={CheckCircle} color="text-emerald-500" bg="bg-emerald-50" />
        <StatCard title="Pending" value={pendingDonations.length} icon={Bell} color="text-amber-500" bg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {insight && (
            <Card className="p-8 bg-slate-900 text-white border-0 shadow-2xl rounded-[32px] font-mono text-xs leading-relaxed text-slate-300">
               <div className="flex items-center gap-3 mb-6">
                  <Activity size={18} className="text-red-500" />
                  <span className="font-black uppercase tracking-widest">Biological Data Report</span>
               </div>
               {insight}
            </Card>
          )}

          <Card className="p-8 border-0 shadow-xl rounded-[32px] bg-white">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <TrendingUp size={24} className="text-red-600" /> Stock Visualization
            </h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prepareChartData(donations)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} fontWeight="900" axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" radius={[10, 10, 2, 2]} barSize={32}>
                    {prepareChartData(donations).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="p-8 border-0 shadow-xl rounded-[32px] bg-white">
            <h3 className="font-black text-slate-900 mb-6 text-[10px] uppercase tracking-[0.25em] flex items-center gap-2">
              <Activity size={14} className="text-red-600" /> Recent Activity
            </h3>
            <div className="space-y-6">
              {completedDonations.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-red-500">
                    <Droplet size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{d.userName}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(d.donationDate).toLocaleDateString()}</p>
                  </div>
                  <Badge color="red" className="text-[8px] font-black">{d.userBloodGroup}</Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-8 rounded-xl text-[9px] font-black uppercase tracking-widest border-slate-100">
              Full Ledger <ArrowRight className="ml-2 w-3 h-3" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (
  <Card className="p-5 border-0 shadow-lg rounded-[24px] bg-white hover:scale-[1.02] transition-transform">
    <div className="flex items-center gap-4">
      <div className={clsx("p-3.5 rounded-2xl", bg)}>
        <Icon className={clsx("w-5 h-5", color)} />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
        <p className="text-xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
    </div>
  </Card>
);

const prepareChartData = (donations: DonationRecord[]) => {
  const groups: Record<string, number> = {};
  donations.filter(d => d.status === DonationStatus.COMPLETED).forEach(d => {
    groups[d.userBloodGroup] = (groups[d.userBloodGroup] || 0) + d.units;
  });
  return Object.entries(groups).map(([name, value]) => ({ name, value }));
};
