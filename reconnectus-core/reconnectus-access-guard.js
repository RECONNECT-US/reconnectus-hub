
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCzSiaYBDdpFNqUlsNtyvyLxRBu6SIJnQ",
  authDomain: "reconnect-us-hub.firebaseapp.com",
  projectId: "reconnect-us-hub",
  storageBucket: "reconnect-us-hub.firebasestorage.app",
  messagingSenderId: "891220836369",
  appId: "1:891220836369:web:6f2b4a09350b8d9fe0b1b0"
};

const scriptElement = document.currentScript;
const appId = String(scriptElement?.dataset.appId || "").trim();
const loginUrl = String(scriptElement?.dataset.loginUrl || "../index.html").trim();

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const style = document.createElement("style");
style.textContent = `
#ruAccessGuard{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;background:linear-gradient(135deg,#071a3a,#0b3d91);font-family:Arial,sans-serif}
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
function allow(profile,user){
  overlay.remove();
  document.documentElement.style.overflow="";
  window.ruAccessProfile=profile;
  window.ruAccessUser=user;
}
function roleOk(userRole,minRole){
  const order={learner:1,volunteer:2,manager:3,superadmin:4};
  return (order[userRole]||0)>=(order[minRole]||1);
}

onAuthStateChanged(auth, async user=>{
  if(!appId) return block("This app has no Core App ID.");
  if(!user) return block("You must sign in before opening this app.");

  try{
    const profileSnap=await getDoc(doc(db,"users",user.uid));
    if(!profileSnap.exists()) return block("Your login has no RECONNECT-US Core profile.");

    const profile=profileSnap.data();
    if(profile.status!=="active") return block("Your RECONNECT-US account is not active.");
    if(profile.role==="superadmin") return allow(profile,user);

    const appSnap=await getDoc(doc(db,"apps",appId));
    if(!appSnap.exists()) return block("This app is not registered in Core.");

    const appRecord=appSnap.data();
    if((appRecord.status||"active")!=="active") return block("This app is currently unavailable.");

    const allowed=Array.isArray(profile.allowedApps)?profile.allowedApps:[];
    const individuallyAllowed=allowed.includes("*")||allowed.includes(appId);
    const minimumRole=appRecord.minRole||"learner";

    if(!individuallyAllowed && !roleOk(profile.role,minimumRole)){
      return block("You do not have permission to use this app.");
    }
    allow(profile,user);
  }catch(error){
    console.error(error);
    block("RECONNECT-US could not verify your access.");
  }
});
