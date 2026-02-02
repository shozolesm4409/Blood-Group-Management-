
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  getDonations, 
  getLogs, 
  updateDonationStatus, 
  getUsers, 
  addDonation, 
  deleteUserRecord, 
  updateUserProfile, 
  adminForceChangePassword,
  getDeletedUsers,
  getDeletedDonations,
  deleteDonationRecord,
  getAppPermissions,
  updateAppPermissions,
  handleDirectoryAccess,
  handleSupportAccess,
  requestDirectoryAccess,
  requestSupportAccess,
  deleteLogEntry,
  ADMIN_EMAIL 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, Button, Input, Select, ConfirmModal } from '../components/UI';
import { DonationRecord, AuditLog, DonationStatus, User, UserRole, AppPermissions, BloodGroup } from '../types';
import { 
  Check, X, Plus, Edit2, 
  Trash2, Key, Users, Activity, ChevronRight, Layout as LayoutIcon, ShieldCheck, ChevronDown, ChevronUp, Lock, BellRing, Info, Mail, Phone, MapPin, Calendar, Search, Filter, LifeBuoy, MoreVertical, ExternalLink, Archive, Clock, Droplet, AlertTriangle, ShieldAlert,
  ArrowRight
} from 'lucide-react';
import clsx from 'clsx';

export const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showPwdModal, setShowPwdModal] = useState<string | null>(null);
  const [perms, setPerms] = useState<AppPermissions | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'user-rules' | 'editor-rules' | 'directory-access'>('users');
  const [savingPerms, setSavingPerms] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [permWarning, setPermWarning] = useState<string | null>(null);

  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [uData, pData] = await Promise.all([getUsers(), getAppPermissions()]);
    setUsers(uData);
    setPerms(pData);
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (!currentUser || currentUser.role !== UserRole.ADMIN) return;
    try {
      await updateUserProfile(uid, { role: newRole }, currentUser);
      alert(`User role successfully changed to ${newRole}.`);
      fetchData();
    } catch (e) {
      console.error("Failed to change role", e);
      alert("Error changing user role.");
    }
  };

  const handleAdminPasswordChange = async (uid: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;
    const formData = new FormData(e.currentTarget);
    const newPass = formData.get('newPassword') as string;
    await adminForceChangePassword(uid, newPass, currentUser);
    alert("User access PIN has been force-reset successfully.");
    setShowPwdModal(null);
    fetchData();
  };

  const handleEditUserSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || !editUser) return;
    setEditLoading(true);
    const formData = new FormData(e.currentTarget);
    const updates: Partial<User> = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      bloodGroup: formData.get('bloodGroup') as BloodGroup,
      location: formData.get('location') as string,
      phone: formData.get('phone') as string,
    };

    try {
      await updateUserProfile(editUser.id, updates, currentUser);
      alert("User profile details successfully updated.");
      setEditUser(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update user", err);
      alert("Failed to update user profile.");
    } finally {
      setEditLoading(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!currentUser || !deleteUserId) return;
    setIsDeleting(true);
    try {
      await deleteUserRecord(deleteUserId, currentUser);
      alert("Account data has been successfully moved to the archives.");
      fetchData();
      setDeleteUserId(null);
    } catch (e) {
      console.error("Failed to delete user", e);
      alert("Error deleting user.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSavePerms = async () => {
    if (!perms || !currentUser || currentUser.role !== UserRole.ADMIN) return;
    setSavingPerms(true);
    setPermWarning(null);
    try {
      const result = await updateAppPermissions(perms, currentUser);
      if (result.synced) {
        alert("Permissions successfully synchronized to Cloud Registry.");
      } else {
        setPermWarning(result.error || "Local Sync Only.");
        alert("Configuration saved locally. Cloud sync failed.");
      }
    } catch (err: any) {
      console.error("Save error", err);
      alert(err.message || "Critical error during rule synchronization.");
    } finally {
      setSavingPerms(false);
    }
  };

  const togglePermission = (role: 'user' | 'editor', section: 'sidebar' | 'rules', key: string) => {
    if (!perms || currentUser?.role !== UserRole.ADMIN) return;
    setPerms(prevPerms => {
      if (!prevPerms) return prevPerms;
      const newPerms = JSON.parse(JSON.stringify(prevPerms));
      const targetSection = newPerms[role][section];
      if (targetSection) {
        targetSection[key] = !targetSection[key];
      }
      return newPerms;
    });
  };

  const handleAccessAction = async (userId: string, type: 'directory' | 'support', approve: boolean) => {
    if (!currentUser) return;
    if (type === 'directory') await handleDirectoryAccess(userId, approve, currentUser);
    else await handleSupportAccess(userId, approve, currentUser);
    alert(`${type.charAt(0).toUpperCase() + type.slice(1)} access has been ${approve ? 'granted' : 'revoked'}.`);
    fetchData();
  };

  const canManagePerms = currentUser?.role === UserRole.ADMIN;
  const pendingRequestsCount = users.filter(u => u.directoryAccessRequested || u.supportAccessRequested).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-[#0F172A]">Registry Management</h1>
        <div className="flex bg-[#F1F5F9] p-1 rounded-xl shadow-inner border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
          <button 
            onClick={() => setActiveTab('users')}
            className={clsx(
              "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap", 
              activeTab === 'users' ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-900"
            )}
          >
            User Data
          </button>
          <button 
            onClick={() => setActiveTab('user-rules')}
            className={clsx(
              "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap", 
              activeTab === 'user-rules' ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-900"
            )}
          >
            User Rules
          </button>
          <button 
            onClick={() => setActiveTab('editor-rules')}
            className={clsx(
              "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap", 
              activeTab === 'editor-rules' ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-900"
            )}
          >
            Editor Rules
          </button>
          <button 
            onClick={() => setActiveTab('directory-access')}
            className={clsx(
              "relative px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap", 
              activeTab === 'directory-access' ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-900"
            )}
          >
            Permissions
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] text-white animate-pulse">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'directory-access' && (
        <Card className="p-8 shadow-lg border-0 space-y-8">
          {/* Outstanding Auth Requests Section */}
          {pendingRequestsCount > 0 && (
            <div className="bg-red-50/50 rounded-3xl p-6 border border-red-100">
               <h3 className="font-black text-[10px] text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <BellRing size={16} /> Outstanding Auth Requests
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {users.filter(u => u.directoryAccessRequested || u.supportAccessRequested).map(u => (
                   <div key={u.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between gap-4 group hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                          {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <Users className="p-2 text-slate-300" />}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{u.name}</p>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                             {u.directoryAccessRequested ? 'Directory' : 'Support'} Req
                           </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleAccessAction(u.id, u.directoryAccessRequested ? 'directory' : 'support', true)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all"><Check size={14} /></button>
                        <button onClick={() => handleAccessAction(u.id, u.directoryAccessRequested ? 'directory' : 'support', false)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"><X size={14} /></button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
               <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900">Privileged Account Directory</h3>
              <p className="text-xs text-slate-500">Live directory of accounts authorized for multi-collection visibility.</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b text-[10px] text-slate-500 font-black uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Identity</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Directory</th>
                  <th className="px-6 py-4">Support</th>
                  <th className="px-6 py-4 text-right">Revoke Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.filter(u => u.hasDirectoryAccess || u.hasSupportAccess).map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100">
                           {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <Users className="p-2 text-slate-400" size={14} />}
                         </div>
                         <div className="min-w-0">
                           <p className="font-bold text-slate-900 truncate">{u.name}</p>
                           <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                         </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <Badge color={u.role === UserRole.EDITOR ? 'blue' : 'gray'}>{u.role}</Badge>
                    </td>
                    <td className="px-6 py-4">
                       {u.hasDirectoryAccess ? <Badge color="green">Authorized</Badge> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-6 py-4">
                       {u.hasSupportAccess ? <Badge color="blue">Active</Badge> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-3">
                         {u.hasDirectoryAccess && u.role !== UserRole.ADMIN && (
                           <button onClick={() => handleAccessAction(u.id, 'directory', false)} className="text-red-600 text-[10px] font-black uppercase hover:underline">Revoke Dir</button>
                         )}
                         {u.hasSupportAccess && u.role !== UserRole.ADMIN && u.role !== UserRole.USER && (
                           <button onClick={() => handleAccessAction(u.id, 'support', false)} className="text-blue-600 text-[10px] font-black uppercase hover:underline">Revoke Sup</button>
                         )}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Render tabs based on active state */}
      {activeTab === 'users' && (
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] text-[#64748B] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-5">Profile</th>
                  <th className="px-6 py-5">Email</th>
                  <th className="px-6 py-5">Role</th>
                  <th className="px-6 py-5">Access Pin</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                          {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt={u.name} /> : <Users className="p-2.5 text-slate-400" />}
                        </div>
                        <div>
                          <p className="font-bold text-[#1E293B]">{u.name}</p>
                          <p className="text-[10px] text-red-600 uppercase font-bold">{u.bloodGroup}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#64748B] font-medium">{u.email}</td>
                    <td className="px-6 py-4">
                      {u.email.toLowerCase() === ADMIN_EMAIL ? (
                         <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter bg-red-50 px-2 py-1 rounded">Super Admin</span>
                      ) : (
                        <select 
                          className="bg-transparent border-0 text-xs font-bold text-slate-700 appearance-none focus:ring-0 cursor-pointer"
                          value={u.role}
                          disabled={!canManagePerms}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        >
                          <option value={UserRole.USER}>User</option>
                          <option value={UserRole.EDITOR}>Editor</option>
                          <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <code className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono font-bold text-xs">{(u as any).password || '••••••'}</code>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditUser(u)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16}/></button>
                        <button onClick={() => setShowPwdModal(u.id)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"><Key size={16}/></button>
                        {u.email.toLowerCase() !== ADMIN_EMAIL && (
                          <button onClick={() => setDeleteUserId(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(activeTab === 'user-rules' || activeTab === 'editor-rules') && perms && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
            <h3 className="font-black text-xs text-red-600 uppercase tracking-widest mb-8 flex items-center gap-2">
              <LayoutIcon size={16} /> Sidebar Access Controls
            </h3>
            <div className="space-y-3">
              {Object.keys(perms[activeTab === 'user-rules' ? 'user' : 'editor'].sidebar).map((key) => (
                <div key={key} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-2xl border border-white shadow-sm">
                  <span className="font-bold text-[#334155] text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <input 
                    type="checkbox" 
                    disabled={!canManagePerms}
                    checked={!!(perms[activeTab === 'user-rules' ? 'user' : 'editor'].sidebar as any)?.[key]} 
                    onChange={() => togglePermission(activeTab === 'user-rules' ? 'user' : 'editor', 'sidebar', key)}
                    className="w-5 h-5 rounded accent-red-600 cursor-pointer border-slate-300"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
            <h3 className="font-black text-xs text-red-600 uppercase tracking-widest mb-8 flex items-center gap-2">
              <ShieldCheck size={16} /> Application Functional Logic
            </h3>
            <div className="space-y-3">
              {Object.keys(perms[activeTab === 'user-rules' ? 'user' : 'editor'].rules).map((key) => (
                <div key={key} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-2xl border border-white shadow-sm">
                  <span className="font-bold text-[#334155] text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <input 
                    type="checkbox" 
                    disabled={!canManagePerms}
                    checked={!!(perms[activeTab === 'user-rules' ? 'user' : 'editor'].rules as any)?.[key]} 
                    onChange={() => togglePermission(activeTab === 'user-rules' ? 'user' : 'editor', 'rules', key)}
                    className="w-5 h-5 rounded accent-red-600 cursor-pointer border-slate-300"
                  />
                </div>
              ))}
            </div>
            {canManagePerms && (
              <div className="mt-10">
                <button 
                  onClick={handleSavePerms} 
                  disabled={savingPerms}
                  className="w-full bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {savingPerms ? 'Processing Rules...' : 'Synchronize Global Rules'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <Card className="p-8 bg-white border-0 shadow-2xl w-full max-w-lg rounded-3xl animate-in zoom-in-95">
            <h3 className="font-bold text-xl mb-6">Profile Overwrite</h3>
            <form onSubmit={handleEditUserSubmit} className="space-y-4">
               <Input label="Name" name="name" defaultValue={editUser.name} required />
               <Input label="Email" name="email" type="email" defaultValue={editUser.email} required />
               <div className="grid grid-cols-2 gap-4">
                 <Select label="Group" name="bloodGroup" defaultValue={editUser.bloodGroup}>
                   {Object.values(BloodGroup).map(bg => <option key={bg} value={bg}>{bg}</option>)}
                 </Select>
                 <Input label="Phone" name="phone" defaultValue={editUser.phone} required />
               </div>
               <Input label="Location" name="location" defaultValue={editUser.location} required />
               <div className="flex gap-3 pt-4">
                 <Button type="submit" className="flex-1 py-4" isLoading={editLoading}>Apply Updates</Button>
                 <Button type="button" variant="outline" className="flex-1 py-4" onClick={() => setEditUser(null)}>Cancel</Button>
               </div>
            </form>
          </Card>
        </div>
      )}

      {showPwdModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <Card className="p-8 bg-white border-0 shadow-2xl w-full max-w-md rounded-3xl animate-in zoom-in-95">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><Key className="text-orange-600" /> Administrative PIN Reset</h3>
            <form onSubmit={(e) => handleAdminPasswordChange(showPwdModal, e)} className="space-y-5">
               <Input label="New Key Code" name="newPassword" type="text" required placeholder="e.g. 123456" />
               <div className="flex gap-3 pt-2">
                 <Button type="submit" className="flex-1 py-4">Force Override</Button>
                 <Button type="button" variant="outline" className="flex-1 py-4" onClick={() => setShowPwdModal(null)}>Close</Button>
               </div>
            </form>
          </Card>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!deleteUserId}
        onClose={() => setDeleteUserId(null)}
        onConfirm={confirmDeleteUser}
        title="Account Purge?"
        message="Moving this account to the archive matrix. This is tracked in system logs."
        isLoading={isDeleting}
      />
    </div>
  );
};

export const DirectoryPermissions = () => {
  const { user: admin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [uData, dData] = await Promise.all([getUsers(), getDonations()]);
    setUsers(uData);
    setDonations(dData);
    setLoading(false);
  };

  const handleAction = async (userId: string, type: 'directory' | 'support', approve: boolean) => {
    if (!admin) return;
    try {
      if (type === 'directory') await handleDirectoryAccess(userId, approve, admin);
      else await handleSupportAccess(userId, approve, admin);
      alert(`${approve ? 'Access Granted' : 'Access Denied'} successfully.`);
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Verification failed.");
    }
  };

  const handleDonationApproval = async (donationId: string, approve: boolean) => {
    if (!admin) return;
    try {
      await updateDonationStatus(donationId, approve ? DonationStatus.COMPLETED : DonationStatus.REJECTED, admin);
      alert(`Donation record ${approve ? 'Finalized' : 'Voided'} successfully.`);
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Action failed.");
    }
  };

  const pendingDir = users.filter(u => u.directoryAccessRequested);
  const pendingSup = users.filter(u => u.supportAccessRequested);
  const pendingDonations = donations.filter(d => d.status === DonationStatus.PENDING);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-50 rounded-2xl shadow-inner">
          <BellRing className="text-red-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verification Hub</h1>
          <p className="text-sm text-slate-500 font-medium">Authorization and record commit queue.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <section className="space-y-4">
             <h3 className="font-black text-xs text-red-600 uppercase tracking-widest flex items-center gap-2">
               <ShieldCheck size={16} /> Cross-Collection Auth
             </h3>
             <div className="space-y-3">
               {pendingDir.map(u => (
                 <Card key={u.id} className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-l-4 border-l-red-600 shadow-md">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <Users className="text-slate-300" />}
                     </div>
                     <div className="text-center sm:text-left">
                       <p className="font-bold text-slate-900">{u.name}</p>
                       <p className="text-xs text-slate-500">{u.email}</p>
                     </div>
                   </div>
                   <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={() => handleAction(u.id, 'directory', true)} className="flex-1 sm:flex-none bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all">Grant</button>
                      <button onClick={() => handleAction(u.id, 'directory', false)} className="flex-1 sm:flex-none bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all">Reject</button>
                   </div>
                 </Card>
               ))}
               {pendingDir.length === 0 && (
                 <Card className="p-10 text-center text-slate-400 bg-slate-50 border-dashed">
                   <p className="text-sm italic">Access request queue is empty.</p>
                 </Card>
               )}
             </div>
          </section>

          <section className="space-y-4">
             <h3 className="font-black text-xs text-blue-600 uppercase tracking-widest flex items-center gap-2">
               <LifeBuoy size={16} /> Live Support Authorization
             </h3>
             <div className="space-y-3">
               {pendingSup.map(u => (
                 <Card key={u.id} className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-l-4 border-l-blue-600 shadow-md">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <Users className="p-2 text-slate-300" />}
                     </div>
                     <div className="text-center sm:text-left">
                       <p className="font-bold text-slate-900">{u.name}</p>
                       <p className="text-xs text-slate-500">{u.email}</p>
                     </div>
                   </div>
                   <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={() => handleAction(u.id, 'support', true)} className="flex-1 sm:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all">Activate</button>
                      <button onClick={() => handleAction(u.id, 'support', false)} className="flex-1 sm:flex-none bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all">Reject</button>
                   </div>
                 </Card>
               ))}
               {pendingSup.length === 0 && (
                 <Card className="p-10 text-center text-slate-400 bg-slate-50 border-dashed">
                   <p className="text-sm italic">No pending support requests.</p>
                 </Card>
               )}
             </div>
          </section>
        </div>

        <section className="space-y-4">
           <h3 className="font-black text-xs text-orange-600 uppercase tracking-widest flex items-center gap-2">
             <Droplet size={16} /> Field Record Commit
           </h3>
           <div className="space-y-3">
             {pendingDonations.map(d => (
               <Card key={d.id} className="p-5 flex flex-col gap-4 border-l-4 border-l-orange-500 shadow-md">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                        <Droplet size={24} />
                     </div>
                     <div>
                       <p className="font-bold text-slate-900">{d.userName}</p>
                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{d.location}</p>
                     </div>
                   </div>
                   <Badge color="red">{d.userBloodGroup}</Badge>
                 </div>
                 
                 <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume (mL)</p>
                      <p className="text-sm font-bold">{d.units}ml</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                      <p className="text-sm font-bold">{new Date(d.donationDate).toLocaleDateString()}</p>
                    </div>
                 </div>

                 <div className="flex gap-2">
                    <button 
                      onClick={() => handleDonationApproval(d.id, true)} 
                      className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Check size={14} /> Commit Record
                    </button>
                    <button 
                      onClick={() => handleDonationApproval(d.id, false)} 
                      className="flex-1 bg-white border border-slate-200 text-red-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <X size={14} /> Void
                    </button>
                 </div>
               </Card>
             ))}
             {pendingDonations.length === 0 && (
               <Card className="p-20 text-center text-slate-400 bg-slate-50 border-dashed">
                 <p className="text-sm italic">All field records are synchronized.</p>
               </Card>
             )}
           </div>
        </section>
      </div>
    </div>
  );
};

export const ManageDonations = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedDonorId, setSelectedDonorId] = useState('');
  const [deleteDonId, setDeleteDonId] = useState<string | null>(null);

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const [dData, uData] = await Promise.all([getDonations(), getUsers()]);
      setDonations(dData);
      setUsers(uData);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDonations(); }, []);

  const handleStatusUpdate = async (id: string, status: DonationStatus) => {
    if (!user) return;
    try {
      await updateDonationStatus(id, status, user);
      alert(`Donation status successfully updated to ${status}.`);
      fetchDonations();
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Failed to update record.");
    }
  };

  const handleAddDonation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setSubmitLoading(true);
    const formData = new FormData(e.currentTarget);
    const userId = formData.get('userId') as string;
    const selectedUser = users.find(u => u.id === userId);

    if (selectedUser) {
      try {
        await addDonation({
          userId: selectedUser.id,
          userName: selectedUser.name,
          userBloodGroup: selectedUser.bloodGroup,
          donationDate: formData.get('date') as string,
          location: formData.get('location') as string,
          units: Number(formData.get('units')),
          status: formData.get('status') as DonationStatus,
          notes: "Admin override"
        }, user);
        alert("New donation record has been successfully added to the registry.");
        setShowAddModal(false);
        fetchDonations();
      } catch (err) {
        alert("Failed to add donation record.");
      }
    }
    setSubmitLoading(false);
  };

  const confirmDeleteDonation = async () => {
    if (!user || !deleteDonId) return;
    try {
      await deleteDonationRecord(deleteDonId, user);
      alert("Donation record successfully archived.");
      setDeleteDonId(null);
      fetchDonations();
    } catch (err) {
      alert("Failed to delete record.");
    }
  };

  const filtered = donations.filter(d => filter === 'ALL' || d.status === filter);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Global Transaction Log</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full sm:w-40 bg-white">
             <option value="ALL">Show All</option>
             <option value={DonationStatus.PENDING}>Pending</option>
             <option value={DonationStatus.COMPLETED}>Completed</option>
          </Select>
          <Button onClick={() => setShowAddModal(!showAddModal)}>
            <Plus className="w-4 h-4 mr-2" /> Commit Record
          </Button>
        </div>
      </div>

      {showAddModal && (
        <Card className="p-8 bg-white border-slate-200 shadow-2xl border-t-4 border-red-500 animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight">Manual Registry Entry</h3>
            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleAddDonation} className="space-y-4">
             <Select label="Donor Selection" name="userId" required value={selectedDonorId} onChange={(e) => setSelectedDonorId(e.target.value)}>
               <option value="">Locate hero...</option>
               {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.bloodGroup})</option>)}
             </Select>
             <div className="grid grid-cols-2 gap-4">
               <Input label="Process Date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
               <Input label="Volume (ml)" name="units" type="number" required defaultValue="450" />
             </div>
             <Input label="Processing Facility" name="location" required placeholder="Hospital Center" />
             <Select label="Sync Status" name="status" required defaultValue={DonationStatus.COMPLETED}>
               <option value={DonationStatus.COMPLETED}>Finalized & Sync'd</option>
               <option value={DonationStatus.PENDING}>Pending Auth</option>
             </Select>
             <Button type="submit" className="w-full py-4 mt-2" isLoading={submitLoading}>Commit to Registry</Button>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden shadow-lg border-0 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-[10px] text-white uppercase tracking-[0.2em] font-black">
              <tr>
                <th className="px-6 py-5">Hero Profile</th>
                <th className="px-6 py-5">Group</th>
                <th className="px-6 py-5">Commit Date</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Approvals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(d => {
                const donor = users.find(u => u.id === d.userId);
                return (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full border-2 border-slate-50 overflow-hidden bg-slate-100 flex-shrink-0">
                           {donor?.avatar ? <img src={donor.avatar} className="w-full h-full object-cover" /> : <Users className="p-2 text-slate-300" />}
                         </div>
                         <div>
                           <p className="font-bold text-slate-900">{d.userName}</p>
                           <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{d.location}</p>
                         </div>
                       </div>
                    </td>
                    <td className="px-6 py-4"><Badge color="red">{d.userBloodGroup}</Badge></td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(d.donationDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <Badge color={d.status === DonationStatus.COMPLETED ? 'green' : (d.status === DonationStatus.PENDING ? 'yellow' : 'red')}>
                        {d.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        {d.status === DonationStatus.PENDING && (
                          <button 
                            onClick={() => handleStatusUpdate(d.id, DonationStatus.COMPLETED)}
                            className="p-2.5 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl transition-all shadow-sm"
                            title="Confirm Transaction"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => setDeleteDonId(d.id)}
                          className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Purge Record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium italic">No active ledger entries.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <ConfirmModal 
        isOpen={!!deleteDonId} 
        onClose={() => setDeleteDonId(null)} 
        onConfirm={confirmDeleteDonation} 
        title="Wipe Ledger Entry?" 
        message="This record will be moved to the archive matrix. Proceed?"
      />
    </div>
  );
};

export const SystemLogs = () => {
  const { user: admin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filterAction, setFilterAction] = useState('ALL');
  
  useEffect(() => { getLogs().then(setLogs); }, []);

  const getActionBadge = (action: string) => {
    if (action.includes('LOGIN')) return <Badge color="green">Auth</Badge>;
    if (action.includes('REGISTER')) return <Badge color="blue">Init</Badge>;
    if (action.includes('DELETE')) return <Badge color="red">Purge</Badge>;
    if (action.includes('UPDATE')) return <Badge color="yellow">Patch</Badge>;
    return <Badge color="gray">{action}</Badge>;
  };

  const handleDeleteLog = async (id: string) => {
    if (!admin) return;
    try {
      await deleteLogEntry(id, admin);
      alert("Diagnostic entry successfully removed.");
      getLogs().then(setLogs);
    } catch (e) { console.error(e); }
  };

  const filteredLogs = logs.filter(log => filterAction === 'ALL' || log.action.startsWith(filterAction));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">System Diagnostic Registry</h1>
        <Select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="w-48 bg-white">
           <option value="ALL">Global Feed</option>
           <option value="LOGIN">Security</option>
           <option value="DONATION">Ops</option>
           <option value="USER">Directory</option>
        </Select>
      </div>
      <Card className="overflow-hidden border-0 shadow-xl bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-[10px] text-white uppercase tracking-[0.2em] font-black">
              <tr>
                <th className="px-6 py-5">Timestamp</th>
                <th className="px-6 py-5">Module</th>
                <th className="px-6 py-5">Actor</th>
                <th className="px-6 py-5">Diagnostic Response</th>
                <th className="px-6 py-5 text-right">Purge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-400 font-mono text-[10px] whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4">{getActionBadge(log.action)}</td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                          {log.userAvatar ? <img src={log.userAvatar} className="w-full h-full object-cover" /> : <Users className="p-1.5 text-slate-300" />}
                        </div>
                        <span className="font-bold text-slate-800">{log.userName}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-[11px] font-medium text-slate-500 max-w-xs">{log.details}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeleteLog(log.id)} className="text-slate-200 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium italic">Diagnostic log is clear.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export const DonorSearch = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [bloodFilter, setBloodFilter] = useState('ALL');

  useEffect(() => {
    getUsers().then(data => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  const hasAccess = user?.hasDirectoryAccess || user?.role === UserRole.ADMIN;

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBlood = bloodFilter === 'ALL' || u.bloodGroup === bloodFilter;
    return matchesSearch && matchesBlood && u.role === UserRole.USER;
  });

  const handleRequestAccess = async () => {
    if (!user) return;
    try {
      await requestDirectoryAccess(user);
      alert("Access request sent to administrator. You will be notified once verified.");
    } catch (e) {
      alert("Failed to send request.");
    }
  };

  if (loading) return <div className="p-20 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Scanning donor records...</div>;

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="p-6 bg-red-50 rounded-[3rem] text-red-600 shadow-inner">
          <Lock size={64} />
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Restricted Directory</h2>
          <p className="text-slate-500 font-medium mb-8">Access to the full donor directory requires administrative authorization to ensure privacy and safety.</p>
          <Button onClick={handleRequestAccess}>Request Directory Access</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Donor Directory</h1>
          <p className="text-slate-500 font-medium">Verified life-savers across the network.</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <Input 
            placeholder="Search name or city..." 
            className="w-full sm:w-64" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select 
            value={bloodFilter} 
            onChange={(e) => setBloodFilter(e.target.value)}
            className="w-full sm:w-32"
          >
            <option value="ALL">All Groups</option>
            {Object.values(BloodGroup).map(bg => <option key={bg} value={bg}>{bg}</option>)}
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-lg bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-[10px] text-white uppercase tracking-[0.2em] font-black">
              <tr>
                <th className="px-6 py-5">Donor Profile</th>
                <th className="px-6 py-5">Blood Group</th>
                <th className="px-6 py-5">Location</th>
                <th className="px-6 py-5">Phone</th>
                <th className="px-6 py-5">Last Donation</th>
                <th className="px-6 py-5 text-right">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 group-hover:scale-110 transition-transform">
                         {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <Users className="p-2 text-slate-300" />}
                       </div>
                       <div>
                         <p className="font-bold text-slate-900">{u.name}</p>
                         <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                       </div>
                     </div>
                  </td>
                  <td className="px-6 py-4"><Badge color="red">{u.bloodGroup}</Badge></td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                       <MapPin size={12} className="text-slate-300" />
                       {u.location}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <a href={`tel:${u.phone}`} className="text-red-600 font-bold hover:underline">
                      {u.phone || 'N/A'}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       {u.lastDonationDate ? new Date(u.lastDonationDate).toLocaleDateString() : 'New Hero'}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      to="/support" 
                      className="inline-flex items-center justify-center p-2.5 bg-slate-100 text-slate-400 group-hover:bg-red-600 group-hover:text-white rounded-xl transition-all shadow-sm"
                      title="Send Message"
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-medium italic">No donors found in the registry.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export const DeletedRecords = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDeletedUsers(), getDeletedDonations()]).then(([u, d]) => {
      setUsers(u);
      setDonations(d);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-20 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Accessing historical vault...</div>;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">System Archives</h1>
        <p className="text-slate-500 font-medium">Historical trace of purged records and security actions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-6">
          <h3 className="font-black text-xs text-red-600 uppercase tracking-widest flex items-center gap-2">
            <Users size={16} /> Purged Identity Matrix
          </h3>
          <Card className="overflow-hidden border-0 shadow-lg">
             <div className="overflow-x-auto">
               <table className="w-full text-xs text-left">
                 <thead className="bg-slate-900 text-white font-black uppercase tracking-widest">
                   <tr>
                     <th className="px-4 py-4">Identity</th>
                     <th className="px-4 py-4">Purge Date</th>
                     <th className="px-4 py-4">Actor</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {users.map((u, i) => (
                     <tr key={i} className="hover:bg-slate-50">
                       <td className="px-4 py-3">
                         <p className="font-bold text-slate-900">{u.name}</p>
                         <p className="text-[10px] text-slate-400">{u.email}</p>
                       </td>
                       <td className="px-4 py-3 font-mono text-slate-400">{new Date(u.deletedAt).toLocaleDateString()}</td>
                       <td className="px-4 py-3 font-bold text-red-600">{u.deletedBy}</td>
                     </tr>
                   ))}
                   {users.length === 0 && (
                     <tr><td colSpan={3} className="px-4 py-10 text-center italic text-slate-400">Archive is empty.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
          </Card>
        </section>

        <section className="space-y-6">
          <h3 className="font-black text-xs text-orange-600 uppercase tracking-widest flex items-center gap-2">
            <Droplet size={16} /> Voided Transaction Log
          </h3>
          <Card className="overflow-hidden border-0 shadow-lg">
             <div className="overflow-x-auto">
               <table className="w-full text-xs text-left">
                 <thead className="bg-slate-900 text-white font-black uppercase tracking-widest">
                   <tr>
                     <th className="px-4 py-4">Donation</th>
                     <th className="px-4 py-4">Void Date</th>
                     <th className="px-4 py-4">Actor</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {donations.map((d, i) => (
                     <tr key={i} className="hover:bg-slate-50">
                       <td className="px-4 py-3">
                         <p className="font-bold text-slate-900">{d.userName} ({d.units}ml)</p>
                         <p className="text-[10px] text-slate-400">{d.location}</p>
                       </td>
                       <td className="px-4 py-3 font-mono text-slate-400">{new Date(d.deletedAt).toLocaleDateString()}</td>
                       <td className="px-4 py-3 font-bold text-orange-600">{d.deletedBy}</td>
                     </tr>
                   ))}
                    {donations.length === 0 && (
                     <tr><td colSpan={3} className="px-4 py-10 text-center italic text-slate-400">No voided transactions.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
          </Card>
        </section>
      </div>
    </div>
  );
};
