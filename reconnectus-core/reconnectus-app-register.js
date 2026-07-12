/*
  RECONNECT-US Automatic App Registration
  ---------------------------------------
  Add this script to a RECONNECT-US app once:

  <script type="module"
    src="../reconnectus-core/reconnectus-app-register.js"
    data-app-id="optional-custom-id"
    data-app-name="optional-custom-name"
    data-min-role="learner">
  </script>

  If data-app-id is omitted, the app ID is inferred from the folder name.
  If data-app-name is omitted, document.title is used.
*/

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCzSiaYBDdpFNqUlsNtyvyLxRBu6SIJnQ",
  authDomain: "reconnect-us-hub.firebaseapp.com",
  projectId: "reconnect-us-hub",
  storageBucket: "reconnect-us-hub.firebasestorage.app",
  messagingSenderId: "891220836369",
  appId: "1:891220836369:web:6f2b4a09350b8d9fe0b1b0"
};

const scriptElement = document.currentScript;
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function cleanId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferFolderName() {
  const parts = location.pathname.split("/").filter(Boolean);
  const last = parts.at(-1);
  if (last && last.includes(".")) return parts.at(-2) || "reconnectus-app";
  return last || "reconnectus-app";
}

function normaliseUrl() {
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";

  if (!url.pathname.endsWith("/") && !url.pathname.split("/").at(-1).includes(".")) {
    url.pathname += "/";
  }

  return url.href;
}

const inferredId = cleanId(inferFolderName());
const appId = cleanId(scriptElement?.dataset.appId || inferredId);
const appName = String(
  scriptElement?.dataset.appName ||
  document.querySelector("h1")?.textContent ||
  document.title ||
  appId
).trim();

const minimumRole = cleanId(scriptElement?.dataset.minRole || "learner") || "learner";
const status = cleanId(scriptElement?.dataset.status || "active") || "active";

onAuthStateChanged(auth, async user => {
  if (!user || !appId) return;

  try {
    const profileSnapshot = await getDoc(doc(db, "users", user.uid));
    if (!profileSnapshot.exists()) return;

    const profile = profileSnapshot.data();
    if (profile.status !== "active" || profile.role !== "superadmin") return;

    const appReference = doc(db, "apps", appId);
    const existing = await getDoc(appReference);

    await setDoc(appReference, {
      name: appName,
      url: normaliseUrl(),
      minRole: minimumRole,
      status,
      registrationSource: "automatic",
      firstRegisteredAt: existing.exists()
        ? (existing.data().firstRegisteredAt || serverTimestamp())
        : serverTimestamp(),
      lastRegisteredAt: serverTimestamp(),
      registeredByUid: user.uid,
      registeredByEmail: user.email || "",
      updatedAt: serverTimestamp()
    }, { merge: true });

    window.dispatchEvent(new CustomEvent("reconnectus-app-registered", {
      detail: { appId, appName }
    }));

    console.info(`RECONNECT-US registered app: ${appName} (${appId})`);
  } catch (error) {
    console.warn("RECONNECT-US app registration was skipped:", error);
  }
});
