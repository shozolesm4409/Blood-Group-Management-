
import React, { useEffect, useState } from 'react';
import { 
  getDonations, 
  getLogs, 
  getUsers, 
  updateDonationStatus, 
  deleteUserRecord, 
  updateUserProfile,
  deleteDonationRecord,
  getDeletedUsers,
  getDeletedDonations,
  handleDirectoryAccess,
  handleSupportAccess,
  deleteLogEntry,
  addDonation,
  adminForceChangePassword,
  updateAppPermissions,
  getAppPermissions,
  ADMIN_EMAIL 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, DonationRecord, DonationStatus, AuditLog, UserRole, BloodGroup, AppPermissions } from '../types';
import { Card, Badge, Button, Input, Select, ConfirmModal } from '../components/UI';
import { 
  Check, X, Plus, Edit2, 
  Trash2, Key, Users as UsersIcon, Activity, Lock, BellRing, Info, Mail, Phone, MapPin, Calendar, Search, Filter, LifeBuoy, MoreVertical, Archive, Droplet, Clock
} from 'lucide-react';
import clsx from 'clsx';

// --- Manage Donations: With Approval and Admin Logging ---
export const ManageDonations = () => {
  const { user: admin } = useAuth();
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [filter, setFilter] = useState<DonationStatus | 'ALL'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => { fetchData(); }, []);

  const handleUpdateStatus = async (id: string, status: DonationStatus) => {
    if (!admin) return;
    try {
      await updateDonationStatus(id, status, admin);
      await fetchData();
    } catch (err) {
      alert("Operation failed.");
    }
  };

  const handleAdminLogDonation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!admin) return;
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const targetUserId = formData.get('userId') as string;
    const targetUser = allUsers.find(u => u.id === targetUserId);

    if (!targetUser) {
      alert("Please select a valid donor.");
      setIsSubmitting(false);
      return;
    }

    try {
      await addDonation({
        userId: targetUser.id,
        userName: targetUser.name,
        userBloodGroup: targetUser.bloodGroup,
        donationDate: new Date().toISOString(),
        location: formData.get('location') as string,
        units: parseInt(formData.get('units') as string) || 450,
        status: DonationStatus.COMPLETED,
        notes: `Admin Log: ${formData.get('notes') as string}`
      }, admin);
      
      setShowLogForm(false);
      await fetchData();
    } catch (err) {
      alert("Failed to log record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = donations.filter(d => filter === 'ALL' || d.status === filter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Biological Ledger</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Audit and log global transfers.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowLogForm(!showLogForm)} variant="secondary" className="rounded-xl px-5 h-11 text-[10px] font-black uppercase tracking-widest">
            <Plus size={16} className="mr-2" /> Log Any Donor
          </Button>
        </div>
      </div>

      {showLogForm && (
        <Card className="p-8 border-2 border-red-50 shadow-2xl rounded-[32px] animate-in slide-in-from-top-4 duration-300">
          <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2">
            <Droplet className="text-red-600" size={20} /> Record New Donation
          </h3>
          <form onSubmit={handleAdminLogDonation} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select label="Donor Selection" name="userId" required>
              <option value="">Select a donor...</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.bloodGroup} - {u.location})</option>
              ))}
            </Select>
            <Input label="Transfer Site" name="location" required placeholder="Hospital Facility Name" />
            <Input label="Volume (ml)" name="units" type="number" defaultValue="450" required />
            <Input label="Internal Notes" name="notes" placeholder="Batch ID or specific info..." />
            <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-slate-50">
              <Button type="button" variant="outline" onClick={() => setShowLogForm(false)}>Cancel</Button>
              <Button type="submit" isLoading={isSubmitting}>Verify & Save</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex p-1 bg-white border border-slate-200 rounded-2xl shadow-sm w-fit">
        {['ALL', ...Object.values(DonationStatus)].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as any)}
            className={clsx(
              "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
              filter === s ? "bg-red-600 text-white shadow-md shadow-red-100" : "text-slate-400 hover:text-slate-900"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map(d => (
          <Card key={d.id} className="p-0 overflow-hidden border-0 shadow-lg group">
            <div className="flex flex-col md:flex-row">
              <div className={clsx(
                "md:w-20 flex items-center justify-center py-4 md:py-0 border-r border-slate-100",
                d.status === DonationStatus.COMPLETED ? "bg-emerald-50 text-emerald-600" : (d.status === DonationStatus.PENDING ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600")
              )}>
                <div className="text-center">
                   <Droplet size={20} className="fill-current mx-auto" />
                   <span className="text-[9px] font-black uppercase mt-1 block">{d.userBloodGroup}</span>
                </div>
              </div>
              <div className="flex-1 p-5 grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Donor Node</p>
                  <p className="font-black text-base text-slate-900 tracking-tight">{d.userName}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Deployment Zone</p>
                  <p className="font-bold text-slate-700 text-xs flex items-center gap-1.5"><MapPin size={12}/> {d.location}</p>
                </div>
                <div className="flex flex-col md:items-end gap-2">
                  {d.status === DonationStatus.PENDING ? (
                    <div className="flex gap-2">
                      <Button 
                        className="bg-emerald-600 text-white text-[8px] uppercase px-3 h-8 font-black"
                        onClick={() => handleUpdateStatus(d.id, DonationStatus.COMPLETED)}
                      >
                        Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        className="text-red-600 border-red-50 text-[8px] uppercase px-3 h-8 font-black"
                        onClick={() => handleUpdateStatus(d.id, DonationStatus.REJECTED)}
                      >
                        Void
                      </Button>
                    </div>
                  ) : (
                    <Badge color={d.status === DonationStatus.COMPLETED ? 'green' : 'red'} className="text-[8px] font-black tracking-widest uppercase">{d.status}</Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// --- User Management: Roles, Passwords, and Controls ---
export const UserManagement = () => {
  const { user: admin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const u = await getUsers();
      setUsers(u);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    if (!admin) return;
    await updateUserProfile(userId, { role }, admin);
    fetchUsers();
  };

  const handleResetPass = async (userId: string) => {
    if (!admin) return;
    if (confirm("Reset password for this user? This will log a reset request.")) {
      await adminForceChangePassword(userId, 'Reset123', admin);
      alert("Password reset request recorded for user.");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!admin || !confirm("Archive this user? This will remove them from the active list.")) return;
    await deleteUserRecord(userId, admin);
    fetchUsers();
  };

  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.bloodGroup.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">User Directory</h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Manage global access and roles.</p>
          </div>
          <div className="relative w-full md:w-72">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
               value={search} 
               onChange={e => setSearch(e.target.value)} 
               placeholder="Search nodes..." 
               className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-500 transition-all" 
             />
          </div>
       </div>

       <div className="grid grid-cols-1 gap-4">
          {filtered.map(u => (
            <Card key={u.id} className="p-6 border-0 shadow-lg group">
               <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 flex-1">
                     <div className="w-14 h-14 rounded-2xl bg-slate-50 border flex items-center justify-center font-black text-slate-300 overflow-hidden group-hover:scale-105 transition-transform">
                        {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : u.name[0]}
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                           <p className="font-black text-slate-900 tracking-tight">{u.name}</p>
                           <Badge color="blue" className="text-[8px] tracking-widest">{u.bloodGroup}</Badge>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{u.email} • {u.phone}</p>
                     </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 md:gap-8">
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Authorization</span>
                        <Select 
                          value={u.role} 
                          onChange={e => handleRoleChange(u.id, e.target.value as UserRole)} 
                          className="w-32 py-1.5 h-auto text-[10px] font-black rounded-xl"
                        >
                           <option value={UserRole.USER}>User</option>
                           <option value={UserRole.EDITOR}>Editor</option>
                           <option value={UserRole.ADMIN}>Admin</option>
                        </Select>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => handleResetPass(u.id)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Reset Credentials"><Key size={18}/></button>
                        <button onClick={() => handleDelete(u.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Archive User"><Trash2 size={18}/></button>
                     </div>
                  </div>
               </div>
            </Card>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="py-20 text-center font-black text-[10px] text-slate-300 uppercase tracking-[0.3em]">No Users Found</div>
          )}
       </div>
    </div>
  );
};

// --- System Logs: Audit Trail ---
export const SystemLogs = () => {
  const { user: admin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const l = await getLogs();
      setLogs(l);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleDeleteLog = async (id: string) => {
    if (!admin) return;
    await deleteLogEntry(id, admin);
    fetchLogs();
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">System Audit</h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Global activity monitoring.</p>
          </div>
          <Activity className="text-red-600" size={32} />
       </div>
       <Card className="overflow-hidden border-0 shadow-2xl bg-white rounded-[32px]">
          <div className="overflow-x-auto custom-scrollbar">
             <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] border-b">
                   <tr>
                      <th className="px-8 py-5">Date & Time</th>
                      <th className="px-8 py-5">Activity</th>
                      <th className="px-8 py-5">Operator</th>
                      <th className="px-8 py-5">Metadata</th>
                      <th className="px-8 py-5 text-right">Action</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                   {logs.map(log => (
                     <tr key={log.id} className="hover:bg-slate-50 transition-all">
                        <td className="px-8 py-5 text-slate-400 whitespace-nowrap text-xs font-bold">
                           <div className="flex items-center gap-2">
                              <Clock size={12} />
                              {new Date(log.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <Badge color="blue" className="text-[9px] tracking-widest">{log.action}</Badge>
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900">{log.userName}</span>
                           </div>
                        </td>
                        <td className="px-8 py-5 text-slate-500 text-xs">{log.details}</td>
                        <td className="px-8 py-5 text-right">
                           <button onClick={() => handleDeleteLog(log.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><X size={16}/></button>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
             {logs.length === 0 && !loading && (
               <div className="py-20 text-center font-black text-[10px] text-slate-300 uppercase tracking-widest">No Logs Recorded</div>
             )}
          </div>
       </Card>
    </div>
  );
};

// --- Deleted Records: Archive View ---
export const DeletedRecords = () => {
  const [dUsers, setDUsers] = useState<any[]>([]);
  const [dDonations, setDDonations] = useState<any[]>([]);

  useEffect(() => {
    getDeletedUsers().then(setDUsers);
    getDeletedDonations().then(setDDonations);
  }, []);

  return (
    <div className="space-y-12">
       <section className="space-y-6">
          <div className="flex items-center gap-3">
             <Archive className="text-slate-400" size={24} />
             <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Archived Users</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {dUsers.map(u => (
               <Card key={u.id} className="p-6 border-slate-200 shadow-lg grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all border-l-4 border-l-slate-400">
                  <p className="font-black text-slate-900 text-lg">{u.name}</p>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">
                     Removed by {u.deletedBy} on {new Date(u.deletedAt).toLocaleDateString()}
                  </p>
               </Card>
             ))}
             {dUsers.length === 0 && <p className="col-span-full py-10 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">No user archives</p>}
          </div>
       </section>

       <section className="space-y-6">
          <div className="flex items-center gap-3">
             <Droplet className="text-slate-400" size={24} />
             <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Voided Transfers</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {dDonations.map(d => (
               <Card key={d.id} className="p-6 border-slate-200 shadow-lg grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all border-l-4 border-l-red-200">
                  <p className="font-black text-slate-900 text-lg">{d.userName}</p>
                  <p className="font-bold text-red-600 text-sm mt-1">{d.units}ml • {d.userBloodGroup}</p>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-4">
                     Voided on {new Date(d.deletedAt).toLocaleDateString()}
                  </p>
               </Card>
             ))}
             {dDonations.length === 0 && <p className="col-span-full py-10 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">No transfer archives</p>}
          </div>
       </section>
    </div>
  );
};

// --- Notifications Center (Tasks) ---
export const DirectoryPermissions = () => {
  const { user: admin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);

  const fetchData = async () => {
    setUsers(await getUsers());
    setDonations(await getDonations());
  };
  useEffect(() => { fetchData(); }, []);

  const handleAccessAction = async (userId: string, type: 'dir' | 'supp', approved: boolean) => {
    if (!admin) return;
    if (type === 'dir') await handleDirectoryAccess(userId, approved, admin);
    else await handleSupportAccess(userId, approved, admin);
    fetchData();
  };

  const pendingAccess = users.filter(u => u.directoryAccessRequested || u.supportAccessRequested);
  const pendingDonations = donations.filter(d => d.status === DonationStatus.PENDING);

  return (
    <div className="space-y-8">
       <div className="flex items-center gap-4">
          <div className="p-5 bg-red-600 text-white rounded-[24px] shadow-xl shadow-red-100">
             <BellRing className="animate-bounce" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Tasks Center</h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Pending approvals and clearances.</p>
          </div>
       </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="space-y-4">
             <h3 className="font-black text-[10px] text-red-600 uppercase tracking-widest flex items-center gap-2 border-b border-red-50 pb-3"><Droplet size={14}/> Transfer Requests</h3>
             {pendingDonations.map(d => (
               <Card key={d.id} className="p-6 border-l-4 border-amber-500 shadow-xl bg-white animate-in zoom-in-95">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <p className="font-black text-slate-900 text-lg tracking-tight">{d.userName}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{d.location}</p>
                     </div>
                     <Badge color="red" className="font-black px-3 py-1">{d.userBloodGroup}</Badge>
                  </div>
                  <div className="flex gap-2">
                     <Button className="flex-1 bg-emerald-600 h-10 text-[9px] font-black tracking-widest uppercase" onClick={() => updateDonationStatus(d.id, DonationStatus.COMPLETED, admin!).then(fetchData)}>Approve</Button>
                     <Button variant="outline" className="flex-1 h-10 text-[9px] font-black tracking-widest text-slate-400 uppercase" onClick={() => updateDonationStatus(d.id, DonationStatus.REJECTED, admin!).then(fetchData)}>Void</Button>
                  </div>
               </Card>
             ))}
             {pendingDonations.length === 0 && <p className="text-center py-16 text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">No Pending Transfers</p>}
          </section>

          <section className="space-y-4">
             <h3 className="font-black text-[10px] text-blue-600 uppercase tracking-widest flex items-center gap-2 border-b border-blue-50 pb-3"><Lock size={14}/> Security Clearances</h3>
             {pendingAccess.map(u => (
               <Card key={u.id} className="p-6 border-l-4 border-blue-500 shadow-xl bg-white animate-in zoom-in-95">
                  <div className="flex items-center gap-4 mb-6">
                     <div className="w-12 h-12 rounded-xl bg-slate-50 border flex items-center justify-center font-black text-slate-300 overflow-hidden">
                        {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : u.name[0]}
                     </div>
                     <div>
                        <p className="font-black text-slate-900 tracking-tight">{u.name}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{u.role} Node</p>
                     </div>
                  </div>
                  <div className="space-y-2">
                     {u.directoryAccessRequested && (
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Directory Access</span>
                           <div className="flex gap-2">
                              <button onClick={() => handleAccessAction(u.id, 'dir', true)} className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-100 hover:scale-110 transition-transform"><Check size={16}/></button>
                              <button onClick={() => handleAccessAction(u.id, 'dir', false)} className="p-2.5 bg-slate-200 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"><X size={16}/></button>
                           </div>
                        </div>
                     )}
                  </div>
               </Card>
             ))}
             {pendingAccess.length === 0 && <p className="text-center py-16 text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">No Clearance Tasks</p>}
          </section>
       </div>
    </div>
  );
};

// --- Donor Search Hub ---
export const DonorSearch = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsers().then(u => {
      setUsers(u);
      setLoading(false);
    });
  }, []);

  const results = users.filter(u => 
    u.hasDirectoryAccess !== false && // Assume basic donors are visible unless restricted
    (group === 'ALL' || u.bloodGroup === group) &&
    (u.name.toLowerCase().includes(query.toLowerCase()) || 
     u.location.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
             <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Donor Network</h1>
             <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Connect with available biological nodes.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  value={query} 
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Filter by name or location..." 
                  className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-[20px] shadow-sm outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-sm" 
                />
             </div>
             <Select value={group} onChange={e => setGroup(e.target.value)} className="w-24 md:w-32 rounded-[20px] font-black text-xs uppercase tracking-widest h-auto py-3">
                <option value="ALL">ALL</option>
                {Object.values(BloodGroup).map(bg => (
                   <option key={bg} value={bg}>{bg}</option>
                ))}
             </Select>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map(u => (
            <Card key={u.id} className="p-8 border-0 shadow-xl hover:shadow-2xl transition-all group rounded-[32px] bg-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 -mr-10 -mt-10 rounded-full group-hover:scale-150 transition-transform"></div>
               <div className="flex items-start justify-between mb-8">
                  <div className="w-16 h-16 rounded-[24px] bg-slate-50 border-2 border-white shadow-md flex items-center justify-center font-black text-2xl text-slate-400 overflow-hidden">
                     {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : u.name[0]}
                  </div>
                  <Badge color="red" className="text-xs font-black px-4 py-1.5 rounded-xl shadow-sm border-0">{u.bloodGroup}</Badge>
               </div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-red-600 transition-colors">{u.name}</h3>
               <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-slate-500 font-bold text-xs uppercase tracking-widest">
                     <MapPin size={14} className="text-red-400" /> {u.location}
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 font-bold text-xs uppercase tracking-widest">
                     <Clock size={14} className="text-blue-400" /> {u.lastDonationDate ? `Last: ${new Date(u.lastDonationDate).toLocaleDateString()}` : 'No History'}
                  </div>
               </div>
               <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                  <a href={`tel:${u.phone}`} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all"><Phone size={18}/></a>
                  <a href={`mailto:${u.email}`} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"><Mail size={18}/></a>
               </div>
            </Card>
          ))}
          {results.length === 0 && !loading && (
            <div className="col-span-full py-32 text-center font-black text-[10px] text-slate-300 uppercase tracking-[0.4em]">No Donors Found in Search Query</div>
          )}
       </div>
    </div>
  );
};
