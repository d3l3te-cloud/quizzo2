import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { 
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { firebaseConfig } from "./js/firebase-init.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export function mountHeader(active = "") {
  const el = document.querySelector(".header .nav");
  if (!el) return;
  el.querySelectorAll("a").forEach(a => {
    if (a.getAttribute("data-active") == active) a.classList.add("active");
  });
}

// ✅ Only ensure doc if profile.html submits it
export async function ensureUserDoc(uid, data) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, data, { merge: true });
}

export function onUser(cb) {
  onAuthStateChanged(auth, async (u) => {
    if (!u) { cb(null); return; }
    const profileRef = doc(db, "users", u.uid);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      cb({ uid: u.uid, email: u.email, ...snap.data() });
    } else {
      cb({ uid: u.uid, email: u.email, profileIncomplete: true });
    }
  });
}

// Email signup → go to profile.html
export async function doEmailSignUp(email, pass) {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  window.location.href = "profile.html";
  return { uid: cred.user.uid, email };
}

// Email login → check profile
export async function doEmailSignIn(email, pass) {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  window.location.href = snap.exists() ? "dashboard.html" : "profile.html";
}

// Google login → check profile
export async function doGoogle() {
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  const snap = await getDoc(doc(db, "users", res.user.uid));
  window.location.href = snap.exists() ? "dashboard.html" : "profile.html";
}

export async function doSignOut() { await signOut(auth); }

// Simple helper to set avatar initials
export function initials(email) { return (email || '?')[0].toUpperCase(); }
