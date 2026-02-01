
import { User, DonationRecord, AuditLog, UserRole, DonationStatus } from '../types';
import { SEED_USERS, SEED_DONATIONS, MOCK_DELAY } from '../constants';

const STORAGE_KEYS = {
  USERS: 'bloodlink_users',
  DONATIONS: 'bloodlink_donations',
  LOGS: 'bloodlink_logs',
  SESSION: 'bloodlink_session'
};

// --- Helpers ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple hash simulation for demo purposes (In production, use bcrypt/argon2 on backend)
const fakeHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16) + 'x' + str.length;
};

const getStorage = <T>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultVal;
};

const setStorage = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Fix: Added userName parameter and property to match AuditLog interface requirements
const createLog = (action: string, userId: string, userName: string, details: string) => {
  const logs = getStorage<AuditLog[]>(STORAGE_KEYS.LOGS, []);
  const newLog: AuditLog = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    action,
    userId,
    userName,
    details
  };
  setStorage(STORAGE_KEYS.LOGS, [newLog, ...logs]);
};

// --- Initialize DB ---
const initDB = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    // Hash passwords for seed users
    const hashedSeedUsers = SEED_USERS.map(u => ({
      ...u,
      password: fakeHash(u.password)
    }));
    setStorage(STORAGE_KEYS.USERS, hashedSeedUsers);
  }
  if (!localStorage.getItem(STORAGE_KEYS.DONATIONS)) {
    setStorage(STORAGE_KEYS.DONATIONS, SEED_DONATIONS);
  }
};

initDB();

// --- Auth Services ---
export const mockLogin = async (email: string, password: string): Promise<User> => {
  await delay(MOCK_DELAY);
  const users = getStorage<any[]>(STORAGE_KEYS.USERS, []);
  const hashedInput = fakeHash(password);
  
  // Check against hashed password
  const user = users.find(u => u.email === email && u.password === hashedInput);
  
  if (!user) throw new Error("Invalid credentials");
  
  const { password: _, ...safeUser } = user;
  // Fix: Pass safeUser.name to match updated createLog signature
  createLog('LOGIN', safeUser.id, safeUser.name, 'User logged in');
  return safeUser;
};

export const mockRegister = async (data: any): Promise<User> => {
  await delay(MOCK_DELAY);
  const users = getStorage<any[]>(STORAGE_KEYS.USERS, []);
  
  if (users.find(u => u.email === data.email)) {
    throw new Error("Email already exists");
  }

  const newUser = {
    id: Math.random().toString(36).substr(2, 9),
    role: UserRole.USER,
    ...data,
    password: fakeHash(data.password) // Hash on register
  };

  users.push(newUser);
  setStorage(STORAGE_KEYS.USERS, users);
  // Fix: Pass newUser.name to match updated createLog signature
  createLog('REGISTER', newUser.id, newUser.name, 'New user registered');

  const { password: _, ...safeUser } = newUser;
  return safeUser;
};

export const changePassword = async (userId: string, current: string, newPass: string): Promise<void> => {
  await delay(MOCK_DELAY);
  const users = getStorage<any[]>(STORAGE_KEYS.USERS, []);
  const idx = users.findIndex(u => u.id === userId);
  
  if (idx === -1) throw new Error("User not found");
  
  if (users[idx].password !== fakeHash(current)) {
    throw new Error("Current password is incorrect");
  }

  users[idx].password = fakeHash(newPass);
  setStorage(STORAGE_KEYS.USERS, users);
  // Fix: Pass users[idx].name to match updated createLog signature
  createLog('PASSWORD_CHANGE', userId, users[idx].name, 'User changed password');
};

// --- Data Services ---
export const getDonations = async (): Promise<DonationRecord[]> => {
  await delay(MOCK_DELAY / 2);
  return getStorage<DonationRecord[]>(STORAGE_KEYS.DONATIONS, []);
};

export const getUserDonations = async (userId: string): Promise<DonationRecord[]> => {
  await delay(MOCK_DELAY / 2);
  const all = getStorage<DonationRecord[]>(STORAGE_KEYS.DONATIONS, []);
  return all.filter(d => d.userId === userId);
};

// Fixed type definition to correctly make status optional by omitting it from DonationRecord first
export const addDonation = async (donation: Omit<DonationRecord, 'id' | 'status'> & { status?: DonationStatus }): Promise<DonationRecord> => {
  await delay(MOCK_DELAY);
  const donations = getStorage<DonationRecord[]>(STORAGE_KEYS.DONATIONS, []);
  const newDonation: DonationRecord = {
    ...donation,
    id: Math.random().toString(36).substr(2, 9),
    status: donation.status || DonationStatus.PENDING
  };
  
  setStorage(STORAGE_KEYS.DONATIONS, [newDonation, ...donations]);
  // Fix: Pass donation.userName to match updated createLog signature
  createLog('DONATION_ADD', donation.userId, donation.userName, `Added donation record of ${donation.units}ml`);
  
  // If added as completed, update user date immediately
  if (newDonation.status === DonationStatus.COMPLETED) {
    const users = getStorage<any[]>(STORAGE_KEYS.USERS, []);
    const uIdx = users.findIndex(u => u.id === donation.userId);
    if (uIdx > -1) {
      users[uIdx].lastDonationDate = donation.donationDate;
      setStorage(STORAGE_KEYS.USERS, users);
    }
  }

  return newDonation;
};

export const updateDonationStatus = async (id: string, status: DonationStatus, adminId: string): Promise<void> => {
  await delay(MOCK_DELAY);
  const donations = getStorage<DonationRecord[]>(STORAGE_KEYS.DONATIONS, []);
  const idx = donations.findIndex(d => d.id === id);
  if (idx > -1) {
    donations[idx].status = status;
    setStorage(STORAGE_KEYS.DONATIONS, donations);
    
    // Fix: Find admin user to provide userName to createLog
    const users = getStorage<any[]>(STORAGE_KEYS.USERS, []);
    const admin = users.find(u => u.id === adminId);
    createLog('DONATION_UPDATE', adminId, admin?.name || 'Admin', `Updated donation ${id} status to ${status}`);
    
    // Update user last donation date if completed
    if (status === DonationStatus.COMPLETED) {
      const uIdx = users.findIndex(u => u.id === donations[idx].userId);
      if (uIdx > -1) {
        users[uIdx].lastDonationDate = donations[idx].donationDate;
        setStorage(STORAGE_KEYS.USERS, users);
      }
    }
  }
};

export const getUsers = async (): Promise<User[]> => {
  await delay(MOCK_DELAY);
  const users = getStorage<any[]>(STORAGE_KEYS.USERS, []);
  return users.map(({ password, ...u }) => u);
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<User> => {
  await delay(MOCK_DELAY);
  const users = getStorage<any[]>(STORAGE_KEYS.USERS, []);
  const idx = users.findIndex(u => u.id === userId);
  
  if (idx === -1) throw new Error("User not found");
  
  const updatedUser = { ...users[idx], ...data };
  users[idx] = updatedUser;
  setStorage(STORAGE_KEYS.USERS, users);
  // Fix: Pass updatedUser.name to match updated createLog signature
  createLog('PROFILE_UPDATE', userId, updatedUser.name, 'User updated profile details');
  
  const { password: _, ...safeUser } = updatedUser;
  return safeUser;
};

export const getLogs = async (): Promise<AuditLog[]> => {
  await delay(MOCK_DELAY);
  return getStorage<AuditLog[]>(STORAGE_KEYS.LOGS, []);
};
