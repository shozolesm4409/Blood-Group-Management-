
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole, AppPermissions, RolePermissions, DonationStatus } from '../types';
import { getAppPermissions, getUsers, getDonations, subscribeToAllIncomingMessages } from '../services/api';
import { 
  LayoutDashboard, 
  UserCircle, 
  Droplet, 
  Search, 
  FileText, 
  LogOut, 
  Menu, 
  History,
  Users,
  Trash2,
  Bell,
  LifeBuoy
} from 'lucide-react';
import clsx from 'clsx';

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [perms, setPerms] = useState<AppPermissions | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    getAppPermissions().then(setPerms);
    
    if (user?.role === UserRole.ADMIN || user?.role === UserRole.EDITOR) {
      const fetchCounts = async () => {
        try {
          const [users, donations] = await Promise.all([getUsers(), getDonations()]);
          const pendingUsers = users.filter(u => u.directoryAccessRequested || u.supportAccessRequested).length;
          const pendingDonations = donations.filter(d => d.status === DonationStatus.PENDING).length;
          setNotificationCount(pendingUsers + pendingDonations);
        } catch (e) {
          console.error("Failed to fetch notification counts", e);
        }
      };
      fetchCounts();
    }

    if (user) {
      const unsubscribeMessages = subscribeToAllIncomingMessages(user.id, (msgs) => {
        setUnreadMsgCount(msgs.length);
      });
      return () => unsubscribeMessages();
    }
  }, [user, location.pathname]); 

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ to, icon: Icon, label, badge }: { to: string, icon: any, label: string, badge?: number }) => (
    <Link
      to={to}
      onClick={() => setIsMobileMenuOpen(false)}
      className={clsx(
        "flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
        location.pathname === to 
          ? "bg-red-50 text-red-600 font-bold shadow-sm" 
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span className="text-sm">{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
          {badge}
        </span>
      )}
    </Link>
  );

  const isAdmin = user?.role === UserRole.ADMIN;
  const isEditor = user?.role === UserRole.EDITOR;

  const currentRolePerms: RolePermissions | null = perms ? (
    isAdmin ? {
      sidebar: { dashboard: true, profile: true, history: true, donors: true, users: true, manageDonations: true, logs: true, directoryPermissions: true, supportCenter: true },
      rules: { canEditProfile: true, canViewDonorDirectory: true, canRequestDonation: true, canPerformAction: true, canLogDonation: true }
    } : (isEditor ? perms.editor : perms.user)
  ) : null;

  const canSeeSupport = isAdmin || (isEditor && user?.hasSupportAccess) || (user?.role === UserRole.USER);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={clsx(
        "fixed lg:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:transform-none",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-8 border-b border-slate-50 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-100">
              <Droplet className="text-white fill-current" size={22} />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tighter">BloodLink</span>
          </div>

          <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto">
            {currentRolePerms?.sidebar.dashboard && <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />}
            {currentRolePerms?.sidebar.profile && <NavItem to="/profile" icon={UserCircle} label="My Profile" />}
            {currentRolePerms?.sidebar.donors && <NavItem to="/donors" icon={Search} label="Donor Search" />}
            {currentRolePerms?.sidebar.history && <NavItem to="/my-donations" icon={History} label="Donation History" />}
            {canSeeSupport && currentRolePerms?.sidebar.supportCenter && (
              <NavItem to="/support" icon={LifeBuoy} label="Support Center" badge={unreadMsgCount} />
            )}
            
            {(isAdmin || isEditor) && (
              <>
                <div className="pt-6 pb-2 px-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Management</span>
                </div>
                {currentRolePerms?.sidebar.users && <NavItem to="/users" icon={Users} label="User Management" />}
                {currentRolePerms?.sidebar.manageDonations && (
                  <NavItem to="/manage-donations" icon={Droplet} label="All Donations" badge={notificationCount} />
                )}
                {isAdmin && (
                  <>
                    <NavItem to="/notifications" icon={Bell} label="Notification Center" badge={notificationCount} />
                    <NavItem to="/deleted-users" icon={Trash2} label="System Archives" />
                  </>
                )}
                {currentRolePerms?.sidebar.logs && <NavItem to="/logs" icon={FileText} label="Activity Logs" />}
              </>
            )}
          </nav>

          <div className="p-6 border-t border-slate-50">
            <div className="flex items-center gap-4 px-4 py-4 mb-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-white overflow-hidden flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0 border border-slate-200">
                {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="Me" /> : user?.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-tight">{user?.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="lg:hidden bg-white border-b border-slate-200 p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-100">
              <Droplet className="text-white fill-current" size={20} />
            </div>
            <span className="font-black text-slate-900 tracking-tighter text-xl">BloodLink</span>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
               <Menu size={24} className="text-slate-700" />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-5 lg:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
