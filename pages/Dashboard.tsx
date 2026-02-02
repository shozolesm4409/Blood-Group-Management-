
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, DonationRecord, DonationStatus, User } from '../types';
import { getDonations, getUserDonations, getUsers, handleDirectoryAccess, handleSupportAccess, updateDonationStatus } from '../services/api';
import { generateDonationInsight } from '../services/geminiService';
import { Card, Badge, Button } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Droplet, Users, Calendar, TrendingUp, Sparkles, Activity, Trophy, ArrowRight, CheckCircle, BellRing, Clock, ShieldCheck, LifeBuoy, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [d, u] = await Promise.all([
        user?.role === UserRole.ADMIN ? getDonations() : getUserDonations(user?.id || ''),
        getUsers()
      ]);
      setDonations(d);
      setAllUsers(u);
      
      if (user?.role === UserRole.ADMIN || user?.role === UserRole.EDITOR) {
        // Combined Pending Logic: Access + Donations
        const accessReqs = u.filter(usr => usr.directoryAccessRequested || usr.supportAccessRequested)
          .map(usr => ({ ...usr, type: 'ACCESS' }));
        const donationReqs = d.filter(don => don.status === DonationStatus.PENDING)
          .map(don => ({ ...don, type: 'DONATION' }));
        
        setPendingItems([...accessReqs, ...donationReqs]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAction = async (itemId: string, type: string, subType: string, approve: boolean) => {
    if (!user) return;
    try {
      if (type === 'ACCESS') {
        if (subType === 'directory') await handleDirectoryAccess(itemId, approve, user);
        else await handleSupportAccess(itemId, approve, user);
      } else if (type === 'DONATION') {
        await updateDonationStatus(itemId, approve ? DonationStatus.COMPLETED : DonationStatus.REJECTED, user);
      }
      alert(`Request ${approve ? 'Approved' : 'Rejected'} successfully.`);
      fetchData();
    } catch (e) {
      alert("Action failed.");
    }
  };

  const handleGenerateInsight = async () => {
    setInsightLoading(true);
    const res = await generateDonationInsight(donations);
    setInsight(res);
    setInsightLoading(false);
  };

  if (loading) return <div className="p-10 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Initializing Hub...</div>;

  const completedDonations = donations.filter(d => d.status === DonationStatus.COMPLETED);
  const totalUnits = completedDonations.reduce((a, b) => a + b.units, 0);
  
  // Calculate specific donation counts per user
  const donationCounts = completedDonations.reduce((acc, curr) => {
    acc[curr.userId] = (acc[curr.userId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topDonor = [...allUsers].sort((a, b) => (donationCounts[b.id] || 0) - (donationCounts[a.id] || 0))[0];
  const topDonorCount = donationCounts[topDonor?.id] || 0;

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.EDITOR;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-1">Intelligence Hub</h1>
          <p className="text-slate-500 font-medium">Monitoring donor engagement and inventory safety.</p>
        </div>
        <Button onClick={handleGenerateInsight} isLoading={insightLoading} variant="secondary" className="rounded-2xl px-8 shadow-xl">
          <Sparkles className="w-5 h-5 mr-3 text-yellow-400 fill-current" /> AI Analytics
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Volume" value={`${totalUnits}ml`} icon={Droplet} color="text-red-600" bg="bg-red-50" />
        <StatCard title="Active Heroes" value={allUsers.length} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Completed" value={completedDonations.length} icon={CheckCircle} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Scheduled" value={donations.filter(d => d.status === DonationStatus.PENDING).length} icon={Clock} color="text-orange-600" bg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {insight && (
            <Card className="p-8 bg-slate-900 text-white border-0 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Sparkles size={180} />
               </div>
               <div className="relative z-10">
                 <h3 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                   <Sparkles className="text-yellow-400" size={24} /> AI Analysis Report
                 </h3>
                 <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-white/5 p-6 rounded-3xl border border-white/10">
                   {insight}
                 </div>
               </div>
            </Card>
          )}

          <Card className="p-8 border-0 shadow-lg">
            <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-widest">
              <TrendingUp size={24} className="text-red-600" /> Donation Trends
            </h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prepareChartData(donations)}>
                  <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} />
                  <YAxis stroke="#cbd5e1" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontWeight: 'bold' }} />
                  <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={40}>
                    {prepareChartData(donations).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="p-8 bg-[#0F172A] text-white border-0 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-600/20 to-transparent pointer-events-none"></div>
            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
               <Trophy size={200} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-yellow-500/20 rounded-xl text-yellow-500 border border-yellow-500/20">
                  <Trophy size={20} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Top Donor Achievement</h3>
              </div>
              <div className="text-center py-6">
                <div className="relative inline-block mb-6">
                  <div className="w-28 h-28 bg-gradient-to-tr from-slate-800 to-slate-700 rounded-[2.5rem] mx-auto flex items-center justify-center text-4xl font-black border-4 border-slate-800 shadow-2xl group-hover:rotate-6 transition-transform">
                    {topDonor?.avatar ? (
                      <img src={topDonor.avatar} className="w-full h-full object-cover rounded-[2.3rem]" alt="Top" />
                    ) : (
                      topDonor?.name.charAt(0) || '?'
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-slate-900 p-2 rounded-2xl shadow-xl border-4 border-slate-900">
                    <Sparkles size={16} />
                  </div>
                </div>
                <p className="text-2xl font-black tracking-tighter mb-1">{topDonor?.name || 'Searching...'}</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Badge color="red" className="bg-red-500/10 text-red-400 border border-red-500/20">{topDonor?.bloodGroup}</Badge>
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{topDonor?.location}</span>
                </div>
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Times Donated</p>
                   <p className="text-3xl font-black text-yellow-500">{topDonorCount}</p>
                </div>
              </div>
            </div>
          </Card>

          {isAdmin && (
            <Card className="p-8 border-0 shadow-lg bg-white overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest flex items-center gap-3">
                  <BellRing className="text-red-600" size={20} /> Notification Center
                </h3>
                {pendingItems.length > 0 && <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">{pendingItems.length}</span>}
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {pendingItems.map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3 group hover:border-red-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {item.type === 'DONATION' ? (
                          <Droplet className="text-red-600" size={20} />
                        ) : (
                          item.avatar ? <img src={item.avatar} className="w-full h-full object-cover" /> : <Users className="p-2.5 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {item.type === 'DONATION' ? item.userName : item.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge color={item.type === 'DONATION' ? 'red' : 'blue'} className="text-[8px] py-0 px-1.5">
                            {item.type === 'DONATION' ? 'Donation' : (item.directoryAccessRequested ? 'Directory' : 'Support')}
                          </Badge>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{item.type === 'DONATION' ? `${item.units}ml` : item.bloodGroup}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAction(item.id, item.type, item.directoryAccessRequested ? 'directory' : 'support', true)}
                        className="flex-1 bg-white border border-slate-200 p-2 rounded-xl text-green-600 hover:bg-green-600 hover:text-white transition-all flex justify-center shadow-sm"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={() => handleAction(item.id, item.type, item.directoryAccessRequested ? 'directory' : 'support', false)}
                        className="flex-1 bg-white border border-slate-200 p-2 rounded-xl text-red-600 hover:bg-red-600 hover:text-white transition-all flex justify-center shadow-sm"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {pendingItems.length === 0 && (
                  <div className="text-center py-12 flex flex-col items-center opacity-30">
                    <CheckCircle size={48} className="mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest">Everything is clean</p>
                  </div>
                )}
              </div>
              
              <Link to="/notifications" className="w-full flex items-center justify-center gap-3 px-4 py-4 mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Manage All Requests <ArrowRight size={14} />
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (
  <Card className="p-6 border-0 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow cursor-default group">
    <div className={`p-4 rounded-[1.5rem] ${bg} transition-transform group-hover:scale-110 duration-300`}>
      <Icon className={`w-6 h-6 ${color} fill-current`} />
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
      <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
    </div>
  </Card>
);

const prepareChartData = (donations: DonationRecord[]) => {
  const groups: Record<string, number> = {};
  donations.filter(d => d.status === DonationStatus.COMPLETED).forEach(d => {
    groups[d.userBloodGroup] = (groups[d.userBloodGroup] || 0) + 1;
  });
  return Object.entries(groups).map(([name, value]) => ({ name, value }));
};
