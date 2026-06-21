import React, { createContext, useState, useContext, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Helper function to verify Firestore profile and handle email-matching migrations
  const verifyAndGetProfile = async (firebaseUser) => {
    if (!firebaseUser) return null;
    
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return userDocSnap.data();
    }

    // If UID doc does not exist, check if a doc with email matches in users collection
    if (firebaseUser.email) {
      const q = query(
        collection(db, "users"),
        where("email", "==", firebaseUser.email)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const oldDoc = querySnapshot.docs[0];
        const profileData = oldDoc.data();

        // Migrate profile to new document under Firebase Auth UID
        await setDoc(doc(db, "users", firebaseUser.uid), {
          ...profileData,
          email: firebaseUser.email, // Ensure email matches
        });

        // Delete the old doc if it had a different key
        if (oldDoc.id !== firebaseUser.uid) {
          await deleteDoc(doc(db, "users", oldDoc.id));
        }

        return profileData;
      }
    }

    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const profile = await verifyAndGetProfile(firebaseUser);
          if (profile && profile.status === "active" && profile.role) {
            const profileWithId = {
              ...profile,
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
            };
            setUser(firebaseUser);
            setUserProfile(profileWithId);
            setRole(profile.role);
            setIsAuthenticated(true);
            setAuthError(null);
          } else {
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
            setRole(null);
            setIsAuthenticated(false);
            if (!profile) {
              setAuthError({
                type: "user_not_registered",
                message: "Your account is not authorized.",
              });
            } else if (profile.status !== "active") {
              setAuthError({
                type: "account_disabled",
                message: "Your account has been disabled.",
              });
            } else {
              setAuthError({
                type: "user_not_registered",
                message: "Your account role is not defined.",
              });
            }
          }
        } catch (error) {
          console.error("Auth state change verification error:", error);
          await signOut(auth);
          setUser(null);
          setUserProfile(null);
          setRole(null);
          setIsAuthenticated(false);
          setAuthError({
            type: "user_not_registered",
            message: "Verification failed.",
          });
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setRole(null);
        setIsAuthenticated(false);
        setAuthError(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      const profile = await verifyAndGetProfile(firebaseUser);
      if (!profile) {
        await signOut(auth);
        throw new Error("Your account is not authorized.");
      }

      if (profile.status !== "active") {
        await signOut(auth);
        throw new Error("Your account has been disabled.");
      }

      if (!profile.role) {
        await signOut(auth);
        throw new Error("Your account role is not defined.");
      }

      const profileWithId = {
        ...profile,
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
      };
      setUser(firebaseUser);
      setUserProfile(profileWithId);
      setRole(profile.role);
      setIsAuthenticated(true);
      return { user: firebaseUser, profile };
    } catch (error) {
      setAuthError({
        type: "auth_failed",
        message: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const firebaseUser = userCredential.user;

      const profile = await verifyAndGetProfile(firebaseUser);
      if (!profile) {
        await signOut(auth);
        throw new Error("Your account is not authorized.");
      }

      if (profile.status !== "active") {
        await signOut(auth);
        throw new Error("Your account has been disabled.");
      }

      if (!profile.role) {
        await signOut(auth);
        throw new Error("Your account role is not defined.");
      }

      const profileWithId = {
        ...profile,
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
      };
      setUser(firebaseUser);
      setUserProfile(profileWithId);
      setRole(profile.role);
      setIsAuthenticated(true);
      return { user: firebaseUser, profile };
    } catch (error) {
      setAuthError({
        type: "auth_failed",
        message: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setUserProfile(null);
      setRole(null);
      setIsAuthenticated(false);
      setAuthError(null);
      setLoading(false);
      window.location.href = "/login";
    }
  };

  // Keep compatibility fields for App.jsx
  const isLoadingAuth = loading;
  const isLoadingPublicSettings = false;
  const authChecked = !loading;
  const navigateToLogin = () => {
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role,
        isAuthenticated,
        loading,
        authError,
        isLoadingAuth,
        isLoadingPublicSettings,
        authChecked,
        login,
        logout,
        googleLogin,
        navigateToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
