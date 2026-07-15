// app.js — Logique front Archangel (sans E2EE)

// ---------- Références DOM ----------
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const tabBtns = document.querySelectorAll('.tab-btn');

const meUsernameEl = document.getElementById('me-username');
const myAvatarEl = document.getElementById('my-avatar');
const logoutBtn = document.getElementById('logout-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');
const onlineList = document.getElementById('online-list');
const contactsList = document.getElementById('contacts-list');
const groupsList = document.getElementById('groups-list');
const channelGeneral = document.getElementById('channel-general');
const chatTitle = document.getElementById('chat-title');
const messagesEl = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const typingIndicator = document.getElementById('typing-indicator');

const newGroupBtn = document.getElementById('new-group-btn');
const groupModal = document.getElementById('group-modal');
const groupNameInput = document.getElementById('group-name-input');
const groupCategoryCreateInput = document.getElementById('group-category-create-input');
const groupMembersList = document.getElementById('group-members-list');
const groupCancelBtn = document.getElementById('group-cancel-btn');
const groupCreateBtn = document.getElementById('group-create-btn');
const groupError = document.getElementById('group-error');

const searchToggleBtn = document.getElementById('search-toggle-btn');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const searchCloseBtn = document.getElementById('search-close-btn');
const searchResults = document.getElementById('search-results');

const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const attachmentPreview = document.getElementById('attachment-preview');

const callBtn = document.getElementById('call-btn');
const voiceCallBtn = document.getElementById('voice-call-btn');
const blockBtn = document.getElementById('block-btn');
const callOverlay = document.getElementById('call-overlay');
const callModeToggle = document.getElementById('call-mode-toggle');
const callVideos = document.getElementById('call-videos');
const voiceCallIndicator = document.getElementById('voice-call-indicator');
const voiceCallName = document.getElementById('voice-call-name');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const callStatus = document.getElementById('call-status');
const callAcceptBtn = document.getElementById('call-accept-btn');
const callHangupBtn = document.getElementById('call-hangup-btn');

const offlineBanner = document.getElementById('offline-banner');
const groupCategoryBadge = document.getElementById('group-category-badge');
const manageRolesBtn = document.getElementById('manage-roles-btn');
const pinnedBar = document.getElementById('pinned-bar');
const loadOlderIndicator = document.getElementById('load-older-indicator');

const rolesModal = document.getElementById('roles-modal');
const groupCategoryInput = document.getElementById('group-category-input');
const groupKeywordsInput = document.getElementById('group-keywords-input');
const groupKeywordsLabel = document.getElementById('group-keywords-label');
const groupKeywordsDisabledNote = document.getElementById('group-keywords-disabled-note');
const rolesMembersList = document.getElementById('roles-members-list');
const rolesCancelBtn = document.getElementById('roles-cancel-btn');
const rolesSaveCategoryBtn = document.getElementById('roles-save-category-btn');
const rolesError = document.getElementById('roles-error');

const statusSelect = document.getElementById('status-select');
const wallpaperBtn = document.getElementById('wallpaper-btn');
const wallpaperModal = document.getElementById('wallpaper-modal');
const wallpaperPresets = document.getElementById('wallpaper-presets');
const wallpaperFileInput = document.getElementById('wallpaper-file-input');
const wallpaperResetBtn = document.getElementById('wallpaper-reset-btn');
const wallpaperCloseBtn = document.getElementById('wallpaper-close-btn');

const ephemeralToggleBtn = document.getElementById('ephemeral-toggle-btn');
const scheduleToggleBtn = document.getElementById('schedule-toggle-btn');
const schedulePicker = document.getElementById('schedule-picker');
const scheduleInput = document.getElementById('schedule-input');
const scheduleCancelBtn = document.getElementById('schedule-cancel-btn');
const scheduledBtn = document.getElementById('scheduled-btn');
const scheduledModal = document.getElementById('scheduled-modal');
const scheduledList = document.getElementById('scheduled-list');
const scheduledEmpty = document.getElementById('scheduled-empty');
const scheduledCloseBtn = document.getElementById('scheduled-close-btn');

const profileBtn = document.getElementById('profile-btn');
const profileModal = document.getElementById('profile-modal');
const profileAvatarPreview = document.getElementById('profile-avatar-preview');
const profileDisplayname = document.getElementById('profile-displayname');
const profileUsernameDisplay = document.getElementById('profile-username-display');
const profileBio = document.getElementById('profile-bio');
const profileError = document.getElementById('profile-error');
const profileCancelBtn = document.getElementById('profile-cancel-btn');
const profileSaveBtn = document.getElementById('profile-save-btn');
const avatarFileInput = document.getElementById('avatar-file-input');
const pwdCurrent = document.getElementById('pwd-current');
const pwdNew = document.getElementById('pwd-new');
const pwdConfirm = document.getElementById('pwd-confirm');
const pwdError = document.getElementById('pwd-error');
const pwdSaveBtn = document.getElementById('pwd-save-btn');
const deletePwd = document.getElementById('delete-pwd');
const deleteError = document.getElementById('delete-error');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const langCurrent = document.getElementById('lang-current');

// ---------- État applicatif ----------
let me = null;
let myProfile = { displayName: '', bio: '', avatarFilename: null };
let socket = null;
let typingTimeout = null;
let currentConversationId = 'general';
let currentDmUsername = null;
let currentGroup = null;
let contacts = [];
let groups = [];
let onlineUsernames = new Set();
let userStatuses = new Map();
let blockedUsernames = new Set();
const unreadConversations = new Set();
let pendingAttachment = null;
let isEphemeralModeOn = false;
let scheduledForValue = null;
let callMode = 'video';
let oldestLoadedMessageId = null;
let hasMoreOlder = false;
let isLoadingOlder = false;
let isOffline = false;
const renderedMessages = new Map();

function currentGroupRole() {
  if (!currentGroup || !me) return null;
  return (currentGroup.roles && currentGroup.roles[me.username]) || 'member';
}
function dmConversationId(userA, userB) {
  return 'dm:' + [userA, userB].map((u) => u.toLowerCase()).sort().join(':');
}
function groupConversationId(groupId) { return 'group:' + groupId; }

// ---------- i18n ----------
const TRANSLATIONS = {
  fr: {
    'profile.title': 'Mon profil', 'profile.changePhoto': 'Changer la photo',
    'profile.displayName': 'Nom affiché', 'profile.username': "Nom d'utilisateur", 'profile.bio': 'Bio',
    'security.title': 'Sécurité', 'security.changePassword': 'Changer le mot de passe',
    'security.currentPassword': 'Mot de passe actuel', 'security.newPassword': 'Nouveau mot de passe',
    'security.confirmPassword': 'Confirmer le nouveau', 'security.updatePassword': 'Mettre à jour',
    'security.deleteAccount': 'Supprimer mon compte',
    'security.deleteWarning': 'Action irréversible. Tous vos messages seront supprimés.',
    'security.confirmWithPassword': 'Confirmez avec votre mot de passe', 'security.deleteBtn': 'Supprimer mon compte',
    'settings.title': 'Paramètres', 'settings.language': "Langue de l'application",
    'common.cancel': 'Annuler', 'common.save': 'Enregistrer',
    'chat.placeholder': 'Écrire un message…', 'chat.general': '# général', 'chat.general.short': 'général',
    'status.online': '🟢 Disponible', 'status.away': '🟡 Absent', 'status.busy': '🔴 Ne pas déranger',
    'sidebar.groups': 'Groupes', 'sidebar.dm': 'Messages privés', 'sidebar.online': 'En ligne',
    'tab.profile': 'Profil', 'tab.security': 'Sécurité', 'tab.settings': 'Paramètres',
    'search.placeholder': 'Rechercher dans vos conversations…',
  },
  en: {
    'profile.title': 'My profile', 'profile.changePhoto': 'Change photo',
    'profile.displayName': 'Display name', 'profile.username': 'Username', 'profile.bio': 'Bio',
    'security.title': 'Security', 'security.changePassword': 'Change password',
    'security.currentPassword': 'Current password', 'security.newPassword': 'New password',
    'security.confirmPassword': 'Confirm new password', 'security.updatePassword': 'Update password',
    'security.deleteAccount': 'Delete my account',
    'security.deleteWarning': 'This is irreversible. All your messages will be deleted.',
    'security.confirmWithPassword': 'Confirm with your password', 'security.deleteBtn': 'Delete my account',
    'settings.title': 'Settings', 'settings.language': 'Application language',
    'common.cancel': 'Cancel', 'common.save': 'Save',
    'chat.placeholder': 'Write a message…', 'chat.general': '# general', 'chat.general.short': 'general',
    'status.online': '🟢 Online', 'status.away': '🟡 Away', 'status.busy': '🔴 Do not disturb',
    'sidebar.groups': 'Groups', 'sidebar.dm': 'Direct messages', 'sidebar.online': 'Online',
    'tab.profile': 'Profile', 'tab.security': 'Security', 'tab.settings': 'Settings',
    'search.placeholder': 'Search your conversations…',
  },
  es: {
    'profile.title': 'Mi perfil', 'profile.changePhoto': 'Cambiar foto',
    'profile.displayName': 'Nombre visible', 'profile.username': 'Nombre de usuario', 'profile.bio': 'Bio',
    'security.title': 'Seguridad', 'security.changePassword': 'Cambiar contraseña',
    'security.currentPassword': 'Contraseña actual', 'security.newPassword': 'Nueva contraseña',
    'security.confirmPassword': 'Confirmar nueva contraseña', 'security.updatePassword': 'Actualizar contraseña',
    'security.deleteAccount': 'Eliminar mi cuenta',
    'security.deleteWarning': 'Acción irreversible. Todos tus mensajes serán eliminados.',
    'security.confirmWithPassword': 'Confirma con tu contraseña', 'security.deleteBtn': 'Eliminar mi cuenta',
    'settings.title': 'Configuración', 'settings.language': 'Idioma de la aplicación',
    'common.cancel': 'Cancelar', 'common.save': 'Guardar',
    'chat.placeholder': 'Escribe un mensaje…', 'chat.general': '# general', 'chat.general.short': 'general',
    'status.online': '🟢 Disponible', 'status.away': '🟡 Ausente', 'status.busy': '🔴 No molestar',
    'sidebar.groups': 'Grupos', 'sidebar.dm': 'Mensajes directos', 'sidebar.online': 'En línea',
    'tab.profile': 'Perfil', 'tab.security': 'Seguridad', 'tab.settings': 'Configuración',
    'search.placeholder': 'Buscar en tus conversaciones…',
  },
  ar: {
    'profile.title': 'ملفي الشخصي', 'profile.changePhoto': 'تغيير الصورة',
    'profile.displayName': 'الاسم المعروض', 'profile.username': 'اسم المستخدم', 'profile.bio': 'نبذة',
    'security.title': 'الأمان', 'security.changePassword': 'تغيير كلمة المرور',
    'security.currentPassword': 'كلمة المرور الحالية', 'security.newPassword': 'كلمة المرور الجديدة',
    'security.confirmPassword': 'تأكيد كلمة المرور الجديدة', 'security.updatePassword': 'تحديث كلمة المرور',
    'security.deleteAccount': 'حذف حسابي',
    'security.deleteWarning': 'هذا الإجراء لا رجعة فيه. سيتم حذف جميع رسائلك.',
    'security.confirmWithPassword': 'تأكيد بكلمة المرور', 'security.deleteBtn': 'حذف حسابي',
    'settings.title': 'الإعدادات', 'settings.language': 'لغة التطبيق',
    'common.cancel': 'إلغاء', 'common.save': 'حفظ',
    'chat.placeholder': 'اكتب رسالة…', 'chat.general': '# عام', 'chat.general.short': 'عام',
    'status.online': '🟢 متصل', 'status.away': '🟡 بعيد', 'status.busy': '🔴 لا تزعجني',
    'sidebar.groups': 'المجموعات', 'sidebar.dm': 'الرسائل الخاصة', 'sidebar.online': 'متصل',
    'tab.profile': 'الملف الشخصي', 'tab.security': 'الأمان', 'tab.settings': 'الإعدادات',
    'search.placeholder': 'البحث في محادثاتك…',
  },
};
const LANG_NAMES = { fr: 'Français', en: 'English', es: 'Español', ar: 'العربية' };
const RTL_LANGS = new Set(['ar']);
let currentLang = localStorage.getItem('archangel-lang') || 'fr';

function t(key) {
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || TRANSLATIONS['fr'][key] || key;
}
function applyLanguage(lang) {
  if (!TRANSLATIONS[lang]) return;
  currentLang = lang;
  localStorage.setItem('archangel-lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';

  // Traduit tous les éléments marqués data-i18n.
  // Si l'élément a des enfants éléments (ex: label > span + input), on ne touche pas au contenu
  // pour ne pas détruire les inputs — dans ce cas le texte est géré par un <span data-i18n> interne.
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const translated = t(key);
    if (el.firstElementChild) {
      // Ne rien faire : ce cas ne devrait plus arriver avec le HTML corrigé
      // (tous les labels ont maintenant un <span data-i18n> interne)
    } else {
      el.textContent = translated;
    }
  });

  // Éléments dynamiques non couverts par data-i18n
  if (messageInput) messageInput.placeholder = t('chat.placeholder');

  // Placeholder du champ de recherche
  const si = document.getElementById('search-input');
  if (si) si.placeholder = t('search.placeholder') || 'Rechercher…';

  // Canal #général dans la sidebar
  const generalSpan = document.querySelector('#channel-general [data-i18n]');
  if (generalSpan) generalSpan.textContent = t('chat.general.short') || 'général';

  // Boutons d'onglets profil
  const profileTabs = document.querySelectorAll('.profile-tab');
  const ptabLabels = ['profile', 'security', 'settings'];
  const ptabIcons = ['👤', '🔒', '⚙'];
  profileTabs.forEach((btn, i) => {
    btn.textContent = ptabIcons[i] + ' ' + (t('tab.' + ptabLabels[i]) || btn.textContent.split(' ').slice(1).join(' '));
  });

  // Boutons de langue actifs
  document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
  if (langCurrent) langCurrent.textContent = `Langue actuelle : ${LANG_NAMES[lang] || lang}`;
}

// ---------- Profil & avatar ----------
function avatarUrl(filename) {
  return filename ? `/uploads/${filename}` : '/assets/avatar-default.svg';
}
function updateMyProfileUI() {
  meUsernameEl.textContent = myProfile.displayName || (me ? '@' + me.username : '');
  myAvatarEl.src = avatarUrl(myProfile.avatarFilename);
}

// ---------- IndexedDB (cache offline + outbox + wallpapers) ----------
const IDB_NAME = 'archangel-db';
const IDB_VERSION = 3; // v3 : suppression du store 'identity' (E2EE supprimé)
let idbPromise = null;

function openIdb() {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve) => {
    if (!('indexedDB' in window)) return resolve(null);
    const timeout = setTimeout(() => resolve(null), 3000);
    let req;
    try { req = indexedDB.open(IDB_NAME, IDB_VERSION); }
    catch (e) { clearTimeout(timeout); return resolve(null); }
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      // Supprimer l'ancien store 'identity' (clés E2EE) s'il existe encore
      if (db.objectStoreNames.contains('identity')) db.deleteObjectStore('identity');
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id' })
          .createIndex('byConversation', 'conversationId');
      }
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'localId' });
      if (!db.objectStoreNames.contains('wallpapers')) db.createObjectStore('wallpapers', { keyPath: 'conversationId' });
    };
    req.onsuccess = () => {
      clearTimeout(timeout);
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => { clearTimeout(timeout); resolve(null); };
    req.onblocked = () => { clearTimeout(timeout); resolve(null); };
  });
  return idbPromise;
}

async function idbRun(storeName, mode, fn) {
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}
async function idbCacheMessage(msg) {
  const db = await openIdb(); if (!db) return;
  try { db.transaction('messages', 'readwrite').objectStore('messages').put(msg); } catch (e) {}
}
async function idbGetCachedMessages(conversationId) {
  const db = await openIdb(); if (!db) return [];
  return new Promise((resolve) => {
    try {
      const req = db.transaction('messages', 'readonly').objectStore('messages').index('byConversation').getAll(IDBKeyRange.only(conversationId));
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      req.onerror = () => resolve([]);
    } catch (e) { resolve([]); }
  });
}
async function idbAddOutbox(entry) {
  const db = await openIdb(); if (!db) return;
  try { db.transaction('outbox', 'readwrite').objectStore('outbox').put(entry); } catch (e) {}
}
async function idbRemoveOutbox(localId) {
  const db = await openIdb(); if (!db) return;
  try { db.transaction('outbox', 'readwrite').objectStore('outbox').delete(localId); } catch (e) {}
}
async function idbGetOutbox() {
  const db = await openIdb(); if (!db) return [];
  return new Promise((resolve) => {
    try {
      const req = db.transaction('outbox', 'readonly').objectStore('outbox').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (e) { resolve([]); }
  });
}
async function idbGetWallpaper(conversationId) {
  const db = await openIdb(); if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction('wallpapers', 'readonly').objectStore('wallpapers').get(conversationId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}
async function idbSetWallpaper(conversationId, value) {
  const db = await openIdb(); if (!db) return;
  try { db.transaction('wallpapers', 'readwrite').objectStore('wallpapers').put({ conversationId, value }); } catch (e) {}
}
async function idbDeleteWallpaper(conversationId) {
  const db = await openIdb(); if (!db) return;
  try { db.transaction('wallpapers', 'readwrite').objectStore('wallpapers').delete(conversationId); } catch (e) {}
}

// ---------- Thème sombre / clair ----------
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('archangel-theme', theme);
  if (themeIcon) {
    // Une seule icône qui représente le toggle (lune+soleil combinés)
    themeIcon.src = '/assets/icons/theme.svg';
    themeIcon.alt = theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair';
    // Indication visuelle du thème actif via opacité
    themeIcon.style.opacity = theme === 'light' ? '1' : '0.75';
  }
}

(function initTheme() {
  const saved = localStorage.getItem('archangel-theme');
  const prefersDark = !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
})();

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
}

// ---------- Service Worker (PWA) ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[SW] Enregistré, portée :', reg.scope);
        // Vérifier les mises à jour toutes les 60 secondes
        setInterval(() => reg.update(), 60000);
      })
      .catch((err) => console.error('[SW] Échec d\'enregistrement :', err));
  });
}

// ---------- Bannière d'installation PWA (Android Chrome) ----------
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // Afficher un bouton d'installation discret si on n'est pas déjà en mode standalone
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  showInstallBanner();
});

function showInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  const span = document.createElement('span');
  span.textContent = '📲 Installer Archangel sur votre écran d\'accueil';
  const installBtn = document.createElement('button');
  installBtn.id = 'pwa-install-btn';
  installBtn.textContent = 'Installer';
  const dismissBtn = document.createElement('button');
  dismissBtn.id = 'pwa-dismiss-btn';
  dismissBtn.setAttribute('aria-label', 'Fermer');
  dismissBtn.textContent = '✕';
  banner.appendChild(span);
  banner.appendChild(installBtn);
  banner.appendChild(dismissBtn);
  document.body.appendChild(banner);

  installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log('[PWA] Installation :', outcome);
    deferredInstallPrompt = null;
    banner.remove();
  });
  dismissBtn.addEventListener('click', () => {
    banner.remove();
    localStorage.setItem('pwa-banner-dismissed', '1');
  });
}

// Sur iOS, Safari ne supporte pas beforeinstallprompt : on affiche un guide manuel
if (
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !window.matchMedia('(display-mode: standalone)').matches &&
  !localStorage.getItem('ios-banner-dismissed')
) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const banner = document.createElement('div');
      banner.id = 'pwa-install-banner';
      const span = document.createElement('span');
      span.innerHTML = '📲 iOS : Appuyez sur <b>⬆</b> puis "Sur l\'écran d\'accueil"';
      const dismissBtn = document.createElement('button');
      dismissBtn.setAttribute('aria-label', 'Fermer');
      dismissBtn.textContent = '✕';
      banner.appendChild(span);
      banner.appendChild(dismissBtn);
      document.body.appendChild(banner);
      dismissBtn.addEventListener('click', () => {
        banner.remove();
        localStorage.setItem('ios-banner-dismissed', '1');
      });
    }, 3000);
  });
}

// ---------- Tabs (auth) ----------
applyLanguage(currentLang);

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    loginForm.classList.toggle('hidden', tab !== 'login');
    registerForm.classList.toggle('hidden', tab !== 'register');
  });
});

// ---------- Auth ----------
async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur');
  return data;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault(); loginError.textContent = '';
  const fd = new FormData(loginForm);
  try { enterChat(await apiPost('/api/login', { username: fd.get('username'), password: fd.get('password') })); }
  catch (err) { loginError.textContent = err.message; }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault(); registerError.textContent = '';
  const fd = new FormData(registerForm);
  try { enterChat(await apiPost('/api/register', { username: fd.get('username'), password: fd.get('password') })); }
  catch (err) { registerError.textContent = err.message; }
});

logoutBtn.addEventListener('click', async () => {
  await apiPost('/api/logout', {});
  if (socket) socket.disconnect();
  endCall(false);
  me = null;
  myProfile = { displayName: '', bio: '', avatarFilename: null };
  userStatuses = new Map();
  currentConversationId = 'general'; currentDmUsername = null; currentGroup = null;
  oldestLoadedMessageId = null; hasMoreOlder = false;
  contacts = []; groups = [];
  onlineUsernames = new Set(); blockedUsernames = new Set();
  unreadConversations.clear(); renderedMessages.clear();
  messagesEl.innerHTML = ''; contactsList.innerHTML = ''; groupsList.innerHTML = ''; onlineList.innerHTML = '';
  pinnedBar.classList.add('hidden'); pinnedBar.innerHTML = '';
  groupCategoryBadge.classList.add('hidden');
  myAvatarEl.src = '/assets/avatar-default.svg';
  setOffline(false);
  chatScreen.classList.add('hidden'); authScreen.classList.remove('hidden');
});

(async function tryResume() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) enterChat(await res.json());
  } catch (e) {}
})();

// ---------- Entrée dans le chat ----------
async function enterChat(user) {
  me = user;
  authScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  setOffline(!navigator.onLine);
  try {
    const r = await fetch('/api/me');
    if (r.ok) {
      const d = await r.json();
      myProfile = { displayName: d.displayName || '', bio: d.bio || '', avatarFilename: d.avatarFilename || null };
    }
  } catch (e) {}
  updateMyProfileUI();
  applyLanguage(currentLang);
  await loadContacts();
  await loadGroups();
  await openConversation('general');
  connectSocket();
  refreshScheduledBadge();
}

async function loadContacts() {
  const res = await fetch('/api/users');
  contacts = await res.json();
  blockedUsernames = new Set(contacts.filter((c) => c.blocked).map((c) => c.username));
  renderContactsList();
}
async function loadGroups() {
  const res = await fetch('/api/groups');
  groups = await res.json();
  renderGroupsList();
}

// ---------- Rendu sidebar ----------
function renderContactsList() {
  contactsList.innerHTML = '';
  contacts.forEach((c) => {
    const convId = dmConversationId(me.username, c.username);
    const li = document.createElement('li');
    li.className = 'contact-item' + (convId === currentConversationId ? ' active' : '');

    const left = document.createElement('span');
    left.style.cssText = 'display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden;';

    const wrap = document.createElement('span');
    wrap.style.cssText = 'position:relative;display:inline-flex;flex-shrink:0;';
    const img = document.createElement('img');
    img.className = 'contact-avatar';
    img.src = avatarUrl(c.avatarFilename); img.alt = '';
    wrap.appendChild(img);
    const status = onlineUsernames.has(c.username) ? userStatuses.get(c.username) || 'online' : null;
    if (status) {
      const dot = document.createElement('span');
      dot.className = 'contact-dot ' + status;
      dot.style.cssText = 'position:absolute;bottom:0;right:0;width:8px;height:8px;border:1px solid var(--bg-sidebar);border-radius:50%;';
      wrap.appendChild(dot);
    }
    const name = document.createElement('span');
    name.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    name.textContent = (c.displayName || c.username) + (blockedUsernames.has(c.username) ? ' (bloqué)' : '');
    left.appendChild(wrap); left.appendChild(name);
    li.appendChild(left);

    if (unreadConversations.has(convId) && convId !== currentConversationId) {
      const dot = document.createElement('span'); dot.className = 'contact-unread'; li.appendChild(dot);
    }
    li.addEventListener('click', () => { openConversation(convId, c.username); closeSidebarOnMobile(); });
    contactsList.appendChild(li);
  });
}

function renderGroupsList() {
  groupsList.innerHTML = '';
  groups.forEach((g) => {
    const convId = groupConversationId(g.id);
    const li = document.createElement('li');
    li.className = 'group-item' + (convId === currentConversationId ? ' active' : '');
    li.textContent = '# ' + g.name;
    li.addEventListener('click', () => { openConversation(convId, null, g); closeSidebarOnMobile(); });
    groupsList.appendChild(li);
  });
}

channelGeneral.addEventListener('click', () => { openConversation('general'); closeSidebarOnMobile(); });

// ---------- Ouvrir une conversation ----------
async function openConversation(conversationId, withUsername, group) {
  currentConversationId = conversationId;
  currentDmUsername = withUsername || null;
  currentGroup = group || groups.find((g) => groupConversationId(g.id) === conversationId) || null;
  unreadConversations.delete(conversationId);
  typingIndicator.textContent = '';
  closeSearch();
  oldestLoadedMessageId = null; hasMoreOlder = false;

  channelGeneral.classList.toggle('active', conversationId === 'general');
  if (conversationId === 'general') chatTitle.textContent = t('chat.general');
  else if (withUsername) {
    const c = contacts.find((x) => x.username === withUsername);
    chatTitle.textContent = '@ ' + (c && c.displayName ? c.displayName : withUsername);
  }
  else if (currentGroup) chatTitle.textContent = '# ' + currentGroup.name;

  callBtn.classList.toggle('hidden', !withUsername);
  voiceCallBtn.classList.toggle('hidden', !withUsername);
  blockBtn.classList.toggle('hidden', !withUsername);
  if (withUsername) {
    blockBtn.title = blockedUsernames.has(withUsername) ? 'Débloquer cet utilisateur' : 'Bloquer cet utilisateur';
  }

  const role = currentGroupRole();
  manageRolesBtn.classList.toggle('hidden', !currentGroup || (role !== 'admin' && role !== 'moderator'));
  if (currentGroup && currentGroup.category) {
    groupCategoryBadge.textContent = currentGroup.category; groupCategoryBadge.classList.remove('hidden');
  } else { groupCategoryBadge.classList.add('hidden'); }
  renderPinnedBar();

  ephemeralToggleBtn.classList.toggle('hidden', !withUsername);
  isEphemeralModeOn = false;
  ephemeralToggleBtn.setAttribute('aria-pressed', 'false');
  resetScheduleAndEphemeral();
  applyWallpaper(conversationId);
  renderContactsList(); renderGroupsList();

  renderedMessages.clear();
  messagesEl.innerHTML = '';
  messagesEl.appendChild(loadOlderIndicator);
  loadOlderIndicator.classList.add('hidden');

  const cached = await idbGetCachedMessages(conversationId);
  cached.forEach((m) => renderMessage(m));
  if (cached.length) scrollToBottom();

  if (navigator.onLine) {
    try {
      const res = await fetch('/api/messages?conversationId=' + encodeURIComponent(conversationId) + '&limit=30');
      if (res.ok) {
        const { messages: history, hasMore } = await res.json();
        hasMoreOlder = hasMore;
        if (history.length) oldestLoadedMessageId = history[0].id;
        messagesEl.innerHTML = '';
        messagesEl.appendChild(loadOlderIndicator);
        loadOlderIndicator.classList.toggle('hidden', !hasMore);
        history.forEach((m) => { renderMessage(m); idbCacheMessage(m); });
        renderPendingOutbox(); scrollToBottom();
      }
    } catch (e) {}
  } else { renderPendingOutbox(); }
}

messagesEl.addEventListener('scroll', () => {
  if (messagesEl.scrollTop < 60 && hasMoreOlder && !isLoadingOlder && navigator.onLine) loadOlderMessages();
});

async function loadOlderMessages() {
  if (!oldestLoadedMessageId) return;
  isLoadingOlder = true; loadOlderIndicator.classList.remove('hidden');
  const prevH = messagesEl.scrollHeight;
  try {
    const res = await fetch(`/api/messages?conversationId=${encodeURIComponent(currentConversationId)}&limit=30&before=${encodeURIComponent(oldestLoadedMessageId)}`);
    if (res.ok) {
      const { messages: older, hasMore } = await res.json();
      hasMoreOlder = hasMore;
      if (older.length) {
        oldestLoadedMessageId = older[0].id;
        older.slice().reverse().forEach((m) => {
          const w = renderMessage(m, true);
          messagesEl.insertBefore(w, loadOlderIndicator.nextSibling);
          idbCacheMessage(m);
        });
        messagesEl.scrollTop = messagesEl.scrollHeight - prevH;
      }
      loadOlderIndicator.classList.toggle('hidden', !hasMore);
    }
  } catch (e) {}
  isLoadingOlder = false;
}

// ---------- Socket.io ----------
function connectSocket() {
  socket = io();
  socket.on('connect', () => { setOffline(false); flushOutbox(); });
  socket.on('disconnect', () => setOffline(true));
  socket.on('connect_error', () => setOffline(true));

  socket.on('chat_message', (msg) => {
    idbCacheMessage(msg);
    if (msg.conversationId === currentConversationId) {
      renderMessage(msg);
      scrollToBottom();
      // Si c'est mon propre message reçu en écho → confirmé comme "delivered" si le destinataire est connecté
      if (msg.author === me.username && msg.conversationId.startsWith('dm:') && msg.delivered) {
        updateReadStatus(msg.id, 'delivered');
      }
    } else if (msg.author !== me.username) {
      unreadConversations.add(msg.conversationId);
      renderContactsList();
      renderGroupsList();
    }
  });
  socket.on('message_updated', (msg) => { idbCacheMessage(msg); if (msg.conversationId === currentConversationId) updateRenderedMessage(msg); });
  socket.on('moderation_error', (text) => alert(text));
  socket.on('presence', (list) => {
    onlineUsernames = new Set(list.map((p) => p.username));
    userStatuses = new Map(list.map((p) => [p.username, p.status]));
    onlineList.innerHTML = '';
    list.forEach(({ username, status }) => {
      const li = document.createElement('li');
      const dot = document.createElement('span'); dot.className = 'contact-dot ' + status;
      const name = document.createElement('span'); name.textContent = username;
      li.appendChild(dot); li.appendChild(name); onlineList.appendChild(li);
    });
    renderContactsList();
  });
  socket.on('typing', ({ username, conversationId }) => {
    if (username === me.username || conversationId !== currentConversationId) return;
    typingIndicator.textContent = `${username} écrit…`;
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => (typingIndicator.textContent = ''), 1500);
  });
  socket.on('group_created', (group) => {
    if (!groups.some((g) => g.id === group.id)) { groups.push(group); renderGroupsList(); }
  });
  socket.on('group_updated', (group) => {
    const idx = groups.findIndex((g) => g.id === group.id);
    if (idx !== -1) groups[idx] = group; else groups.push(group);
    if (currentGroup && currentGroup.id === group.id) {
      currentGroup = group; renderPinnedBar();
      groupCategoryBadge.classList.toggle('hidden', !group.category);
      if (group.category) groupCategoryBadge.textContent = group.category;
      manageRolesBtn.classList.toggle('hidden', currentGroupRole() !== 'admin' && currentGroupRole() !== 'moderator');
    }
    renderGroupsList();
  });
  socket.on('user_profile_updated', ({ username, displayName, avatarFilename }) => {
    const c = contacts.find((x) => x.username === username);
    if (c) { c.displayName = displayName; c.avatarFilename = avatarFilename; renderContactsList(); }
  });
  socket.on('user_deleted', ({ username }) => {
    contacts = contacts.filter((c) => c.username !== username);
    renderContactsList();
    if (currentDmUsername === username) openConversation('general');
  });
  socket.on('message_scheduled', () => refreshScheduledBadge());

  // Accusés de lecture reçus : mettre à jour les ticks des messages concernés
  socket.on('messages_read', ({ conversationId, reader, lastMessageId }) => {
    if (conversationId !== currentConversationId) return;
    // Marquer comme lu tous les messages jusqu'au lastMessageId (inclus)
    let found = false;
    // Parcourir les messages rendus dans l'ordre inverse
    const msgEls = Array.from(messagesEl.querySelectorAll('[data-message-id]')).reverse();
    for (const el of msgEls) {
      const msgId = el.dataset.messageId;
      const msg = renderedMessages.get(msgId);
      if (!msg || msg.author !== me.username) continue;
      // Mettre à jour le statut en 'read'
      updateReadStatus(msgId, 'read');
      if (msgId === lastMessageId) break; // ne remonter que jusqu'au message cible
    }
  });

  socket.on('auth_error', () => logoutBtn.click());
  socket.on('call_invite', ({ conversationId, from, mode }) => handleIncomingCall(conversationId, from, mode || 'video'));
  socket.on('call_signal', ({ conversationId, signal }) => handleCallSignal(conversationId, signal));
  socket.on('call_end', ({ conversationId }) => { if (conversationId === activeCallConversationId) endCall(false); });
}

// ---------- Mode hors ligne ----------
function setOffline(value) { isOffline = value; offlineBanner.classList.toggle('hidden', !value); }
window.addEventListener('online', () => { if (socket && !socket.connected) socket.connect(); });
window.addEventListener('offline', () => setOffline(true));

async function flushOutbox() {
  const outbox = await idbGetOutbox();
  for (const entry of outbox) {
    socket.emit('chat_message', { conversationId: entry.conversationId, text: entry.text, attachment: entry.attachment });
    await idbRemoveOutbox(entry.localId);
    const el = messagesEl.querySelector(`[data-message-id="${entry.localId}"]`);
    if (el) el.remove();
  }
}

async function renderPendingOutbox() {
  const outbox = await idbGetOutbox();
  outbox.filter((o) => o.conversationId === currentConversationId).forEach((o) => {
    renderMessage({ id: o.localId, conversationId: o.conversationId, author: me.username, text: o.text, attachment: o.attachment, createdAt: o.createdAt, pending: true });
  });
  scrollToBottom();
}

// ---------- Rendu des messages ----------
function renderMessage(msg, skipAppend) {
  renderedMessages.set(msg.id, msg);
  const wrapper = document.createElement('div');
  wrapper.className = 'message' + (msg.author === me.username ? ' own' : '') + (msg.pending ? ' message-pending' : '');
  wrapper.dataset.messageId = msg.id;

  const meta = document.createElement('div'); meta.className = 'message-meta';
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  meta.textContent = `${msg.author} · ${time}` + (msg.edited ? ' (modifié)' : '');
  if (msg.pending) {
    const tag = document.createElement('span'); tag.className = 'message-pending-tag'; tag.textContent = ' ⏱'; meta.appendChild(tag);
  }
  wrapper.appendChild(meta);

  if (msg.deleted) {
    const b = document.createElement('div'); b.className = 'message-bubble message-deleted';
    b.textContent = msg.ephemeral ? '💣 Message éphémère consulté' : 'Message supprimé';
    wrapper.appendChild(b);
  } else {
    if (msg.text) {
      const b = document.createElement('div'); b.className = 'message-bubble'; b.textContent = msg.text;
      wrapper.appendChild(b);
    }
    if (msg.attachment) wrapper.appendChild(renderAttachment(msg.attachment));
    if (msg.ephemeral) {
      const tag = document.createElement('div'); tag.className = 'ephemeral-tag'; tag.textContent = '💣 Éphémère';
      wrapper.appendChild(tag);
    }
    if (msg.ephemeral && msg.author !== me.username && !msg.pending) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { socket.emit('message_viewed', { messageId: msg.id }); obs.disconnect(); } });
      });
      obs.observe(wrapper);
    }

    // ---------- Accusé de lecture (DM uniquement, messages propres) ----------
    if (msg.author === me.username && !msg.pending && currentConversationId && currentConversationId.startsWith('dm:')) {
      wrapper.appendChild(buildReadStatus(msg));
    }

    const actions = document.createElement('div'); actions.className = 'message-actions';
    if (msg.author === me.username && !msg.pending) {
      const editBtn = document.createElement('button'); editBtn.textContent = 'Modifier';
      editBtn.addEventListener('click', () => editMessagePrompt(msg));
      const delBtn = document.createElement('button'); delBtn.textContent = 'Supprimer';
      delBtn.addEventListener('click', () => { if (confirm('Supprimer ?')) socket.emit('message_delete', { messageId: msg.id }); });
      actions.appendChild(editBtn); actions.appendChild(delBtn);
    } else if (msg.author !== me.username) {
      actions.style.display = 'flex';
      const repBtn = document.createElement('button'); repBtn.textContent = 'Signaler';
      repBtn.addEventListener('click', () => reportMessage(msg));
      actions.appendChild(repBtn);

      // Émettre un accusé de lecture quand le message du correspondant devient visible
      if (currentConversationId && currentConversationId.startsWith('dm:')) {
        const obs = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              emitReadReceipt(msg.id);
              obs.disconnect();
            }
          });
        }, { threshold: 0.5 });
        obs.observe(wrapper);
      }
    }
    if (currentGroup && !msg.pending) {
      const role = currentGroupRole();
      if (role === 'admin' || role === 'moderator') {
        actions.style.display = 'flex';
        const isPinned = (currentGroup.pinned || []).some((p) => p.messageId === msg.id);
        const pinBtn = document.createElement('button'); pinBtn.textContent = isPinned ? 'Désépingler' : 'Épingler';
        pinBtn.addEventListener('click', () => togglePin(msg, isPinned));
        actions.appendChild(pinBtn);
      }
    }
    if (actions.childNodes.length) wrapper.appendChild(actions);
  }

  if (!skipAppend) messagesEl.appendChild(wrapper);
  return wrapper;
}

function updateRenderedMessage(msg) {
  const old = messagesEl.querySelector(`[data-message-id="${msg.id}"]`);
  if (!old) return;
  const fresh = renderMessage(msg, true);
  old.replaceWith(fresh);
}

// ---------- Accusés de lecture ----------
// Map : messageId -> statut ('sent' | 'delivered' | 'read')
const readStatusMap = new Map();

// Construit le SVG d'un tick simple ✓
function tickSvg(color) {
  return `<svg class="tick-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8.5L6.5 12L13 5" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
// Construit le SVG double tick ✓✓
function doubleTick(color) {
  return `<svg class="tick-icon" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 8.5L4.5 12L11 5" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7 8.5L10.5 12L17 5" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function buildReadStatus(msg) {
  const status = readStatusMap.get(msg.id) || (msg.delivered ? 'delivered' : 'sent');
  const div = document.createElement('div');
  div.className = 'message-status';
  div.dataset.statusFor = msg.id;
  updateStatusEl(div, status);
  return div;
}

function updateStatusEl(el, status) {
  if (status === 'sent') {
    el.innerHTML = `<span class="read-tick sent" title="Envoyé">${tickSvg('#8a8d9e')}</span>`;
  } else if (status === 'delivered') {
    el.innerHTML = `<span class="read-tick delivered" title="Délivré">${doubleTick('#8a8d9e')}</span>`;
  } else if (status === 'read') {
    el.innerHTML = `<span class="read-tick read" title="Lu">${doubleTick('#3b9ef5')}</span>`;
  }
}

function updateReadStatus(messageId, status) {
  readStatusMap.set(messageId, status);
  const el = messagesEl.querySelector(`[data-status-for="${messageId}"]`);
  if (el) updateStatusEl(el, status);
}

// Émettre un accusé de lecture pour le dernier message vu dans un DM
let readReceiptDebounce = null;
function emitReadReceipt(lastMessageId) {
  if (!currentConversationId || !currentConversationId.startsWith('dm:') || !socket || !socket.connected) return;
  clearTimeout(readReceiptDebounce);
  readReceiptDebounce = setTimeout(() => {
    socket.emit('read_receipt', { conversationId: currentConversationId, lastMessageId });
  }, 300);
}

function renderAttachment(att) {
  const c = document.createElement('div'); c.className = 'message-attachment';
  if (att.mimeType && att.mimeType.startsWith('image/')) {
    const img = document.createElement('img'); img.src = att.url; img.alt = att.originalName; c.appendChild(img);
  } else {
    const a = document.createElement('a'); a.className = 'file-link'; a.href = att.url; a.target = '_blank';
    a.textContent = `📄 ${att.originalName} (${Math.round(att.size / 1024)} Ko)`; c.appendChild(a);
  }
  return c;
}

function editMessagePrompt(msg) {
  const t = prompt('Modifier le message :', msg.text);
  if (t !== null && t.trim() && t !== msg.text) socket.emit('message_edit', { messageId: msg.id, text: t.trim() });
}
async function reportMessage(msg) {
  const reason = prompt(`Signaler ce message de ${msg.author}. Motif :`, '');
  if (reason === null) return;
  await apiPost('/api/reports', { type: 'message', targetId: msg.id, reason });
  alert('Message signalé. Merci.');
}
async function togglePin(msg, isPinned) {
  if (!currentGroup) return;
  if (isPinned) await fetch(`/api/groups/${currentGroup.id}/pin/${msg.id}`, { method: 'DELETE' });
  else await apiPost(`/api/groups/${currentGroup.id}/pin`, { messageId: msg.id });
}
function renderPinnedBar() {
  if (!currentGroup || !(currentGroup.pinned || []).length) { pinnedBar.classList.add('hidden'); pinnedBar.innerHTML = ''; return; }
  pinnedBar.classList.remove('hidden'); pinnedBar.innerHTML = '';
  const role = currentGroupRole(); const canUnpin = role === 'admin' || role === 'moderator';
  currentGroup.pinned.forEach((p) => {
    const item = document.createElement('div'); item.className = 'pinned-item';
    const text = document.createElement('span'); text.className = 'pinned-item-text'; text.textContent = `📌 ${p.author} : ${p.text}`;
    item.appendChild(text);
    if (canUnpin) {
      const btn = document.createElement('button'); btn.textContent = 'Retirer';
      btn.addEventListener('click', () => togglePin({ id: p.messageId }, true));
      item.appendChild(btn);
    }
    pinnedBar.appendChild(item);
  });
}
function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

// ---------- Envoi de message ----------
messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text && !pendingAttachment) return;
  const payload = {
    conversationId: currentConversationId, text, attachment: pendingAttachment,
    ephemeral: isEphemeralModeOn && currentConversationId.startsWith('dm:'),
    scheduledFor: scheduledForValue,
  };
  if (socket && socket.connected) {
    socket.emit('chat_message', payload);
  } else {
    const localId = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const entry = { localId, conversationId: currentConversationId, text, attachment: pendingAttachment, createdAt: new Date().toISOString() };
    await idbAddOutbox(entry);
    renderMessage({ ...entry, id: localId, author: me.username, pending: true }); scrollToBottom();
  }
  messageInput.value = ''; clearAttachment(); resetScheduleAndEphemeral();
});

let lastTypingEmit = 0;
messageInput.addEventListener('input', () => {
  const now = Date.now();
  if (socket && now - lastTypingEmit > 800) { socket.emit('typing', { conversationId: currentConversationId }); lastTypingEmit = now; }
});

function resetScheduleAndEphemeral() {
  scheduledForValue = null; schedulePicker.classList.add('hidden'); scheduleToggleBtn.classList.remove('active');
  isEphemeralModeOn = false; ephemeralToggleBtn.setAttribute('aria-pressed', 'false');
}

// ---------- Pièces jointes ----------
attachBtn.addEventListener('click', () => fileInput.click());

function compressImageIfNeeded(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return Promise.resolve(file);
  return new Promise((resolve) => {
    const img = new Image(); const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        if (scale === 1) { resolve(file); return; }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file), 'image/jpeg', 0.8);
      };
      img.onerror = () => resolve(file); img.src = e.target.result;
    };
    reader.onerror = () => resolve(file); reader.readAsDataURL(file);
  });
}

fileInput.addEventListener('change', async () => {
  const rawFile = fileInput.files[0]; if (!rawFile) return;
  attachmentPreview.classList.remove('hidden'); attachmentPreview.textContent = 'Préparation…';
  const file = await compressImageIfNeeded(rawFile);
  const fd = new FormData(); fd.append('file', file);
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    pendingAttachment = data; renderAttachmentPreview();
  } catch (err) { attachmentPreview.textContent = 'Erreur : ' + err.message; }
  fileInput.value = '';
});
function renderAttachmentPreview() {
  attachmentPreview.classList.remove('hidden'); attachmentPreview.innerHTML = '';
  const label = document.createElement('span'); label.textContent = `📎 ${pendingAttachment.originalName}`;
  const btn = document.createElement('button'); btn.textContent = 'Retirer'; btn.addEventListener('click', clearAttachment);
  attachmentPreview.appendChild(label); attachmentPreview.appendChild(btn);
}
function clearAttachment() { pendingAttachment = null; attachmentPreview.classList.add('hidden'); attachmentPreview.innerHTML = ''; }

// ---------- Groupes ----------
newGroupBtn.addEventListener('click', () => {
  groupError.textContent = ''; groupNameInput.value = ''; groupCategoryCreateInput.value = '';
  groupMembersList.innerHTML = '';
  contacts.forEach((c) => {
    const li = document.createElement('li');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = c.username; cb.id = 'mb-' + c.username;
    const lbl = document.createElement('label'); lbl.htmlFor = cb.id; lbl.textContent = c.displayName || c.username; lbl.style.margin = '0';
    li.appendChild(cb); li.appendChild(lbl); groupMembersList.appendChild(li);
  });
  groupModal.classList.remove('hidden');
});
groupCancelBtn.addEventListener('click', () => groupModal.classList.add('hidden'));
groupCreateBtn.addEventListener('click', async () => {
  groupError.textContent = '';
  const name = groupNameInput.value.trim(); const category = groupCategoryCreateInput.value.trim();
  const members = Array.from(groupMembersList.querySelectorAll('input:checked')).map((i) => i.value);
  if (!name) { groupError.textContent = 'Le nom du groupe est requis.'; return; }
  try {
    const res = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, members, category }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error);
    groups.push(data); renderGroupsList(); groupModal.classList.add('hidden');
    openConversation(groupConversationId(data.id), null, data);
  } catch (err) { groupError.textContent = err.message; }
});

// ---------- Gestion des rôles / paramètres de groupe ----------
manageRolesBtn.addEventListener('click', () => {
  if (!currentGroup) return;
  rolesError.textContent = '';
  groupCategoryInput.value = currentGroup.category || '';
  groupKeywordsInput.value = (currentGroup.bannedWords || []).join(', ');
  groupKeywordsLabel.classList.remove('hidden');
  groupKeywordsDisabledNote.classList.add('hidden');
  const myRole = currentGroupRole(); const canEditRoles = myRole === 'admin';
  rolesMembersList.innerHTML = '';
  currentGroup.members.forEach((username) => {
    const li = document.createElement('li');
    const lbl = document.createElement('label'); lbl.textContent = username + (username === currentGroup.owner ? ' (créateur)' : ''); lbl.style.cssText = 'flex:1;margin:0;';
    li.appendChild(lbl);
    if (canEditRoles && username !== currentGroup.owner) {
      const sel = document.createElement('select'); sel.className = 'role-select';
      ['member', 'moderator', 'admin'].forEach((r) => {
        const opt = document.createElement('option'); opt.value = r;
        opt.textContent = r === 'member' ? 'membre' : r === 'moderator' ? 'modérateur' : 'admin';
        if ((currentGroup.roles[username] || 'member') === r) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', async () => {
        try {
          const res = await fetch(`/api/groups/${currentGroup.id}/role`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, role: sel.value }) });
          if (!res.ok) throw new Error((await res.json()).error);
        } catch (err) { rolesError.textContent = err.message; }
      });
      li.appendChild(sel);
    } else {
      const r = currentGroup.roles[username] || 'member';
      const span = document.createElement('span'); span.style.cssText = 'font-size:12px;color:var(--text-dim);';
      span.textContent = r === 'member' ? 'membre' : r === 'moderator' ? 'modérateur' : 'admin';
      li.appendChild(span);
    }
    rolesMembersList.appendChild(li);
  });
  rolesModal.classList.remove('hidden');
});
rolesCancelBtn.addEventListener('click', () => rolesModal.classList.add('hidden'));
rolesSaveCategoryBtn.addEventListener('click', async () => {
  if (!currentGroup) return; rolesError.textContent = '';
  try {
    const r1 = await fetch(`/api/groups/${currentGroup.id}/category`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: groupCategoryInput.value.trim() }) });
    if (!r1.ok) throw new Error((await r1.json()).error);
    const bannedWords = groupKeywordsInput.value.split(',').map((w) => w.trim()).filter(Boolean);
    const r2 = await fetch(`/api/groups/${currentGroup.id}/keywords`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bannedWords }) });
    if (!r2.ok) throw new Error((await r2.json()).error);
    rolesModal.classList.add('hidden');
  } catch (err) { rolesError.textContent = err.message; }
});

// ---------- Recherche ----------
searchToggleBtn.addEventListener('click', () => { searchBar.classList.toggle('hidden'); if (!searchBar.classList.contains('hidden')) searchInput.focus(); else closeSearch(); });
searchCloseBtn.addEventListener('click', closeSearch);
function closeSearch() { searchBar.classList.add('hidden'); searchResults.classList.add('hidden'); searchInput.value = ''; }
let searchDebounce = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const q = searchInput.value.trim(); if (!q) { searchResults.classList.add('hidden'); return; }
  searchDebounce = setTimeout(async () => {
    const res = await fetch('/api/search?q=' + encodeURIComponent(q));
    renderSearchResults(await res.json());
  }, 300);
});
function renderSearchResults(results) {
  searchResults.innerHTML = ''; searchResults.classList.remove('hidden');
  if (!results.length) { searchResults.innerHTML = '<div class="search-result-item">Aucun résultat.</div>'; return; }
  results.slice().reverse().forEach((r) => {
    const item = document.createElement('div'); item.className = 'search-result-item';
    const meta = document.createElement('div'); meta.className = 'search-result-meta';
    meta.textContent = `${r.author} · ${new Date(r.createdAt).toLocaleString()} · ${conversationLabel(r.conversationId)}`;
    const text = document.createElement('div'); text.textContent = r.text || (r.attachment ? '📎 ' + r.attachment.originalName : '');
    item.appendChild(meta); item.appendChild(text);
    item.addEventListener('click', () => {
      const target = resolveConversationTarget(r.conversationId);
      openConversation(r.conversationId, target.withUsername, target.group);
    });
    searchResults.appendChild(item);
  });
}
function conversationLabel(id) {
  if (id === 'general') return '#général';
  if (id.startsWith('dm:')) { const p = id.slice(3).split(':'); return '@' + (p.find((x) => x !== me.username.toLowerCase()) || 'dm'); }
  if (id.startsWith('group:')) { const g = groups.find((g) => groupConversationId(g.id) === id); return g ? '#' + g.name : 'groupe'; }
  return id;
}
function resolveConversationTarget(id) {
  if (id.startsWith('dm:')) {
    const other = id.slice(3).split(':').find((p) => p !== me.username.toLowerCase());
    const c = contacts.find((x) => x.username.toLowerCase() === other); return { withUsername: c ? c.username : other };
  }
  if (id.startsWith('group:')) { const g = groups.find((g) => groupConversationId(g.id) === id); return { group: g }; }
  return {};
}

// ---------- Blocage ----------
blockBtn.addEventListener('click', async () => {
  if (!currentDmUsername) return;
  const isBlocked = blockedUsernames.has(currentDmUsername);
  if (isBlocked) { await fetch('/api/blocks/' + encodeURIComponent(currentDmUsername), { method: 'DELETE' }); blockedUsernames.delete(currentDmUsername); }
  else { if (!confirm(`Bloquer ${currentDmUsername} ?`)) return; await apiPost('/api/blocks', { username: currentDmUsername }); blockedUsernames.add(currentDmUsername); }
  blockBtn.title = blockedUsernames.has(currentDmUsername) ? 'Débloquer' : 'Bloquer';
  renderContactsList();
});

// ---------- Message éphémère ----------
ephemeralToggleBtn.addEventListener('click', () => {
  isEphemeralModeOn = !isEphemeralModeOn;
  ephemeralToggleBtn.setAttribute('aria-pressed', String(isEphemeralModeOn));
});

// ---------- Envoi différé ----------
scheduleToggleBtn.addEventListener('click', () => {
  const show = schedulePicker.classList.contains('hidden');
  schedulePicker.classList.toggle('hidden', !show); scheduleToggleBtn.classList.toggle('active', show);
  if (show) { const d = new Date(Date.now() + 600000); d.setSeconds(0, 0); scheduleInput.value = d.toISOString().slice(0, 16); }
});
scheduleInput.addEventListener('change', () => { scheduledForValue = scheduleInput.value ? new Date(scheduleInput.value).toISOString() : null; });
scheduleCancelBtn.addEventListener('click', () => { scheduledForValue = null; schedulePicker.classList.add('hidden'); scheduleToggleBtn.classList.remove('active'); });

scheduledBtn.addEventListener('click', async () => {
  const res = await fetch('/api/scheduled'); const list = await res.json();
  scheduledList.innerHTML = ''; scheduledEmpty.classList.toggle('hidden', list.length > 0);
  list.forEach((entry) => {
    const li = document.createElement('li');
    const lbl = document.createElement('span'); lbl.style.flex = '1';
    lbl.textContent = `${conversationLabel(entry.conversationId)} · ${new Date(entry.sendAt).toLocaleString()} · ${entry.text || '📎'}`;
    const btn = document.createElement('button'); btn.className = 'icon-btn-small'; btn.textContent = '✕';
    btn.addEventListener('click', async () => { await fetch('/api/scheduled/' + entry.id, { method: 'DELETE' }); li.remove(); refreshScheduledBadge(); });
    li.appendChild(lbl); li.appendChild(btn); scheduledList.appendChild(li);
  });
  scheduledModal.classList.remove('hidden');
});
scheduledCloseBtn.addEventListener('click', () => scheduledModal.classList.add('hidden'));
async function refreshScheduledBadge() {
  try { const r = await fetch('/api/scheduled'); const l = await r.json(); scheduledBtn.textContent = l.length ? `🕐 ${l.length}` : '🕐'; } catch (e) {}
}

// ---------- Fond d'écran ----------
const WALLPAPER_PRESETS = [
  { id: 'default', label: 'Par défaut', css: '' },
  { id: 'midnight', label: 'Nuit', css: 'linear-gradient(160deg, #0a1228, #0f1c3d)' },
  { id: 'forest', label: 'Forêt', css: 'linear-gradient(160deg, #0d2818, #143d24)' },
  { id: 'plum', label: 'Prune', css: 'linear-gradient(160deg, #241338, #3a1d52)' },
  { id: 'ember', label: 'Braise', css: 'linear-gradient(160deg, #2a1410, #44201a)' },
];
wallpaperBtn.addEventListener('click', () => {
  wallpaperPresets.innerHTML = '';
  WALLPAPER_PRESETS.forEach((p) => {
    const s = document.createElement('button'); s.type = 'button'; s.className = 'wallpaper-swatch';
    s.style.background = p.css || 'var(--bg)'; s.title = p.label;
    s.addEventListener('click', async () => {
      if (p.id === 'default') await idbDeleteWallpaper(currentConversationId);
      else await idbSetWallpaper(currentConversationId, { type: 'css', value: p.css });
      applyWallpaper(currentConversationId);
    });
    wallpaperPresets.appendChild(s);
  });
  wallpaperModal.classList.remove('hidden');
});
wallpaperFileInput.addEventListener('change', async () => {
  const file = wallpaperFileInput.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => { await idbSetWallpaper(currentConversationId, { type: 'image', value: e.target.result }); applyWallpaper(currentConversationId); };
  reader.readAsDataURL(file);
});
wallpaperResetBtn.addEventListener('click', async () => { await idbDeleteWallpaper(currentConversationId); applyWallpaper(currentConversationId); });
wallpaperCloseBtn.addEventListener('click', () => wallpaperModal.classList.add('hidden'));
async function applyWallpaper(conversationId) {
  const saved = await idbGetWallpaper(conversationId);
  if (!saved) { messagesEl.style.backgroundImage = ''; return; }
  messagesEl.style.backgroundImage = saved.value.type === 'css' ? saved.value.value : `url(${saved.value.value})`;
  messagesEl.style.backgroundSize = 'cover'; messagesEl.style.backgroundPosition = 'center';
}

// ---------- Profil & paramètres ----------
profileBtn.addEventListener('click', () => {
  profileDisplayname.value = myProfile.displayName || '';
  profileUsernameDisplay.value = me ? me.username : '';
  profileBio.value = myProfile.bio || '';
  profileAvatarPreview.src = avatarUrl(myProfile.avatarFilename);
  profileError.textContent = ''; pwdError.textContent = ''; deleteError.textContent = '';
  pwdCurrent.value = ''; pwdNew.value = ''; pwdConfirm.value = ''; deletePwd.value = '';
  switchProfileTab('profile'); applyLanguage(currentLang);
  profileModal.classList.remove('hidden');
});
document.querySelectorAll('.profile-tab').forEach((btn) => btn.addEventListener('click', () => switchProfileTab(btn.dataset.ptab)));
function switchProfileTab(tab) {
  document.querySelectorAll('.profile-tab').forEach((b) => b.classList.toggle('active', b.dataset.ptab === tab));
  document.querySelectorAll('.profile-tab-panel').forEach((p) => p.classList.toggle('hidden', p.id !== 'ptab-' + tab));
}
profileCancelBtn.addEventListener('click', () => profileModal.classList.add('hidden'));

avatarFileInput.addEventListener('change', async () => {
  const file = avatarFileInput.files[0]; if (!file) return;
  profileAvatarPreview.style.opacity = '0.5';
  const compressed = await compressImageIfNeeded(file);
  const fd = new FormData(); fd.append('file', compressed);
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json(); if (!res.ok) throw new Error(data.error);
    profileAvatarPreview.src = avatarUrl(data.filename);
    profileAvatarPreview.dataset.pendingFilename = data.filename;
  } catch (e) { profileError.textContent = 'Erreur : ' + e.message; }
  finally { profileAvatarPreview.style.opacity = '1'; }
});

profileSaveBtn.addEventListener('click', async () => {
  profileError.textContent = '';
  const fd = new FormData();
  fd.append('displayName', profileDisplayname.value.trim());
  fd.append('bio', profileBio.value.trim());
  if (profileAvatarPreview.dataset.pendingFilename) {
    fd.append('avatarFilename', profileAvatarPreview.dataset.pendingFilename);
    delete profileAvatarPreview.dataset.pendingFilename;
  }
  try {
    const res = await fetch('/api/profile', { method: 'PATCH', body: fd });
    const data = await res.json(); if (!res.ok) throw new Error(data.error);
    myProfile.displayName = data.displayName || ''; myProfile.bio = data.bio || '';
    if (data.avatarFilename) myProfile.avatarFilename = data.avatarFilename;
    updateMyProfileUI(); profileModal.classList.add('hidden');
  } catch (e) { profileError.textContent = e.message; }
});

pwdSaveBtn.addEventListener('click', async () => {
  pwdError.textContent = '';
  if (pwdNew.value !== pwdConfirm.value) { pwdError.textContent = 'Les mots de passe ne correspondent pas.'; return; }
  if (pwdNew.value.length < 4) { pwdError.textContent = '4 caractères minimum.'; return; }
  try {
    await apiPost('/api/change-password', { currentPassword: pwdCurrent.value, newPassword: pwdNew.value });
    pwdCurrent.value = ''; pwdNew.value = ''; pwdConfirm.value = '';
    pwdError.style.color = 'var(--brand-green)'; pwdError.textContent = '✓ Mot de passe mis à jour.';
    setTimeout(() => { pwdError.textContent = ''; pwdError.style.color = ''; }, 3000);
  } catch (e) { pwdError.textContent = e.message; }
});

deleteAccountBtn.addEventListener('click', async () => {
  deleteError.textContent = '';
  if (!confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) return;
  try {
    const res = await fetch('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: deletePwd.value }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error);
    if (socket) socket.disconnect();
    me = null; chatScreen.classList.add('hidden'); authScreen.classList.remove('hidden'); profileModal.classList.add('hidden');
  } catch (e) { deleteError.textContent = e.message; }
});

document.querySelectorAll('.lang-btn').forEach((btn) => btn.addEventListener('click', () => applyLanguage(btn.dataset.lang)));

// ---------- Sidebar responsive (hamburger mobile) ----------
const sidebarEl = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function openSidebar() {
  sidebarEl && sidebarEl.classList.add('open');
  sidebarToggleBtn && sidebarToggleBtn.classList.add('open');
  sidebarOverlay && sidebarOverlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebarEl && sidebarEl.classList.remove('open');
  sidebarToggleBtn && sidebarToggleBtn.classList.remove('open');
  sidebarOverlay && sidebarOverlay.classList.remove('visible');
  document.body.style.overflow = '';
}

if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', () => {
  sidebarEl && sidebarEl.classList.contains('open') ? closeSidebar() : openSidebar();
});
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

// Fermer la sidebar quand on sélectionne une conversation sur mobile
function closeSidebarOnMobile() {
  if (window.innerWidth <= 640) closeSidebar();
}

// ---------- Statut ----------
statusSelect.addEventListener('change', () => {
  if (socket && socket.connected) socket.emit('status_change', { status: statusSelect.value });
});

// ---------- Appels (WebRTC, signaling uniquement) ----------
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
let peerConnection = null;
let localStream = null;
let activeCallConversationId = null;
let isCaller = false;

callModeToggle && callModeToggle.querySelectorAll('.call-mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    callMode = btn.dataset.mode;
    callModeToggle.querySelectorAll('.call-mode-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === callMode);
      b.setAttribute('aria-pressed', String(b.dataset.mode === callMode));
    });
  });
});

async function startCall(conversationId, withUsername, mode) {
  if (!conversationId || !withUsername) return;

  // Vérifications préalables visibles dans l'overlay (pas un alert brutal)
  callOverlay.classList.remove('hidden');
  callMode = mode; activeCallConversationId = conversationId; isCaller = true;
  callAcceptBtn.classList.add('hidden');

  if (!window.RTCPeerConnection) {
    callStatus.textContent = "⚠ Les appels WebRTC ne sont pas supportés par ce navigateur.";
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    callStatus.textContent = "⚠ Les appels nécessitent une connexion sécurisée (https:// ou http://localhost). Déployez le serveur avec HTTPS pour activer cette fonctionnalité.";
    return;
  }

  updateCallUI(mode, withUsername);
  callStatus.textContent = mode === 'audio' ? `📞 Appel vocal vers ${withUsername}…` : `📹 Appel vidéo vers ${withUsername}…`;

  try {
    await setupLocalMedia(mode);
  } catch (err) {
    if (mode === 'video') {
      callStatus.textContent = "Caméra indisponible, passage en audio seul…";
      callMode = 'audio'; updateCallUI('audio', withUsername);
      try { await setupLocalMedia('audio'); }
      catch (e) {
        callStatus.textContent = "⚠ Micro indisponible : " + e.message;
        setTimeout(() => endCall(false), 3000); return;
      }
    } else {
      callStatus.textContent = "⚠ Micro indisponible : " + err.message;
      setTimeout(() => endCall(false), 3000); return;
    }
  }

  socket.emit('call_invite', { conversationId, mode: callMode });
  createPeerConnection();
  try {
    const opts = callMode === 'audio'
      ? { offerToReceiveAudio: true, offerToReceiveVideo: false }
      : { offerToReceiveAudio: true, offerToReceiveVideo: true };
    const offer = await peerConnection.createOffer(opts);
    await peerConnection.setLocalDescription(offer);
    socket.emit('call_signal', { conversationId, signal: { type: 'offer', sdp: offer } });
  } catch (err) {
    callStatus.textContent = "⚠ Erreur d'initialisation : " + err.message;
    setTimeout(() => endCall(false), 3000);
  }
}
callBtn.addEventListener('click', () => startCall(currentConversationId, currentDmUsername, 'video'));
voiceCallBtn.addEventListener('click', () => startCall(currentConversationId, currentDmUsername, 'audio'));

function updateCallUI(mode, withUsername) {
  const isVideo = mode === 'video';
  if (callVideos) callVideos.classList.toggle('hidden', !isVideo);
  if (voiceCallIndicator) voiceCallIndicator.classList.toggle('hidden', isVideo);
  if (!isVideo && withUsername && voiceCallName) voiceCallName.textContent = withUsername;
}

function handleIncomingCall(conversationId, from, mode = 'video') {
  if (activeCallConversationId) { socket.emit('call_end', { conversationId }); return; }
  activeCallConversationId = conversationId; callMode = mode; isCaller = false;
  updateCallUI(mode, from);
  callOverlay.classList.remove('hidden');
  callStatus.textContent = (mode === 'audio' ? '📞 Appel vocal' : '📹 Appel vidéo') + ` de ${from}…`;
  callAcceptBtn.classList.remove('hidden');
  callAcceptBtn.onclick = async () => {
    callAcceptBtn.classList.add('hidden'); callStatus.textContent = 'Préparation…';
    try {
      await setupLocalMedia(mode); createPeerConnection(); callStatus.textContent = 'Connexion en cours…';
    } catch (err) {
      if (mode === 'video') {
        callMode = 'audio'; updateCallUI('audio', from);
        try { await setupLocalMedia('audio'); createPeerConnection(); }
        catch (e) { callStatus.textContent = 'Micro indisponible.'; setTimeout(() => endCall(true), 2000); }
      } else { callStatus.textContent = 'Micro indisponible.'; setTimeout(() => endCall(true), 2000); }
    }
  };
}

async function handleCallSignal(conversationId, signal) {
  if (conversationId !== activeCallConversationId) return;
  if (!peerConnection) {
    if (signal.type !== 'offer') return;
    try { await setupLocalMedia(callMode); createPeerConnection(); }
    catch (err) {
      if (callMode === 'video') {
        callMode = 'audio'; updateCallUI('audio', '');
        try { await setupLocalMedia('audio'); createPeerConnection(); }
        catch (e) { callStatus.textContent = "Impossible d'initialiser l'appel."; return; }
      } else { callStatus.textContent = "Impossible d'initialiser l'appel."; return; }
    }
  }
  try {
    if (signal.type === 'offer') {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const opts = callMode === 'audio' ? { offerToReceiveAudio: true, offerToReceiveVideo: false } : {};
      const answer = await peerConnection.createAnswer(opts);
      await peerConnection.setLocalDescription(answer);
      socket.emit('call_signal', { conversationId, signal: { type: 'answer', sdp: answer } });
      callStatus.textContent = 'Connexion en cours…';
    } else if (signal.type === 'answer') {
      if (peerConnection.signalingState !== 'stable') await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    } else if (signal.type === 'ice-candidate' && signal.candidate) {
      try { await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch (e) {}
    }
  } catch (err) { console.error('WebRTC signaling error:', err); }
}

async function setupLocalMedia(mode = 'video') {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
    throw new Error("API média non disponible (requis: https ou localhost).");
  const constraints = mode === 'audio'
    ? { audio: { echoCancellation: true, noiseSuppression: true }, video: false }
    : { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true } };
  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  if (mode === 'video' && localVideo) localVideo.srcObject = localStream;
}

function createPeerConnection() {
  if (peerConnection) { peerConnection.close(); peerConnection = null; }
  peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
  peerConnection.onicecandidate = (e) => {
    if (e.candidate && socket && socket.connected)
      socket.emit('call_signal', { conversationId: activeCallConversationId, signal: { type: 'ice-candidate', candidate: e.candidate } });
  };
  peerConnection.ontrack = (e) => {
    if (callMode === 'video' && remoteVideo) {
      remoteVideo.srcObject = e.streams[0];
    } else {
      let au = document.getElementById('call-audio-output');
      if (!au) { au = document.createElement('audio'); au.id = 'call-audio-output'; au.autoplay = true; document.body.appendChild(au); }
      au.srcObject = e.streams[0];
    }
    callStatus.textContent = callMode === 'audio' ? '📞 Appel vocal en cours' : '📹 Appel vidéo en cours';
  };
  peerConnection.oniceconnectionstatechange = () => {
    const s = peerConnection.iceConnectionState;
    if (s === 'checking') callStatus.textContent = 'Établissement de la connexion…';
    else if (s === 'connected' || s === 'completed') callStatus.textContent = callMode === 'audio' ? '📞 Appel vocal en cours' : '📹 Appel vidéo en cours';
    else if (s === 'failed') { callStatus.textContent = 'Connexion échouée.'; setTimeout(() => endCall(true), 2000); }
    else if (s === 'disconnected') callStatus.textContent = 'Connexion interrompue…';
  };
  peerConnection.onconnectionstatechange = () => {
    if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) endCall(false);
  };
}

callHangupBtn.addEventListener('click', () => endCall(true));
function endCall(notifyPeer) {
  if (notifyPeer && socket && activeCallConversationId) socket.emit('call_end', { conversationId: activeCallConversationId });
  if (peerConnection) { peerConnection.close(); peerConnection = null; }
  if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
  const au = document.getElementById('call-audio-output');
  if (au) au.srcObject = null;
  if (localVideo) localVideo.srcObject = null;
  if (remoteVideo) remoteVideo.srcObject = null;
  activeCallConversationId = null;
  if (callOverlay) callOverlay.classList.add('hidden');
  if (callStatus) callStatus.textContent = '';
}
