
import React, { useEffect, useState } from 'react';
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
  Trash2, Key, Users, Activity, ChevronRight, Layout as LayoutIcon, ShieldCheck, ChevronDown, ChevronUp, Lock, BellRing, Info, Mail, Phone, MapPin, Calendar, Search, Filter, LifeBuoy, MoreVertical, ExternalLink, Archive
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

  // Deletion state
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
      fetchData();
    } catch (e) {
      console.error("Failed to change role", e);
    }
  };

  const handleAdminPasswordChange = async (uid: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;
    const formData = new FormData(e.currentTarget);
    const newPass = formData.get('newPassword') as string;
    await adminForceChangePassword(uid, newPass, currentUser);
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
      setEditUser(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update user", err);
    } finally {
      setEditLoading(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!currentUser || !deleteUserId) return;
    setIsDeleting(true);
    try {
      await deleteUserRecord(deleteUserId, currentUser);
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
    try {
      await updateAppPermissions(perms, currentUser);
      alert("Permission rules saved successfully!");
    } catch (err) {
      console.error("Save error", err);
      alert("Failed to save rules. Check console.");
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

  const revokeAccess = async (userId: string, type: 'directory' | 'support') => {
    if (!currentUser) return;
    if (type === 'directory') await handleDirectoryAccess(userId, false, currentUser);
    else await handleSupportAccess(userId, false, currentUser);
    fetchData();
  };

  const canManagePerms = currentUser?.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-[#0F172A]">User Management</h1>
        <div className="flex bg-[#F1F5F9] p-1 rounded-xl shadow-inner border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
          <button 
            onClick={() => setActiveTab('users')}
            className={clsx(
              "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap", 
              activeTab === 'users' ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-900"
            )}
          >
            Users List
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
              "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap", 
              activeTab === 'directory-access' ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-900"
            )}
          >
            Access Control
          </button>
        </div>
      </div>

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
                      {u.email === ADMIN_EMAIL ? (
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
                        {u.email !== ADMIN_EMAIL && (
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

      {(activeTab === 'user-rules' || activeTab === 'editor-rules') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {!perms ? (
             <div className="col-span-2 text-center py-20 text-slate-400 font-medium">Loading Rules Engine...</div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
                <h3 className="font-black text-xs text-red-600 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <LayoutIcon size={16} /> Sidebar Access
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
                  <ShieldCheck size={16} /> Feature Rules
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
                      {savingPerms ? 'Saving...' : 'Update Permissions'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'directory-access' && (
        <Card className="p-8 shadow-lg border-0">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
               <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900">Permitted Access Directory</h3>
              <p className="text-xs text-slate-500">List of users currently authorized to view sensitive data.</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b text-[10px] text-slate-500 font-black uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Directory</th>
                  <th className="px-6 py-4">Support</th>
                  <th className="px-6 py-4 text-right">Actions</th>
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
                       {u.hasDirectoryAccess ? <Badge color="green">Permitted</Badge> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-6 py-4">
                       {u.hasSupportAccess ? <Badge color="blue">Active</Badge> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-3">
                         {u.hasDirectoryAccess && u.role !== UserRole.ADMIN && (
                           <button onClick={() => revokeAccess(u.id, 'directory')} className="text-red-600 text-[10px] font-black uppercase hover:underline">Revoke Dir</button>
                         )}
                         {u.hasSupportAccess && u.role !== UserRole.ADMIN && u.role !== UserRole.USER && (
                           <button onClick={() => revokeAccess(u.id, 'support')} className="text-blue-600 text-[10px] font-black uppercase hover:underline">Revoke Sup</button>
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

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <Card className="p-8 bg-white border-0 shadow-2xl w-full max-w-lg rounded-3xl animate-in zoom-in-95">
            <h3 className="font-bold text-xl mb-6">Update Profile</h3>
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
                 <Button type="submit" className="flex-1 py-4" isLoading={editLoading}>Save Profile</Button>
                 <Button type="button" variant="outline" className="flex-1 py-4" onClick={() => setEditUser(null)}>Cancel</Button>
               </div>
            </form>
          </Card>
        </div>
      )}

      {/* Password Modal */}
      {showPwdModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <Card className="p-8 bg-white border-0 shadow-2xl w-full max-w-md rounded-3xl animate-in zoom-in-95">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><Key className="text-orange-600" /> Reset Pin</h3>
            <form onSubmit={(e) => handleAdminPasswordChange(showPwdModal, e)} className="space-y-5">
               <Input label="New Password" name="newPassword" type="text" required placeholder="e.g. 123456" />
               <div className="flex gap-3 pt-2">
                 <Button type="submit" className="flex-1 py-4">Force Update</Button>
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
        title="Archive User?"
        message="All data will be moved to the archive system."
        isLoading={isDeleting}
      />
    </div>
  );
};

export const DirectoryPermissions = () => {
  const { user: admin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await getUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleAction = async (userId: string, type: 'directory' | 'support', approve: boolean) => {
    if (!admin) return;
    try {
      if (type === 'directory') await handleDirectoryAccess(userId, approve, admin);
      else await handleSupportAccess(userId, approve, admin);
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const pendingDir = users.filter(u => u.directoryAccessRequested);
  const pendingSup = users.filter(u => u.supportAccessRequested);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-50 rounded-2xl">
          <BellRing className="text-red-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pending Notifications</h1>
          <p className="text-sm text-slate-500">Action required on user permission requests.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <section className="space-y-4">
           <h3 className="font-black text-xs text-red-600 uppercase tracking-widest flex items-center gap-2">
             <ShieldCheck size={16} /> Directory Access Requests
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
                    <button onClick={() => handleAction(u.id, 'directory', true)} className="flex-1 sm:flex-none bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs">Approve</button>
                    <button onClick={() => handleAction(u.id, 'directory', false)} className="flex-1 sm:flex-none bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-xs">Reject</button>
                 </div>
               </Card>
             ))}
             {pendingDir.length === 0 && (
               <Card className="p-10 text-center text-slate-400 bg-slate-50 border-dashed">
                 <p className="text-sm italic">No pending directory requests.</p>
               </Card>
             )}
           </div>
        </section>

        <section className="space-y-4">
           <h3 className="font-black text-xs text-blue-600 uppercase tracking-widest flex items-center gap-2">
             <LifeBuoy size={16} /> Support Access Requests
           </h3>
           <div className="space-y-3">
             {pendingSup.map(u => (
               <Card key={u.id} className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-l-4 border-l-blue-600 shadow-md">
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
                    <button onClick={() => handleAction(u.id, 'support', true)} className="flex-1 sm:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs">Approve</button>
                    <button onClick={() => handleAction(u.id, 'support', false)} className="flex-1 sm:flex-none bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-xs">Reject</button>
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
      fetchDonations();
    } catch (e) {
      console.error("Failed to update status", e);
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
      await addDonation({
        userId: selectedUser.id,
        userName: selectedUser.name,
        userBloodGroup: selectedUser.bloodGroup,
        donationDate: formData.get('date') as string,
        location: formData.get('location') as string,
        units: Number(formData.get('units')),
        status: formData.get('status') as DonationStatus,
        notes: "Admin entry"
      }, user);
      setShowAddModal(false);
      fetchDonations();
    }
    setSubmitLoading(false);
  };

  const confirmDeleteDonation = async () => {
    if (!user || !deleteDonId) return;
    await deleteDonationRecord(deleteDonId, user);
    setDeleteDonId(null);
    fetchDonations();
  };

  const filtered = donations.filter(d => filter === 'ALL' || d.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Manage Donations</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => setShowAddModal(!showAddModal)}>
            <Plus className="w-4 h-4 mr-2" /> Log Donation
          </Button>
        </div>
      </div>

      {showAddModal && (
        <Card className="p-6 bg-white border-slate-200 shadow-xl border-t-4 border-red-500 animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900 text-lg">Log New Entry</h3>
            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleAddDonation} className="space-y-4">
             <Select 
               label="Select Donor" 
               name="userId" 
               required 
               value={selectedDonorId} 
               onChange={(e) => setSelectedDonorId(e.target.value)}
             >
               <option value="">Choose a donor...</option>
               {users.filter(u => u.role === UserRole.USER || u.role === UserRole.EDITOR).map(u => (
                 <option key={u.id} value={u.id}>{u.name} [{u.role}] ({u.bloodGroup})</option>
               ))}
             </Select>
             <div className="grid grid-cols-2 gap-4">
               <Input label="Date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
               <Input label="Units (ml)" name="units" type="number" required defaultValue="450" />
             </div>
             <Input label="Location" name="location" required placeholder="Hospital or Clinic" />
             <Select label="Status" name="status" required defaultValue={DonationStatus.COMPLETED}>
               <option value={DonationStatus.COMPLETED}>Completed</option>
               <option value={DonationStatus.PENDING}>Pending</option>
             </Select>
             <Button type="submit" className="w-full py-4 mt-2" isLoading={submitLoading}>Save Entry</Button>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden shadow-lg border-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-[10px] text-white uppercase tracking-widest font-black">
              <tr>
                <th className="px-6 py-5">Donor</th>
                <th className="px-6 py-5">Group</th>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">{d.userName}</td>
                  <td className="px-6 py-4"><Badge color="red">{d.userBloodGroup}</Badge></td>
                  <td className="px-6 py-4 text-xs">{new Date(d.donationDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <Badge color={d.status === 'COMPLETED' ? 'green' : 'yellow'}>{d.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setDeleteDonId(d.id)}
                      className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <ConfirmModal 
        isOpen={!!deleteDonId} 
        onClose={() => setDeleteDonId(null)} 
        onConfirm={confirmDeleteDonation} 
        title="Delete Donation Record?" 
        message="This record will be moved to archives."
      />
    </div>
  );
};

export const DonorSearch = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [bloodFilter, setBloodFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  
  useEffect(() => { 
     getUsers().then(setUsers); 
     if (user?.directoryAccessRequested) setHasRequested(true);
  }, [user]);

  const filteredUsers = users.filter(u => 
    (u.role === UserRole.USER || u.role === UserRole.EDITOR) &&
    u.name.toLowerCase().includes(search.toLowerCase()) &&
    u.location.toLowerCase().includes(locationFilter.toLowerCase()) &&
    (bloodFilter === '' || u.bloodGroup === bloodFilter) &&
    (!eligibleOnly || (!u.lastDonationDate || (new Date().getTime() - new Date(u.lastDonationDate).getTime() > 90*24*60*60*1000)))
  );

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleRequestAccess = async () => {
    if (!user) return;
    setIsRequesting(true);
    try {
      await requestDirectoryAccess(user);
      setHasRequested(true);
      alert("Access request sent to Administrator.");
    } catch (e) {
      console.error(e);
    } finally {
      setIsRequesting(false);
    }
  };

  const hasAccess = user?.hasDirectoryAccess || user?.role === UserRole.ADMIN;

  if (!hasAccess) {
     return (
       <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-red-50 rounded-[40px] flex items-center justify-center mb-8 text-red-600 shadow-inner">
            <Lock size={44} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter">Private Directory</h2>
          <p className="text-slate-500 max-w-md mb-10 leading-relaxed text-sm font-medium">
             This directory contains private donor contact information. 
             Access is currently restricted to verified personnel only.
          </p>
          <button 
            onClick={handleRequestAccess} 
            disabled={hasRequested} 
            className={clsx(
              "w-full max-w-xs py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95",
              hasRequested ? "bg-slate-100 text-slate-400" : "bg-red-600 text-white hover:bg-red-700 shadow-red-100"
            )}
          >
            {isRequesting ? "Sending..." : hasRequested ? "Request Pending" : "Request Access Permission"}
          </button>
       </div>
     );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-50 rounded-2xl">
          <Search className="text-red-600" size={24} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Donor Directory</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input placeholder="Donor Name..." value={search} onChange={e => setSearch(e.target.value)} />
        <Input placeholder="Location..." value={locationFilter} onChange={e => setLocationFilter(e.target.value)} />
        <Select value={bloodFilter} onChange={e => setBloodFilter(e.target.value)}>
          <option value="">All Groups</option>
          {Object.values(BloodGroup).map(bg => <option key={bg} value={bg}>{bg}</option>)}
        </Select>
        <div className="flex items-center gap-2 px-4 border rounded-2xl bg-white shadow-sm">
          <input type="checkbox" id="eligible" className="w-5 h-5 rounded accent-red-600" checked={eligibleOnly} onChange={e => setEligibleOnly(e.target.checked)} />
          <label htmlFor="eligible" className="text-xs font-bold text-slate-600">Eligible Only</label>
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-[10px] text-slate-500 font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-5">Donor Profile</th>
                <th className="px-6 py-5">Group</th>
                <th className="px-6 py-5 hidden md:table-cell">Email Address</th>
                <th className="px-6 py-5 hidden md:table-cell">Phone Number</th>
                <th className="px-6 py-5 hidden md:table-cell">Location</th>
                <th className="px-6 py-5 hidden md:table-cell">Last Donation</th>
                <th className="px-6 py-5 md:hidden text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <React.Fragment key={u.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                          {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt={u.name} /> : <Users className="p-2.5 text-slate-400" />}
                        </div>
                        <span className="font-bold text-slate-900 truncate max-w-[120px] sm:max-w-none">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Badge color="red">{u.bloodGroup}</Badge></td>
                    
                    {/* Desktop View Columns */}
                    <td className="px-6 py-4 text-slate-600 font-medium hidden md:table-cell">{u.email}</td>
                    <td className="px-6 py-4 font-bold text-red-600 hidden md:table-cell">
                      <a href={`tel:${u.phone}`} className="hover:underline flex items-center gap-1">
                        {u.phone} <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium hidden md:table-cell">{u.location}</td>
                    <td className="px-6 py-4 text-xs font-black text-slate-400 uppercase italic hidden md:table-cell">
                      {u.lastDonationDate ? new Date(u.lastDonationDate).toLocaleDateString() : 'Never'}
                    </td>

                    {/* Mobile Plus Toggle */}
                    <td className="px-6 py-4 text-right md:hidden">
                      <button 
                        onClick={() => toggleRow(u.id)}
                        className={clsx(
                          "p-2 rounded-xl transition-all active:scale-90",
                          expandedRows[u.id] ? "bg-red-600 text-white shadow-md shadow-red-200" : "bg-slate-100 text-slate-400"
                        )}
                      >
                        {expandedRows[u.id] ? <ChevronUp size={18} /> : <Plus size={18} />}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Mobile Detail Row - Renders as a Card */}
                  {expandedRows[u.id] && (
                    <tr className="md:hidden bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                      <td colSpan={3} className="px-4 py-4">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
                          <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-start gap-3">
                               <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Mail size={16}/></div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                                 <a href={`mailto:${u.email}`} className="text-sm font-bold text-slate-700 break-all">{u.email}</a>
                               </div>
                            </div>
                            <div className="flex items-start gap-3">
                               <div className="p-2 bg-green-50 rounded-lg text-green-600"><Phone size={16}/></div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                                 <a href={`tel:${u.phone}`} className="text-sm font-bold text-slate-900">{u.phone}</a>
                               </div>
                            </div>
                            <div className="flex items-start gap-3">
                               <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><MapPin size={16}/></div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Location</p>
                                 <p className="text-sm font-bold text-slate-700">{u.location}</p>
                               </div>
                            </div>
                            <div className="flex items-start gap-3">
                               <div className="p-2 bg-red-50 rounded-lg text-red-600"><Calendar size={16}/></div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Donation</p>
                                 <p className="text-sm font-bold text-slate-700">
                                   {u.lastDonationDate ? new Date(u.lastDonationDate).toLocaleDateString() : 'No History'}
                                 </p>
                               </div>
                            </div>
                          </div>
                          
                          <div className="pt-2">
                             <Button 
                               className="w-full py-4 rounded-xl shadow-lg shadow-red-100 text-xs uppercase font-black tracking-widest"
                               onClick={() => window.location.href = `tel:${u.phone}`}
                             >
                               Call Donor Now
                             </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-400 font-bold">No donors found matching criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export const SystemLogs = () => {
  const { user: admin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filterAction, setFilterAction] = useState('ALL');
  
  useEffect(() => { getLogs().then(setLogs); }, []);

  const getActionBadge = (action: string) => {
    if (action.includes('LOGIN')) return <Badge color="green">LOGIN</Badge>;
    if (action.includes('REGISTER')) return <Badge color="blue">REGISTER</Badge>;
    if (action.includes('DELETE')) return <Badge color="red">DELETED</Badge>;
    if (action.includes('UPDATE')) return <Badge color="yellow">UPDATED</Badge>;
    return <Badge color="gray">{action}</Badge>;
  };

  const handleDeleteLog = async (id: string) => {
    if (!admin) return;
    try {
      await deleteLogEntry(id, admin);
      getLogs().then(setLogs);
    } catch (e) { console.error(e); }
  };

  const filteredLogs = logs.filter(log => filterAction === 'ALL' || log.action.startsWith(filterAction));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Activity Logs</h1>
        <Select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="w-48">
           <option value="ALL">All Actions</option>
           <option value="LOGIN">Logins</option>
           <option value="DONATION">Donations</option>
           <option value="PROFILE">Profiles</option>
           <option value="USER">User Changes</option>
        </Select>
      </div>
      <Card className="overflow-hidden border-0 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-[10px] text-white uppercase tracking-widest font-black">
              <tr>
                <th className="px-6 py-5">Time</th>
                <th className="px-6 py-5">Type</th>
                <th className="px-6 py-5">User</th>
                <th className="px-6 py-5">Action</th>
                <th className="px-6 py-5 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-400 font-mono text-[10px] whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4">{getActionBadge(log.action)}</td>
                  <td className="px-6 py-4 font-bold">{log.userName}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600 min-w-[200px]">{log.details}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeleteLog(log.id)} className="text-slate-300 hover:text-red-600"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export const DeletedRecords = () => {
  const [deletedUsers, setDeletedUsers] = useState<any[]>([]);
  const [deletedDonations, setDeletedDonations] = useState<any[]>([]);
  const [activeArchive, setActiveArchive] = useState<'users' | 'donations'>('users');

  useEffect(() => { 
    getDeletedUsers().then(setDeletedUsers); 
    getDeletedDonations().then(setDeletedDonations);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-xl text-white">
            <Archive size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Archives</h1>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveArchive('users')}
            className={clsx(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              activeArchive === 'users' ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Deleted Users
          </button>
          <button 
            onClick={() => setActiveArchive('donations')}
            className={clsx(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              activeArchive === 'donations' ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Deleted Donations
          </button>
        </div>
      </div>

      <Card className="overflow-hidden shadow-xl border-0">
         <div className="overflow-x-auto">
          {activeArchive === 'users' ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b">
                <tr>
                  <th className="px-6 py-5">Name</th>
                  <th className="px-6 py-5">Role</th>
                  <th className="px-6 py-5">Deleted At</th>
                  <th className="px-6 py-5">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deletedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900">{u.name}</td>
                    <td className="px-6 py-4"><Badge color="gray">{u.role}</Badge></td>
                    <td className="px-6 py-4 text-[10px] font-mono text-slate-400">{new Date(u.deletedAt).toLocaleString()}</td>
                    <td className="px-6 py-4 font-black text-red-600 uppercase text-[10px]">{u.deletedBy}</td>
                  </tr>
                ))}
                {deletedUsers.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-medium">No archived users.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b">
                <tr>
                  <th className="px-6 py-5">Donor</th>
                  <th className="px-6 py-5">Amount</th>
                  <th className="px-6 py-5">Date</th>
                  <th className="px-6 py-5">Deleted At</th>
                  <th className="px-6 py-5">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deletedDonations.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{d.userName}</p>
                      <p className="text-[10px] text-red-600 font-black">{d.userBloodGroup}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">{d.units}ml</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{new Date(d.donationDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-[10px] font-mono text-slate-400">{new Date(d.deletedAt).toLocaleString()}</td>
                    <td className="px-6 py-4 font-black text-red-600 uppercase text-[10px]">{d.deletedBy}</td>
                  </tr>
                ))}
                {deletedDonations.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium">No archived donations.</td></tr>
                )}
              </tbody>
            </table>
          )}
         </div>
      </Card>
    </div>
  );
};
