
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

export const ADMIN_EMAIL = 'shozolesm4409@gmail.com'.trim().toLowerCase();

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
    console.debug("Audit logging failed. This is usually due to /logs rules.");
  }
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as User : null;
  } catch (e) {
    return null;
  }
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const changePassword = async (userId: string, userName: string, current: string, newPass: string) => {
  if (auth.currentUser) {
    await firebaseUpdatePassword(auth.currentUser, newPass);
    const u = await getUserProfile(userId);
    await createLog('PASSWORD_CHANGE', userId, userName, 'User changed their password', u?.avatar);
  } else {
    throw new Error("User must be logged in to change password");
  }
};

export const getLogs = async (): Promise<AuditLog[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.LOGS), orderBy('timestamp', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
  } catch (e: any) {
    return [];
  }
};

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

export const adminForceChangePassword = async (uid: string, newPass: string, admin: User) => {
  await createLog('ADMIN_FORCE_PWD', admin.id, admin.name, `Admin requested password reset for user ${uid}`, admin.avatar);
};

export const getDeletedUsers = async () => {
  try {
    const q = query(collection(db, COLLECTIONS.DELETED_USERS), orderBy('deletedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e: any) {
    return [];
  }
};

export const getDeletedDonations = async () => {
  try {
    const q = query(collection(db, COLLECTIONS.DELETED_DONATIONS), orderBy('deletedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e: any) {
    return [];
  }
};

export const deleteDonationRecord = async (id: string, admin: User) => {
  const ref = doc(db, COLLECTIONS.DONATIONS, id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    // 1. Move to Archive (Create)
    await addDoc(collection(db, COLLECTIONS.DELETED_DONATIONS), { 
      ...snap.data(), 
      deletedAt: new Date().toISOString(), 
      deletedBy: admin.name 
    });
    // 2. Remove from Active (Delete)
    await deleteDoc(ref);
    await createLog('DONATION_DELETE', admin.id, admin.name, `System Archive: Donation record ${id} removed.`, admin.avatar);
  }
};

export const handleSupportAccess = async (userId: string, approved: boolean, admin: User) => {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), { hasSupportAccess: approved, supportAccessRequested: false });
  await createLog('SUPPORT_ACCESS_UPDATE', admin.id, admin.name, `${approved ? 'Approved' : 'Rejected'} support access for ${userId}`, admin.avatar);
};

export const requestSupportAccess = async (user: User) => {
  await updateDoc(doc(db, COLLECTIONS.USERS, user.id), { supportAccessRequested: true });
};

export const deleteLogEntry = async (id: string, admin: User) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.LOGS, id));
  } catch (e) {
    console.debug("Log deletion failed. Verify Firestore rules for /logs.");
  }
};

export const subscribeToAllSupportRooms = (callback: (msgs: ChatMessage[]) => void, onError?: (err: any) => void) => {
  const q = query(collection(db, COLLECTIONS.MESSAGES), orderBy('timestamp', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
  }, (err) => {
    if (onError) onError(err);
  });
};

export const subscribeToAllIncomingMessages = (userId: string, callback: (msgs: ChatMessage[]) => void, onError?: (err: any) => void) => {
  const q = query(collection(db, COLLECTIONS.MESSAGES), where('receiverId', '==', userId), where('read', '==', false));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
  }, (err) => {
    if (onError) onError(err);
  });
};

export const markMessagesAsRead = async (roomId: string, userId: string) => {
  try {
    const q = query(collection(db, COLLECTIONS.MESSAGES), where('roomId', '==', roomId), where('receiverId', '==', userId), where('read', '==', false));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (e) {
    console.debug("Mark read suppressed.");
  }
};

export const getAppPermissions = async (): Promise<AppPermissions> => {
  // Check LocalStorage first for instant UI response
  const local = localStorage.getItem('bloodlink_permissions_override');
  if (local) return JSON.parse(local) as AppPermissions;

  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'permissions');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { ...DEFAULT_PERMISSIONS, ...docSnap.data() } as AppPermissions : DEFAULT_PERMISSIONS;
  } catch {
    return DEFAULT_PERMISSIONS;
  }
};

/**
 * Updates application permissions in Cloud.
 */
export const updateAppPermissions = async (perms: AppPermissions, admin: User): Promise<{ synced: boolean, error?: string }> => {
  const isSuperAdmin = admin.email.trim().toLowerCase() === ADMIN_EMAIL;
  
  if (!isSuperAdmin) {
    throw new Error("Only the System Administrator can modify global permissions.");
  }
  
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'permissions');
    // This will trigger 'Permission Denied' if Step 1 rules aren't applied correctly
    await setDoc(docRef, perms);
    localStorage.removeItem('bloodlink_permissions_override');
    await createLog('PERMISSIONS_UPDATE', admin.id, admin.name, 'Admin updated global system rules.', admin.avatar);
    return { synced: true };
  } catch (e: any) {
    if (e?.code === 'permission-denied') {
      // Emergency fallback for UI testing
      localStorage.setItem('bloodlink_permissions_override', JSON.stringify(perms));
      return { synced: false, error: "Security Policy Block: Cloud sync was denied. Rules saved locally for this browser. Please ensure Step 1 Firestore Rules are applied." };
    }
    throw e;
  }
};

export const login = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  const normalizedEmail = email.trim().toLowerCase();
  const isAdminEmail = normalizedEmail === ADMIN_EMAIL;

  if (!userDoc.exists()) {
    const newUser: User = {
      id: uid,
      role: isAdminEmail ? UserRole.ADMIN : UserRole.USER,
      name: userCredential.user.displayName || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      bloodGroup: BloodGroup.O_POS,
      location: 'Unspecified',
      phone: '',
      hasDirectoryAccess: isAdminEmail,
      hasSupportAccess: true,
    };
    await setDoc(doc(db, COLLECTIONS.USERS, uid), newUser);
    return newUser;
  }
  
  const data = userDoc.data() as User;
  
  // Sync Super Admin access on every login
  if (isAdminEmail && (data.role !== UserRole.ADMIN || !data.hasDirectoryAccess)) {
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, uid), { 
        role: UserRole.ADMIN, 
        hasDirectoryAccess: true 
      });
      data.role = UserRole.ADMIN;
      data.hasDirectoryAccess = true;
    } catch (e) {
      console.error("SuperAdmin role sync failed. Check rules for /users.");
    }
  }
  
  await createLog('LOGIN', uid, data.name, 'Authenticated successfully.', data.avatar);
  return data;
};

export const register = async (data: any): Promise<User> => {
  const normalizedEmail = data.email.trim().toLowerCase();
  const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, data.password);
  const uid = userCredential.user.uid;
  const isAdmin = normalizedEmail === ADMIN_EMAIL;
  
  const newUser: User = {
    id: uid,
    role: isAdmin ? UserRole.ADMIN : UserRole.USER,
    name: data.name,
    email: normalizedEmail,
    bloodGroup: data.bloodGroup as BloodGroup,
    phone: data.phone,
    location: data.location,
    avatar: data.avatar || '',
    hasDirectoryAccess: isAdmin,
    hasSupportAccess: true,
  };

  await setDoc(doc(db, COLLECTIONS.USERS, uid), newUser);
  await createLog('REGISTER', uid, data.name, 'Profile initialized.', newUser.avatar);
  return newUser;
};

export const logoutUser = async (user: User | null) => {
  if (user) await createLog('LOGOUT', user.id, user.name, 'Session closed.', user.avatar);
  await signOut(auth);
};

export const getDonations = async (): Promise<DonationRecord[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.DONATIONS), orderBy('donationDate', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DonationRecord));
  } catch (e) {
    return [];
  }
};

export const getUserDonations = async (userId: string): Promise<DonationRecord[]> => {
  try {
    const q = query(collection(db, COLLECTIONS.DONATIONS), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DonationRecord)).sort((a,b) => b.donationDate.localeCompare(a.donationDate));
  } catch (e) {
    return [];
  }
};

export const addDonation = async (donation: Omit<DonationRecord, 'id' | 'status'> & { status?: DonationStatus }, performer: User): Promise<DonationRecord> => {
  const status = donation.status || DonationStatus.PENDING;
  const docRef = await addDoc(collection(db, COLLECTIONS.DONATIONS), { ...donation, status });
  if (status === DonationStatus.COMPLETED) {
    await updateDoc(doc(db, COLLECTIONS.USERS, donation.userId), { lastDonationDate: donation.donationDate });
  }
  await createLog('DONATION_ADD', performer.id, performer.name, `Logged ${donation.units}ml for ${donation.userName}.`, performer.avatar);
  return { ...donation, status, id: docRef.id };
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.USERS));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (e) {
    return [];
  }
};

export const updateUserProfile = async (userId: string, data: Partial<User>, performer: User): Promise<User> => {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), data);
  const updated = await getDoc(doc(db, COLLECTIONS.USERS, userId));
  const user = { id: updated.id, ...updated.data() } as User;
  await createLog('PROFILE_UPDATE', performer.id, performer.name, `Updated account: ${user.name}`, performer.avatar);
  return user;
};

export const deleteUserRecord = async (userId: string, admin: User): Promise<void> => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data() as User;
    // Archive before deletion
    await addDoc(collection(db, COLLECTIONS.DELETED_USERS), { ...userData, deletedAt: new Date().toISOString(), deletedBy: admin.name });
    await deleteDoc(userRef);
    await createLog('USER_DELETE', admin.id, admin.name, `Account Purged: ${userData.name}`, admin.avatar);
  }
};

export const subscribeToRoomMessages = (roomId: string, callback: (msgs: ChatMessage[]) => void, onError?: (err: any) => void) => {
  const q = query(collection(db, COLLECTIONS.MESSAGES), where('roomId', '==', roomId), orderBy('timestamp', 'asc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
  }, (err) => {
    if (onError) onError(err);
  });
};

export const sendMessage = async (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
  await addDoc(collection(db, COLLECTIONS.MESSAGES), { ...msg, timestamp: new Date().toISOString(), read: false });
};

export const requestDirectoryAccess = async (user: User) => {
  await updateDoc(doc(db, COLLECTIONS.USERS, user.id), { directoryAccessRequested: true });
};

export const handleDirectoryAccess = async (userId: string, approved: boolean, admin: User) => {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), { hasDirectoryAccess: approved, directoryAccessRequested: false });
  await createLog('DIRECTORY_ACCESS_UPDATE', admin.id, admin.name, `Directory Access ${approved ? 'Granted' : 'Revoked'} for ${userId}`, admin.avatar);
};
