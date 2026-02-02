
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, changePassword, getAppPermissions } from '../services/api';
// Fix: Added Badge to the UI component imports to resolve reference error on line 86
import { Card, Input, Button, Select, Badge } from '../components/UI';
import { User, BloodGroup, AppPermissions, UserRole } from '../types';
import { UserCircle, Lock, Camera, AlertTriangle } from 'lucide-react';

export const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [perms, setPerms] = useState<AppPermissions | null>(null);

  useEffect(() => {
    getAppPermissions().then(setPerms);
  }, []);

  if (!user) return null;

  const isRestricted = user.role === UserRole.USER 
    ? perms?.user.rules.canEditProfile === false 
    : (user.role === UserRole.EDITOR ? perms?.editor.rules.canEditProfile === false : false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isRestricted) return;
    setLoading(true);
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
      alert("Profile updated successfully.");
    } catch (err) {
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwdLoading(true);
    const formData = new FormData(e.currentTarget);
    const current = formData.get('currentPassword') as string;
    const newPwd = formData.get('newPassword') as string;
    const confirm = formData.get('confirmPassword') as string;

    if (newPwd !== confirm) {
      alert("New passwords do not match.");
      setPwdLoading(false);
      return;
    }

    try {
      await changePassword(user.id, user.name, current, newPwd);
      alert("Password updated successfully.");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      alert(err.message || 'Failed to update password.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 overflow-hidden shadow-inner">
                 {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <UserCircle size={64} className="text-slate-300" />}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <Badge color="red" className="mt-2">{user.bloodGroup}</Badge>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Lock size={18} /> Security</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input label="Current Password" name="currentPassword" type="password" required />
              <Input label="New Password" name="newPassword" type="password" required />
              <Input label="Confirm New" name="confirmPassword" type="password" required />
              <Button type="submit" variant="secondary" className="w-full" isLoading={pwdLoading}>Change PIN</Button>
            </form>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="p-8">
            <h3 className="text-lg font-semibold mb-6">Edit Identity</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Name" name="name" defaultValue={user.name} disabled={isRestricted} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Phone" name="phone" defaultValue={user.phone} disabled={isRestricted} />
                <Select label="Group" name="bloodGroup" defaultValue={user.bloodGroup} disabled={isRestricted}>
                   {Object.values(BloodGroup).map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </Select>
              </div>
              <Input label="City" name="location" defaultValue={user.location} disabled={isRestricted} />
              <Input label="Photo URL" name="avatar" defaultValue={user.avatar} disabled={isRestricted} />
              <div className="pt-6 border-t mt-6 flex justify-end"><Button type="submit" isLoading={loading} disabled={isRestricted}>Save Changes</Button></div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
