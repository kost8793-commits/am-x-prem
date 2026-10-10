import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { UserProfile } from '../types';

// AxzyeDev Firebase Project Configuration
export const firebaseConfig = {
  apiKey: 'AIzaSyD8qzK4NbD0Nz9QHe1fF_PCSKBpw65irY4',
  authDomain: 'axzyedev.firebaseapp.com',
  projectId: 'axzyedev',
  storageBucket: 'axzyedev.firebasestorage.app',
  messagingSenderId: '536767247959',
  appId: '1:536767247959:web:5888af376fd2bde205d512',
};

// Initialize or reuse Firebase App instance
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google OAuth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Set persistence to Local Storage
try {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} catch (e) {}

/**
 * Sign in with Google using Firebase Popup
 */
export async function signInWithGoogleFirebase(): Promise<{
  user: User;
  idToken: string;
  profile: UserProfile;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const idToken = await user.getIdToken(true);

    const profile: UserProfile = {
      uid: user.uid,
      idToken,
      email: user.email || 'user@alightmotion.premium',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=3b82f6&color=fff`,
      isLoggedIn: true,
      tier: 'free',
      loginAt: new Date().toISOString(),
      totalActivations: 0,
    };

    saveUserSession(profile);
    return { user, idToken, profile };
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Jendela popup login Google ditutup sebelum selesai.');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('POPUP_BLOCKED');
    } else if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Login Google dibatalkan.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Koneksi internet bermasalah. Periksa jaringan Anda.');
    }
    throw error;
  }
}

/**
 * Quick fallback login with Google profile (ideal for iframe environment where popups are blocked)
 */
export function createGoogleUserProfile(email: string, displayName?: string, photoURL?: string): UserProfile {
  const cleanEmail = email.trim().toLowerCase();
  const name = displayName?.trim() || cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const photo = photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff&bold=true`;

  const profile: UserProfile = {
    uid: 'firebase_' + Math.random().toString(36).substring(2, 12),
    idToken: 'mock_firebase_id_token_' + Date.now(),
    email: cleanEmail,
    displayName: name,
    photoURL: photo,
    isLoggedIn: true,
    tier: 'free',
    loginAt: new Date().toISOString(),
    totalActivations: 0,
  };

  saveUserSession(profile);
  return profile;
}

/**
 * Save user session to localStorage
 */
export function saveUserSession(user: UserProfile) {
  try {
    localStorage.setItem('am_google_user', JSON.stringify(user));
  } catch (e) {}
}

/**
 * Sign out from Firebase and clear session
 */
export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {}
  try {
    localStorage.removeItem('am_google_user');
  } catch (e) {}
}

/**
 * Get current ID token from authenticated Firebase user
 */
export async function getCurrentFirebaseIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (user) {
    try {
      return await user.getIdToken();
    } catch (e) {}
  }
  try {
    const saved = localStorage.getItem('am_google_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.idToken) return parsed.idToken;
    }
  } catch (e) {}
  return null;
}

/**
 * Listen to Firebase Auth state changes
 */
export function onFirebaseAuthStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
