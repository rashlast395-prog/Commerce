import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDb7Sys_Mh_BLOr1YfB6Kug_9K6_IuLoqg",
    authDomain: "fire-c1a91.firebaseapp.com",
    projectId: "fire-c1a91",
    storageBucket: "fire-c1a91.firebasestorage.app",
    messagingSenderId: "757687516476",
    appId: "1:757687516476:web:e41f779542e841d0ab3239"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

var currentUser = null;

onAuthStateChanged(auth, function(user) {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = user;
    loadProfile();
});

function loadProfile() {
    if (!currentUser) return;
    var userRef = doc(db, 'users', currentUser.uid);
    getDoc(userRef).then(function(snap) {
        if (snap.exists()) {
            var data = snap.data();
            document.getElementById('profName').value = data.name || currentUser.displayName || '';
            document.getElementById('profEmail').value = data.email || currentUser.email || '';
            document.getElementById('profPhone').value = data.phone || '';
            document.getElementById('profDob').value = data.dob || '';
            document.getElementById('profAge').value = data.age || '';
            document.getElementById('profGender').value = data.gender || '';
            document.getElementById('profAddress').value = data.address || '';
        } else {
            document.getElementById('profName').value = currentUser.displayName || '';
            document.getElementById('profEmail').value = currentUser.email || '';
        }
    }).catch(function(err) {
        showToast('Failed to load profile: ' + err.message, 'err');
    });
}

document.getElementById('profileForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!currentUser) return;

    var data = {
        name: document.getElementById('profName').value.trim(),
        email: document.getElementById('profEmail').value.trim(),
        phone: document.getElementById('profPhone').value.trim(),
        dob: document.getElementById('profDob').value,
        age: parseInt(document.getElementById('profAge').value) || 0,
        gender: document.getElementById('profGender').value,
        address: document.getElementById('profAddress').value.trim(),
        updatedAt: serverTimestamp()
    };

    var userRef = doc(db, 'users', currentUser.uid);
    setDoc(userRef, data, { merge: true }).then(function() {
        showToast('Profile updated successfully', 'success');
    }).catch(function(err) {
        showToast('Failed to update profile: ' + err.message, 'err');
    });
});

document.getElementById('profCancel').addEventListener('click', function() {
    window.location.href = 'index.html';
});

function showToast(message, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'admin-toast ' + type;
    toast.innerHTML = '<i class="fas ' + (type === 'success' ? 'fa-check-circle' : 'fa-times-circle') + '"></i>' + message;
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:14px 20px;border-radius:12px;color:#fff;font-size:.85rem;font-weight:500;z-index:3000;animation:slideIn .3s;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,.2);font-family:Poppins,sans-serif;';
    if (type === 'success') toast.style.background = 'var(--green)';
    else toast.style.background = '#e74c3c';
    container.appendChild(toast);
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 3000);
}
