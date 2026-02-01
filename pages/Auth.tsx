import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, register as apiRegister, resetPassword, ADMIN_EMAIL } from '../services/api';
import { Card, Input, Button, Select } from '../components/UI';
import { Droplet, AlertCircle } from 'lucide-react';
import { BLOOD_GROUPS } from '../constants';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    const formData = new FormData(e.currentTarget);
    const pwd = formData.get('password') as string;
    
    try {
      const user = await apiLogin(email, pwd);
      login(user);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      let msg = "Failed to login.";
      
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = "Invalid email or password.";
      } else if (err.code === 'auth/too-many-requests') {
        msg = "Access temporarily disabled due to too many failed attempts.";
      } else if (err.message) {
        msg = err.message;
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    try {
      await resetPassword(email);
      setSuccess("Password reset email sent!");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200">
          <Droplet className="text-white fill-current w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">BloodLink Manager</h1>
        <p className="text-slate-500 mt-2">Sign in to your account</p>
      </div>

      <Card className="w-full max-w-md p-8 shadow-xl border-t-4 border-red-600">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="Email Address" 
            name="email" 
            type="email" 
            required 
            placeholder="Enter your email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="text-xs text-red-600 hover:text-red-700 font-semibold"
              >
                Forgot Password?
              </button>
            </div>
            <Input 
              name="password" 
              type="password" 
              required 
              placeholder="••••••••" 
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100">
              {success}
            </div>
          )}

          <Button type="submit" className="w-full py-3" isLoading={loading}>
            Sign In
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
          New to the platform?{' '}
          <Link to="/register" className="text-red-600 hover:text-red-700 font-bold">
            Create an account
          </Link>
        </div>
      </Card>
    </div>
  );
};

export const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const user = await apiRegister(data);
      login(user);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      let msg = "Failed to register";
      if (err.code === 'auth/email-already-in-use') {
        msg = "Email is already registered.";
      } else if (err.code === 'auth/weak-password') {
        msg = "Password should be at least 6 characters.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Account</h1>
        <p className="text-slate-500 mt-2">Join the life-saving donor community</p>
      </div>

      <Card className="w-full max-w-md p-8 shadow-xl border-t-4 border-red-600">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full Name" name="name" required placeholder="John Doe" />
          <Input label="Email Address" name="email" type="email" required placeholder="john@example.com" />
          
          <div className="grid grid-cols-2 gap-4">
            <Select label="Blood Group" name="bloodGroup" required>
              {BLOOD_GROUPS.map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </Select>
            <Input label="Phone" name="phone" required placeholder="555-0123" />
          </div>
          <Input label="Location (City)" name="location" required placeholder="New York" />
          <Input label="Password" name="password" type="password" required />
          <Input label="Confirm Password" name="confirmPassword" type="password" required />

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full py-3 mt-4" isLoading={loading}>
            Create Account
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-red-600 hover:text-red-700 font-bold">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
};