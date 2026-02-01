import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, changePassword, getAppPermissions } from '../services/api';
import { Card, Input, Button, Select } from '../components/UI';
import { User, BloodGroup, AppPermissions, UserRole } from '../types';
import { UserCircle, Lock, Camera, AlertTriangle } from 'lucide-react';

export const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [pwdMessage, setPwdMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [perms, setPerms] = useState<AppPermissions | null>(null);

  useEffect(() => {
    getAppPermissions().then(setPerms);
  }, []);

  if (!user) return null;

  // Fix: Property 'rules' does not exist on type 'AppPermissions'. 
  // We must access either 'user' or 'editor' properties depending on the user's role.
  const isRestricted = user.role === UserRole.USER 
    ? perms?.user.rules.canEditProfile === false 
    : (user.role === UserRole.EDITOR ? perms?.editor.rules.canEditProfile === false : false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isRestricted) return;
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const updates: Partial<User> = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      location: formData.get('location') as string,
      bloodGroup: formData.get('bloodGroup') as BloodGroup,
      avatar: formData.get('avatar') as string,
    };

    try {
      const updatedUser = await updateUserProfile(user.id, updates, user);
      updateUser(updatedUser);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdMessage(null);

    const formData = new FormData(e.currentTarget);
    const current = formData.get('currentPassword') as string;
    const newPwd = formData.get('newPassword') as string;
    const confirm = formData.get('confirmPassword') as string;

    if (newPwd !== confirm) {
      setPwdMessage({ type: 'error', text: 'New passwords do not match' });
      setPwdLoading(false);
      return;
    }

    try {
      await changePassword(user.id, user.name, current, newPwd);
      setPwdMessage({ type: 'success', text: 'Password changed successfully' });
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setPwdMessage({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
      
      {isRestricted && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex items-center">
            <AlertTriangle className="text-yellow-400 mr-3" size={20} />
            <p className="text-sm text-yellow-700">
              Profile editing has been restricted by the Administrator. Please contact support to change your details.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 overflow-hidden relative group">
                 {user.avatar ? (
                   <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                   <UserCircle size={64} className="text-slate-300" />
                 )}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <p className="text-slate-500 text-sm mb-4">{user.role}</p>
              <span className="inline-flex items-center px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                Blood Group: {user.bloodGroup}
              </span>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Lock size={18} />
              Change Password
            </h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input label="Current Password" name="currentPassword" type="password" required />
              <Input label="New Password" name="newPassword" type="password" required />
              <Input label="Confirm New" name="confirmPassword" type="password" required />
              
              {pwdMessage && (
                <div className={`p-3 rounded-lg text-xs ${pwdMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {pwdMessage.text}
                </div>
              )}
              
              <Button type="submit" variant="secondary" className="w-full" isLoading={pwdLoading}>
                Update Password
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-8 h-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Edit Profile Information</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Full Name" name="name" defaultValue={user.name} disabled={isRestricted} />
              <Input label="Email" value={user.email} disabled className="bg-slate-50 cursor-not-allowed" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Phone" name="phone" defaultValue={user.phone} disabled={isRestricted} />
                <Select label="Blood Group" name="bloodGroup" defaultValue={user.bloodGroup} disabled={isRestricted}>
                   {Object.values(BloodGroup).map(bg => (
                     <option key={bg} value={bg}>{bg}</option>
                   ))}
                </Select>
              </div>
              
              <Input label="Location" name="location" defaultValue={user.location} disabled={isRestricted} />
              <Input 
                label="Profile Picture URL" 
                name="avatar" 
                defaultValue={user.avatar} 
                placeholder="https://example.com/me.jpg"
                disabled={isRestricted}
              />

              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message.text}
                </div>
              )}

              <div className="pt-6 flex justify-end border-t border-slate-100 mt-6">
                <Button type="submit" isLoading={loading} className="px-6" disabled={isRestricted}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};