
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole, AppPermissions, RolePermissions } from '../types';
import { getAppPermissions, getUsers } from '../services/api';
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
  ShieldCheck,
  LifeBuoy
} from 'lucide-react';
import clsx from 'clsx';

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [perms, setPerms] = useState<AppPermissions | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    getAppPermissions().then(setPerms);
    
    // Check for pending requests if Admin
    if (user?.role === UserRole.ADMIN) {
      getUsers().then(users => {
        const count = users.filter(u => u.directoryAccessRequested || u.supportAccessRequested).length;
        setPendingRequestsCount(count);
      });
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ to, icon: Icon, label, badge }: { to: string, icon: any, label: string, badge?: number }) => (
    <Link
      to={to}
      onClick={() => setIsMobileMenuOpen(false)}
      className={clsx(
        "flex items-center justify-between px-4 py-3 rounded-lg transition-colors group",
        location.pathname === to 
          ? "bg-red-50 text-red-600 font-medium" 
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span>{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
          {badge}
        </span>
      )}
    </Link>
  );

  const isAdmin = user?.role === UserRole.ADMIN;
  const isEditor = user?.role === UserRole.EDITOR;

  // Role-based permission lookup
  const currentRolePerms: RolePermissions | null = perms ? (
    isAdmin ? {
      sidebar: { dashboard: true, profile: true, history: true, donors: true, users: true, manageDonations: true, logs: true, directoryPermissions: true, supportCenter: true },
      rules: { canEditProfile: true, canViewDonorDirectory: true, canRequestDonation: true, canPerformAction: true, canLogDonation: true }
    } : (isEditor ? perms.editor : perms.user)
  ) : null;

  // Editor specific check for Support Center
  const canSeeSupport = isAdmin || (isEditor && user?.hasSupportAccess) || (user?.role === UserRole.USER);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:transform-none",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Droplet className="text-white fill-current" size={18} />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">BloodLink</span>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {currentRolePerms?.sidebar.dashboard && <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />}
            {currentRolePerms?.sidebar.profile && <NavItem to="/profile" icon={UserCircle} label="My Profile" />}
            {currentRolePerms?.sidebar.donors && <NavItem to="/donors" icon={Search} label="Donor Search" />}
            
            {currentRolePerms?.sidebar.history && (
              <NavItem to="/my-donations" icon={History} label="Donation History" />
            )}
            
            {canSeeSupport && currentRolePerms?.sidebar.supportCenter && (
              <NavItem to="/support" icon={LifeBuoy} label="Support Center" />
            )}
            
            {(isAdmin || isEditor) && (
              <>
                <div className="pt-4 pb-2 px-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Management</span>
                </div>
                {currentRolePerms?.sidebar.users && <NavItem to="/users" icon={Users} label="User Management" />}
                {currentRolePerms?.sidebar.manageDonations && <NavItem to="/manage-donations" icon={Droplet} label="All Donations" />}
                
                {isAdmin && (
                  <>
                    <NavItem to="/notifications" icon={Bell} label="Notifications" badge={pendingRequestsCount} />
                    <NavItem to="/deleted-users" icon={Trash2} label="Delete Records" />
                  </>
                )}
                
                {currentRolePerms?.sidebar.logs && <NavItem to="/logs" icon={FileText} label="System Logs" />}
              </>
            )}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0 border border-slate-200">
                {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="Me" /> : user?.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight">{user?.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Droplet className="text-white fill-current" size={18} />
            </div>
            <span className="font-bold text-slate-800">BloodLink</span>
          </div>
          <div className="flex items-center gap-2">
             {isAdmin && pendingRequestsCount > 0 && (
                <Link to="/notifications" className="p-2 text-red-600 relative">
                   <Bell size={20} />
                   <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse border border-white"></span>
                </Link>
             )}
             <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg">
               <Menu size={24} className="text-slate-600" />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
