
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCzSiaYBDdpFNqUlsNtyvyLxRBu6SIJnQ",
  authDomain: "reconnect-us-hub.firebaseapp.com",
  projectId: "reconnect-us-hub",
  storageBucket: "reconnect-us-hub.firebasestorage.app",
  messagingSenderId: "891220836369",
  appId: "1:891220836369:web:6f2b4a09350b8d9fe0b1b0"
};

// Module scripts do not reliably expose document.currentScript.
// Find this guard's own script tag by its src instead.
const scriptElement =
  document.currentScript ||
  [...document.scripts].find(script =>
    String(script.src || "").includes("reconnectus-access-guard.js")
  );

const appId = String(scriptElement?.dataset.appId || "").trim();
const loginUrl = String(scriptElement?.dataset.loginUrl || "../index.html").trim();

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const style = document.createElement("style");
style.textContent = `
#ruAccessGuard{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;background:linear-gradient(135deg,#071a3a,#0b3d91);font-family:Arial,sans-serif;opacity:1;transition:opacity .18s ease}
#ruAccessGuard .card{width:min(520px,95vw);background:#fff;color:#1f2a33;border-radius:22px;padding:28px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.32)}
#ruAccessGuard h2{margin:0 0 10px;color:#0b3d5c}
#ruAccessGuard p{color:#3d6f8a;line-height:1.55}
#ruAccessGuard button{border:0;border-radius:12px;padding:12px 18px;font-weight:bold;cursor:pointer;margin:6px}
#ruAccessGuard .primary{background:#0097a7;color:#fff}
#ruAccessGuard .secondary{background:#0b3d5c;color:#fff}`;
document.head.appendChild(style);

const overlay = document.createElement("div");
overlay.id = "ruAccessGuard";
overlay.innerHTML = `<div class="card"><h2>Checking Access…</h2><p>Please wait.</p></div>`;
document.body.appendChild(overlay);
document.documentElement.style.overflow = "hidden";

function esc(value){
  return String(value||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function block(message){
  overlay.innerHTML = `<div class="card"><h2>Access Denied</h2><p>${esc(message)}</p><button class="primary" id="ruLogin">Go to Login</button><button class="secondary" id="ruBack">Go Back</button></div>`;
  document.getElementById("ruLogin").onclick=()=>location.href=loginUrl;
  document.getElementById("ruBack").onclick=()=>history.length>1?history.back():location.href=loginUrl;
}
let presenceTimer = null;
let activeProfile = null;
let activeUser = null;

async function writePresence(online=true){
  if(!activeUser || !activeProfile) return;

  try{
    await setDoc(
      doc(db,"presence",activeUser.uid),
      {
        uid: activeUser.uid,
        email: activeUser.email || activeProfile.email || "",
        name: activeProfile.name || activeUser.displayName || "",
        role: activeProfile.role || "learner",
        currentAppId: appId,
        currentPage: location.pathname,
        online,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      { merge:true }
    );
  }catch(error){
    console.warn("RECONNECT-US presence update failed:", error);
  }
}

function startPresence(profile,user){
  activeProfile = profile;
  activeUser = user;

  clearInterval(presenceTimer);
  writePresence(true);

  // Keep the user visible as online while the protected app is open.
  presenceTimer = setInterval(()=>{
    if(document.visibilityState === "visible"){
      writePresence(true);
    }
  },30000);
}

function stopPresence(){
  clearInterval(presenceTimer);
  presenceTimer = null;
  writePresence(false);
}

function allow(profile,user){
  window.ruAccessProfile=profile;
  window.ruAccessUser=user;

  startPresence(profile,user);

  overlay.style.opacity="0";
  setTimeout(()=>{
    overlay.remove();
    document.documentElement.style.overflow="";
  },180);
}
function roleOk(userRole,minRole){
  const order={learner:1,volunteer:2,manager:3,superadmin:4};
  return (order[userRole]||0)>=(order[minRole]||1);
}

let accessDecisionMade = false;

function showChecking(message="Checking your secure access…"){
  if(accessDecisionMade || !document.getElementById("ruAccessGuard")) return;
  overlay.innerHTML = `<div class="card"><h2>Opening RECONNECT-US…</h2><p>${esc(message)}</p></div>`;
}


const APP_ID_ALIASES = {
  "reconnect_information": ["reconnect_information","reconnect-us-information"],
  "reconnect-us-information": ["reconnect-us-information","reconnect_information"],
  "learn_with_reconnect": ["learn_with_reconnect","reconnectuslearning"],
  "reconnectuslearning": ["reconnectuslearning","learn_with_reconnect"],
  "rubiks_cube_centre": ["rubiks_cube_centre","rubiks-cube-centre"],
  "rubiks-cube-centre": ["rubiks-cube-centre","rubiks_cube_centre"],
  "information_support": ["information_support","info"],
  "info": ["info","information_support"],
  "signposting_hub": ["signposting_hub","signposting-hub"],
  "signposting-hub": ["signposting-hub","signposting_hub"],
  "financial_awareness": ["financial_awareness","financial-awareness"],
  "financial-awareness": ["financial-awareness","financial_awareness"],
  "useful_information": ["useful_information","useful"],
  "useful": ["useful","useful_information"],
  "simulator_apps": ["simulator_apps","simulators"],
  "simulators": ["simulators","simulator_apps"],
  "skill_builder_apps": ["skill_builder_apps","skillbuilders"],
  "skillbuilders": ["skillbuilders","skill_builder_apps"],
  "esol_learning": ["esol_learning","esol"],
  "esol": ["esol","esol_learning"],
  "english_learning": ["english_learning","english"],
  "english": ["english","english_learning"],
  "safety": ["safety","presentations"],
  "presentations": ["presentations","safety"],
  "health_help": ["health_help","health-help"],
  "health-help": ["health-help","health_help"],
  "job_search_hub": ["job_search_hub","job-search-hub"],
  "job-search-hub": ["job-search-hub","job_search_hub"],
  "investigation_room": ["investigation_room","investigation-room"],
  "investigation-room": ["investigation-room","investigation_room"],
  "staff_tracker": ["staff_tracker","staff-tracker"],
  "staff-tracker": ["staff-tracker","staff_tracker"],
  "training_policy": ["training_policy","training-policy"],
  "training-policy": ["training-policy","training_policy"],
  "reconnectus_core": ["reconnectus_core","reconnectus-core"],
  "reconnectus-core": ["reconnectus-core","reconnectus_core"]
};

function appIdCandidates(id){
  return [...new Set(APP_ID_ALIASES[id] || [id])];
}

async function findRegisteredApp(id){
  for(const candidate of appIdCandidates(id)){
    const snapshot = await getDoc(doc(db,"apps",candidate));
    if(snapshot.exists()){
      return { id:candidate, snapshot };
    }
  }
  return null;
}

function profileAllowsApp(profile,id,registeredId){
  const allowed = Array.isArray(profile.allowedApps) ? profile.allowedApps : [];
  if(allowed.includes("*")) return true;

  const validIds = new Set([
    ...appIdCandidates(id),
    ...appIdCandidates(registeredId)
  ]);

  return allowed.some(value => validIds.has(value));
}

async function verifyAccess(user){
  if(accessDecisionMade) return;

  if(!appId){
    accessDecisionMade = true;
    return block("This app has no Core App ID.");
  }

  try{
    showChecking("Confirming your account and app permissions.");

    const profileSnap = await getDoc(doc(db,"users",user.uid));
    if(accessDecisionMade) return;

    if(!profileSnap.exists()){
      accessDecisionMade = true;
      return block("Your login has no RECONNECT-US Core profile.");
    }

    const profile = profileSnap.data();

    if(profile.status !== "active"){
      accessDecisionMade = true;
      return block("Your RECONNECT-US account is not active.");
    }

    if(profile.role === "superadmin"){
      accessDecisionMade = true;
      return allow(profile,user);
    }

    const registeredApp = await findRegisteredApp(appId);
    if(accessDecisionMade) return;

    if(!registeredApp){
      accessDecisionMade = true;
      return block("This app is not registered in Core.");
    }

    const registeredAppId = registeredApp.id;
    const appRecord = registeredApp.snapshot.data();

    if((appRecord.status || "active") !== "active"){
      accessDecisionMade = true;
      return block("This app is currently unavailable.");
    }

    const individuallyAllowed = profileAllowsApp(profile,appId,registeredAppId);
    const minimumRole = appRecord.minRole || "learner";

    if(!individuallyAllowed || !roleOk(profile.role,minimumRole)){
      accessDecisionMade = true;
      return block("You do not have permission to use this app.");
    }

    accessDecisionMade = true;
    allow(profile,user);
  }catch(error){
    if(accessDecisionMade) return;
    console.error(error);
    accessDecisionMade = true;
    block("RECONNECT-US could not verify your access.");
  }
}

(async function startAccessCheck(){
  showChecking("Restoring your secure session.");

  try{
    // Wait until Firebase has completely restored the saved login.
    if(typeof auth.authStateReady === "function"){
      await auth.authStateReady();
    }else{
      await new Promise(resolve=>{
        const unsubscribe = onAuthStateChanged(auth,()=>{
          unsubscribe();
          resolve();
        });
      });
    }

    const user = auth.currentUser;

    if(!user){
      accessDecisionMade = true;
      block("You must sign in before opening this app.");
      return;
    }

    await verifyAccess(user);
  }catch(error){
    console.error(error);
    accessDecisionMade = true;
    block("RECONNECT-US could not restore your secure login.");
  }
})();

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState === "visible"){
    writePresence(true);
  }
});

window.addEventListener("pagehide",()=>{
  stopPresence();
});

window.addEventListener("beforeunload",()=>{
  stopPresence();
});
