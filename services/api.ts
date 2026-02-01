
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updatePassword as firebaseUpdatePassword,
  sendPasswordResetEmail,
  signOut 
} from "@firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  addDoc, 
  orderBy,
  limit,
  onSnapshot,
  writeBatch
} from "@firebase/firestore";
import { auth, db } from "./firebase";
import { User, DonationRecord, AuditLog, UserRole, DonationStatus, BloodGroup, AppPermissions, ChatMessage } from '../types';

const COLLECTIONS = {
  USERS: 'users',
  DONATIONS: 'donations',
  LOGS: 'logs',
  DELETED_USERS: 'deleted_users',
  DELETED_DONATIONS: 'deleted_donations',
  SETTINGS: 'settings',
  MESSAGES: 'messages'
};

export const ADMIN_EMAIL = 'shozolesm4409@gmail.com';

const DEFAULT_PERMISSIONS: AppPermissions = {
  user: {
    sidebar: {
      dashboard: true,
      profile: true,
      history: true,
      donors: true,
      directoryPermissions: false,
      supportCenter: true
    },
    rules: {
      canEditProfile: true,
      canViewDonorDirectory: true,
      canRequestDonation: true
    }
  },
  editor: {
    sidebar: {
      dashboard: true,
      profile: true,
      history: true,
      donors: true,
      users: true,
      manageDonations: true,
      logs: true,
      directoryPermissions: false,
      supportCenter: false
    },
    rules: {
      canEditProfile: true,
      canViewDonorDirectory: true,
      canRequestDonation: true,
      canPerformAction: true,
      canLogDonation: true
    }
  }
};

const createLog = async (action: string, userId: string, userName: string, details: string, userAvatar?: string) => {
  try {
    await addDoc(collection(db, COLLECTIONS.LOGS), {
      action,
      userId,
      userName,
      userAvatar: userAvatar || '',
      details,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.debug("Logging inhibited");
  }
};

// --- Added missing exports ---

// Fix: Implement getUserProfile to fetch user data by UID
export const getUserProfile = async (uid: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as User : null;
};

// Fix: Implement resetPassword using Firebase Auth
export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// Fix: Implement changePassword for current authenticated user
export const changePassword = async (userId: string, userName: string, current: string, newPass: string) => {
  if (auth.currentUser) {
    await firebaseUpdatePassword(auth.currentUser, newPass);
    await createLog('PASSWORD_CHANGE', userId, userName, 'User changed their password');
  } else {
    throw new Error("User must be logged in to change password");
  }
};

// Fix: Implement getLogs to fetch all audit trails
export const getLogs = async (): Promise<AuditLog[]> => {
  const q = query(collection(db, COLLECTIONS.LOGS), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
};

// Fix: Implement updateDonationStatus with record tracking
export const updateDonationStatus = async (id: string, status: DonationStatus, admin: User): Promise<void> => {
  const donationRef = doc(db, COLLECTIONS.DONATIONS, id);
  const donationSnap = await getDoc(donationRef);
  
  if (donationSnap.exists()) {
    const donationData = donationSnap.data() as DonationRecord;
    await updateDoc(donationRef, { status });
    
    if (status === DonationStatus.COMPLETED) {
      await updateDoc(doc(db, COLLECTIONS.USERS, donationData.userId), { 
        lastDonationDate: donationData.donationDate 
      });
    }
    
    await createLog('DONATION_STATUS_UPDATE', admin.id, admin.name, `Updated donation ${id} to ${status}`, admin.avatar);
  }
};

// Fix: Implement adminForceChangePassword simulation for frontend (Admin SDK usually handles this)
export const adminForceChangePassword = async (uid: string, newPass: string, admin: User) => {
  await createLog('ADMIN_FORCE_PWD', admin.id, admin.name, `Admin requested password reset for user ${uid}`, admin.avatar);
};

// Fix: Implement archives fetching for deleted records
export const getDeletedUsers = async () => {
  const q = query(collection(db, COLLECTIONS.DELETED_USERS), orderBy('deletedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getDeletedDonations = async () => {
  const q = query(collection(db, COLLECTIONS.DELETED_DONATIONS), orderBy('deletedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Fix: Implement deleteDonationRecord with archive movement
export const deleteDonationRecord = async (id: string, admin: User) => {
  const ref = doc(db, COLLECTIONS.DONATIONS, id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await addDoc(collection(db, COLLECTIONS.DELETED_DONATIONS), { 
      ...snap.data(), 
      deletedAt: new Date().toISOString(), 
      deletedBy: admin.name 
    });
    await deleteDoc(ref);
    await createLog('DONATION_DELETE', admin.id, admin.name, `Deleted donation ${id}`, admin.avatar);
  }
};

// Fix: Implement support and directory access handlers
export const handleSupportAccess = async (userId: string, approved: boolean, admin: User) => {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), { hasSupportAccess: approved, supportAccessRequested: false });
  await createLog('SUPPORT_ACCESS_UPDATE', admin.id, admin.name, `${approved ? 'Approved' : 'Rejected'} support access for ${userId}`, admin.avatar);
};

export const requestSupportAccess = async (user: User) => {
  await updateDoc(doc(db, COLLECTIONS.USERS, user.id), { supportAccessRequested: true });
};

export const deleteLogEntry = async (id: string, admin: User) => {
  await deleteDoc(doc(db, COLLECTIONS.LOGS, id));
};

// Fix: Implement chat subscriptions and status management
export const subscribeToAllSupportRooms = (callback: (msgs: ChatMessage[]) => void, onError?: (err: any) => void) => {
  const q = query(collection(db, COLLECTIONS.MESSAGES), orderBy('timestamp', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
  }, onError);
};

export const subscribeToAllIncomingMessages = (userId: string, callback: (msgs: ChatMessage[]) => void, onError?: (err: any) => void) => {
  const q = query(collection(db, COLLECTIONS.MESSAGES), where('receiverId', '==', userId), where('read', '==', false));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
  }, onError);
};

export const markMessagesAsRead = async (roomId: string, userId: string) => {
  const q = query(collection(db, COLLECTIONS.MESSAGES), where('roomId', '==', roomId), where('receiverId', '==', userId), where('read', '==', false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    batch.update(d.ref, { read: true });
  });
  await batch.commit();
};

// --- Updated existing signatures ---

export const getAppPermissions = async (): Promise<AppPermissions> => {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'permissions');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { ...DEFAULT_PERMISSIONS, ...docSnap.data() } as AppPermissions : DEFAULT_PERMISSIONS;
  } catch {
    return DEFAULT_PERMISSIONS;
  }
};

export const updateAppPermissions = async (perms: AppPermissions, admin: User): Promise<void> => {
  await setDoc(doc(db, COLLECTIONS.SETTINGS, 'permissions'), perms);
  await createLog('PERMISSIONS_UPDATE', admin.id, admin.name, 'Admin updated permissions', admin.avatar);
};

export const login = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (!userDoc.exists()) {
    const newUser: User = {
      id: uid,
      role: isAdminEmail ? UserRole.ADMIN : UserRole.USER,
      name: userCredential.user.displayName || email.split('@')[0],
      email: email,
      bloodGroup: BloodGroup.O_POS,
      location: 'New York',
      phone: '',
      hasDirectoryAccess: isAdminEmail,
      hasSupportAccess: true,
    };
    await setDoc(doc(db, COLLECTIONS.USERS, uid), newUser);
    return newUser;
  }
  const data = userDoc.data() as User;
  if (isAdminEmail && data.role !== UserRole.ADMIN) {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), { role: UserRole.ADMIN, hasDirectoryAccess: true });
    data.role = UserRole.ADMIN;
  }
  await createLog('LOGIN', uid, data.name, 'Login successful', data.avatar);
  return data;
};

export const register = async (data: any): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
  const uid = userCredential.user.uid;
  const isAdmin = data.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  
  const newUser: User = {
    id: uid,
    role: isAdmin ? UserRole.ADMIN : UserRole.USER,
    name: data.name,
    email: data.email,
    bloodGroup: data.bloodGroup as BloodGroup,
    phone: data.phone,
    location: data.location,
    avatar: data.avatar || '',
    hasDirectoryAccess: isAdmin,
    hasSupportAccess: true,
  };

  await setDoc(doc(db, COLLECTIONS.USERS, uid), newUser);
  await createLog('REGISTER', uid, data.name, 'Registration successful', newUser.avatar);
  return newUser;
};

export const logoutUser = async (user: User | null) => {
  if (user) await createLog('LOGOUT', user.id, user.name, 'User signed out', user.avatar);
  await signOut(auth);
};

export const getDonations = async (): Promise<DonationRecord[]> => {
  const q = query(collection(db, COLLECTIONS.DONATIONS), orderBy('donationDate', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DonationRecord));
};

export const getUserDonations = async (userId: string): Promise<DonationRecord[]> => {
  const q = query(collection(db, COLLECTIONS.DONATIONS), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DonationRecord)).sort((a,b) => b.donationDate.localeCompare(a.donationDate));
};

export const addDonation = async (donation: Omit<DonationRecord, 'id' | 'status'> & { status?: DonationStatus }, performer: User): Promise<DonationRecord> => {
  const status = donation.status || DonationStatus.PENDING;
  const docRef = await addDoc(collection(db, COLLECTIONS.DONATIONS), { ...donation, status });
  if (status === DonationStatus.COMPLETED) {
    await updateDoc(doc(db, COLLECTIONS.USERS, donation.userId), { lastDonationDate: donation.donationDate });
  }
  await createLog('DONATION_ADD', performer.id, performer.name, `Added donation for ${donation.userName}`, performer.avatar);
  return { ...donation, status, id: docRef.id };
};

export const getUsers = async (): Promise<User[]> => {
  const snap = await getDocs(collection(db, COLLECTIONS.USERS));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const updateUserProfile = async (userId: string, data: Partial<User>, performer: User): Promise<User> => {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), data);
  const updated = await getDoc(doc(db, COLLECTIONS.USERS, userId));
  return { id: updated.id, ...updated.data() } as User;
};

export const deleteUserRecord = async (userId: string, admin: User): Promise<void> => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    await addDoc(collection(db, COLLECTIONS.DELETED_USERS), { ...userSnap.data(), deletedAt: new Date().toISOString(), deletedBy: admin.name });
    await deleteDoc(userRef);
  }
};

// Fix: Update subscribeToRoomMessages to support an optional onError callback for handling permission errors
export const subscribeToRoomMessages = (roomId: string, callback: (msgs: ChatMessage[]) => void, onError?: (err: any) => void) => {
  const q = query(collection(db, COLLECTIONS.MESSAGES), where('roomId', '==', roomId), orderBy('timestamp', 'asc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
  }, onError);
};

export const sendMessage = async (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
  await addDoc(collection(db, COLLECTIONS.MESSAGES), { ...msg, timestamp: new Date().toISOString(), read: false });
};

export const requestDirectoryAccess = async (user: User) => {
  await updateDoc(doc(db, COLLECTIONS.USERS, user.id), { directoryAccessRequested: true });
};

export const handleDirectoryAccess = async (userId: string, approved: boolean, admin: User) => {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), { hasDirectoryAccess: approved, directoryAccessRequested: false });
};
