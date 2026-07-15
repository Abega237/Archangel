// server.js — Archangel : chat temps réel, DM, groupes, fichiers, recherche, modération, appels, profil
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const multer = require('multer');

const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'archangel-dev-secret-change-me';
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));
// Servir les icônes PWA générées
app.use('/icons', express.static(path.join(__dirname, 'public', 'icons')));
// Content-Type explicite pour le manifest (certains serveurs proxy le servent en text/plain)
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname)),
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 Mo
});

// ---------- Auth helpers ----------
function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}
function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch (e) { return res.status(401).json({ error: 'Session invalide' }); }
}

// ---------- Routes Auth ----------
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.trim().length < 3 || password.length < 4)
    return res.status(400).json({ error: "Nom d'utilisateur (3+ car.) et mot de passe (4+ car.) requis." });
  if (db.getUserByUsername(username))
    return res.status(409).json({ error: "Ce nom d'utilisateur est déjà pris." });
  const user = {
    id: crypto.randomUUID(),
    username: username.trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString(),
  };
  db.createUser(user);
  const token = signToken(user);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
  res.json({ id: user.id, username: user.username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.getUserByUsername(username || '');
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash))
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  const token = signToken(user);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
  res.json({ id: user.id, username: user.username });
});

app.post('/api/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });

app.get('/api/me', authMiddleware, (req, res) => {
  const user = db.getUserByUsername(req.user.username);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  res.json({
    id: user.id, username: user.username,
    displayName: user.displayName || '', bio: user.bio || '', avatarFilename: user.avatarFilename || null,
  });
});

// ---------- Profil ----------
app.patch('/api/profile', authMiddleware, upload.single('avatar'), (req, res) => {
  const { displayName, bio, avatarFilename: bodyAvatar } = req.body;
  const avatarFilename = req.file ? req.file.filename : bodyAvatar;
  const updated = db.updateUserProfile(req.user.username, { displayName, bio, avatarFilename });
  if (!updated) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  io.emit('user_profile_updated', {
    username: updated.username,
    displayName: updated.displayName || '',
    avatarFilename: updated.avatarFilename || null,
  });
  res.json({ ok: true, displayName: updated.displayName, bio: updated.bio, avatarFilename: updated.avatarFilename });
});

app.post('/api/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 4)
    return res.status(400).json({ error: 'Nouveau mot de passe trop court (4 caractères minimum).' });
  const user = db.getUserByUsername(req.user.username);
  if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash))
    return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
  db.updateUserPassword(req.user.username, bcrypt.hashSync(newPassword, 10));
  res.json({ ok: true });
});

app.delete('/api/account', authMiddleware, (req, res) => {
  const { password } = req.body;
  const user = db.getUserByUsername(req.user.username);
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash))
    return res.status(401).json({ error: 'Mot de passe incorrect. Suppression annulée.' });
  if (user.avatarFilename) {
    const p = path.join(UPLOAD_DIR, user.avatarFilename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  db.deleteAccount(req.user.username);
  res.clearCookie('token');
  io.emit('user_deleted', { username: req.user.username });
  res.json({ ok: true });
});

app.get('/api/users', authMiddleware, (req, res) => {
  const blockedByMe = new Set(db.getBlocksByUser(req.user.username));
  const users = db.getUsers()
    .filter((u) => u.username !== req.user.username)
    .map((u) => ({
      username: u.username,
      displayName: u.displayName || '',
      avatarFilename: u.avatarFilename || null,
      blocked: blockedByMe.has(u.username),
    }));
  res.json(users);
});

// ---------- Conversations helpers ----------
function dmConversationId(userA, userB) {
  return 'dm:' + [userA, userB].map((u) => u.toLowerCase()).sort().join(':');
}
function groupConversationId(groupId) { return 'group:' + groupId; }

function canAccessConversation(username, conversationId) {
  if (conversationId === 'general') return true;
  if (conversationId.startsWith('dm:')) {
    const parts = conversationId.slice(3).split(':');
    if (!parts.includes(username.toLowerCase())) return false;
    const other = parts.find((p) => p !== username.toLowerCase());
    return !db.isBlockedEitherWay(username, other);
  }
  if (conversationId.startsWith('group:')) {
    const group = db.getGroupById(conversationId.slice(6));
    return !!group && group.members.includes(username);
  }
  return false;
}

// Filtrage de modération : mots globaux + mots-clés définis par le modérateur du groupe
const BANNED_WORDS = ['puteclic', 'spamlink.biz'];
function containsBannedWord(text, extraWords) {
  const lower = text.toLowerCase();
  return [...BANNED_WORDS, ...(extraWords || [])].some((w) => lower.includes(w));
}

// ---------- Groupes ----------
app.post('/api/groups', authMiddleware, (req, res) => {
  const { name, members, category } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nom de groupe requis.' });
  const memberSet = new Set([req.user.username, ...(Array.isArray(members) ? members : [])]);
  for (const m of memberSet)
    if (!db.getUserByUsername(m)) return res.status(400).json({ error: `Utilisateur inconnu : ${m}` });
  const group = {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 80),
    category: (category || '').trim().slice(0, 40),
    owner: req.user.username,
    members: Array.from(memberSet),
    roles: { [req.user.username]: 'admin' },
    pinned: [],
    bannedWords: [],
    createdAt: new Date().toISOString(),
  };
  db.createGroup(group);
  group.members.forEach((m) => {
    const sockets = userSockets.get(m);
    if (sockets) sockets.forEach((sid) => io.to(sid).emit('group_created', group));
  });
  res.json(group);
});

app.get('/api/groups', authMiddleware, (req, res) => {
  res.json(db.getGroupsForUser(req.user.username));
});

app.patch('/api/groups/:id/role', authMiddleware, (req, res) => {
  const group = db.getGroupById(req.params.id);
  if (!group || !group.members.includes(req.user.username)) return res.status(404).json({ error: 'Groupe introuvable.' });
  if (db.getGroupRole(group, req.user.username) !== 'admin')
    return res.status(403).json({ error: 'Seul un administrateur peut changer les rôles.' });
  const updated = db.setGroupRole(group.id, req.body.username, req.body.role);
  if (!updated) return res.status(400).json({ error: 'Rôle ou utilisateur invalide.' });
  emitToConversation(groupConversationId(group.id), 'group_updated', updated, null);
  res.json(updated);
});

app.patch('/api/groups/:id/category', authMiddleware, (req, res) => {
  const group = db.getGroupById(req.params.id);
  if (!group || !group.members.includes(req.user.username)) return res.status(404).json({ error: 'Groupe introuvable.' });
  const role = db.getGroupRole(group, req.user.username);
  if (role !== 'admin' && role !== 'moderator')
    return res.status(403).json({ error: 'Seuls les administrateurs ou modérateurs peuvent changer la catégorie.' });
  const updated = db.updateGroupCategory(group.id, req.body.category);
  emitToConversation(groupConversationId(group.id), 'group_updated', updated, null);
  res.json(updated);
});

app.patch('/api/groups/:id/keywords', authMiddleware, (req, res) => {
  const group = db.getGroupById(req.params.id);
  if (!group || !group.members.includes(req.user.username)) return res.status(404).json({ error: 'Groupe introuvable.' });
  const role = db.getGroupRole(group, req.user.username);
  if (role !== 'admin' && role !== 'moderator')
    return res.status(403).json({ error: 'Action réservée aux administrateurs ou modérateurs.' });
  const updated = db.updateGroupBannedWords(group.id, req.body.bannedWords);
  emitToConversation(groupConversationId(group.id), 'group_updated', updated, null);
  res.json(updated);
});

app.post('/api/groups/:id/pin', authMiddleware, (req, res) => {
  const group = db.getGroupById(req.params.id);
  if (!group || !group.members.includes(req.user.username)) return res.status(404).json({ error: 'Groupe introuvable.' });
  const role = db.getGroupRole(group, req.user.username);
  if (role !== 'admin' && role !== 'moderator')
    return res.status(403).json({ error: "Seuls les administrateurs ou modérateurs peuvent épingler un message." });
  const { messages } = db.getMessages(groupConversationId(group.id), { limit: 100000 });
  const message = messages.find((m) => m.id === req.body.messageId);
  if (!message) return res.status(404).json({ error: 'Message introuvable.' });
  const updated = db.pinMessage(group.id, message);
  emitToConversation(groupConversationId(group.id), 'group_updated', updated, null);
  res.json(updated);
});

app.delete('/api/groups/:id/pin/:messageId', authMiddleware, (req, res) => {
  const group = db.getGroupById(req.params.id);
  if (!group || !group.members.includes(req.user.username)) return res.status(404).json({ error: 'Groupe introuvable.' });
  const role = db.getGroupRole(group, req.user.username);
  if (role !== 'admin' && role !== 'moderator')
    return res.status(403).json({ error: 'Action réservée aux administrateurs ou modérateurs.' });
  const updated = db.unpinMessage(group.id, req.params.messageId);
  emitToConversation(groupConversationId(group.id), 'group_updated', updated, null);
  res.json(updated);
});

// ---------- Messages ----------
app.get('/api/messages', authMiddleware, (req, res) => {
  const conversationId = req.query.conversationId || 'general';
  if (!canAccessConversation(req.user.username, conversationId))
    return res.status(403).json({ error: 'Accès refusé à cette conversation.' });
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const { messages, hasMore } = db.getMessages(conversationId, { limit, before: req.query.before || null });
  res.json({ messages, hasMore });
});

// ---------- Recherche ----------
app.get('/api/search', authMiddleware, (req, res) => {
  const { q, author, from, to, conversationId } = req.query;
  const username = req.user.username;

  const accessibleIds = new Set(['general']);
  db.getUsers().forEach((u) => {
    if (u.username !== username) {
      const id = dmConversationId(username, u.username);
      if (canAccessConversation(username, id)) accessibleIds.add(id);
    }
  });
  db.getGroupsForUser(username).forEach((g) => accessibleIds.add(groupConversationId(g.id)));

  let results = db.getAllMessages().filter((m) => !m.deleted && accessibleIds.has(m.conversationId));
  if (conversationId) results = results.filter((m) => m.conversationId === conversationId);
  if (q) {
    const needle = q.toLowerCase();
    results = results.filter(
      (m) => (m.text && m.text.toLowerCase().includes(needle)) ||
              (m.attachment && m.attachment.originalName.toLowerCase().includes(needle))
    );
  }
  if (author) results = results.filter((m) => m.author.toLowerCase() === author.toLowerCase());
  if (from) results = results.filter((m) => m.createdAt >= from);
  if (to) results = results.filter((m) => m.createdAt <= to);
  res.json(results.slice(-100));
});

// ---------- Fichiers ----------
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });
  res.json({
    filename: req.file.filename, originalName: req.file.originalname,
    mimeType: req.file.mimetype, size: req.file.size, url: `/uploads/${req.file.filename}`,
  });
});

// ---------- Modération ----------
app.post('/api/blocks', authMiddleware, (req, res) => {
  const { username } = req.body;
  if (!username || username === req.user.username) return res.status(400).json({ error: 'Utilisateur invalide.' });
  if (!db.getUserByUsername(username)) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  db.addBlock(req.user.username, username);
  res.json({ ok: true });
});
app.delete('/api/blocks/:username', authMiddleware, (req, res) => {
  db.removeBlock(req.user.username, req.params.username);
  res.json({ ok: true });
});
app.get('/api/blocks', authMiddleware, (req, res) => {
  res.json(db.getBlocksByUser(req.user.username));
});
app.post('/api/reports', authMiddleware, (req, res) => {
  const { type, targetId, reason } = req.body;
  if (!['message', 'user'].includes(type) || !targetId)
    return res.status(400).json({ error: 'Signalement invalide.' });
  const report = {
    id: crypto.randomUUID(), type, targetId,
    reason: (reason || '').slice(0, 500),
    reporter: req.user.username, createdAt: new Date().toISOString(),
  };
  db.addReport(report);
  res.json({ ok: true });
});

// ---------- Envoi différé ----------
app.get('/api/scheduled', authMiddleware, (req, res) => {
  res.json(db.getScheduledForUser(req.user.username));
});
app.delete('/api/scheduled/:id', authMiddleware, (req, res) => {
  const entry = db.getScheduledMessages().find((s) => s.id === req.params.id);
  if (!entry || entry.author !== req.user.username)
    return res.status(404).json({ error: 'Message programmé introuvable.' });
  db.removeScheduledMessage(req.params.id);
  res.json({ ok: true });
});

// ---------- Socket.io ----------
const onlineUsers = new Map();   // socket.id -> username
const userSockets = new Map();   // username -> Set(socket.id)
const userStatus = new Map();    // username -> 'online' | 'away' | 'busy'

function broadcastPresence() {
  const payload = Array.from(userSockets.keys()).map((username) => ({
    username, status: userStatus.get(username) || 'online',
  }));
  io.emit('presence', payload);
}

function conversationParticipants(conversationId) {
  if (conversationId === 'general') return Array.from(userSockets.keys());
  if (conversationId.startsWith('dm:')) return conversationId.slice(3).split(':');
  if (conversationId.startsWith('group:')) {
    const group = db.getGroupById(conversationId.slice(6));
    return group ? group.members : [];
  }
  return [];
}

function emitToConversation(conversationId, event, payload, exceptUsername) {
  const participants = conversationParticipants(conversationId).map((p) => p.toLowerCase());
  Array.from(userSockets.keys())
    .filter((u) => participants.includes(u.toLowerCase()) && u !== exceptUsername)
    .forEach((username) => {
      const sockets = userSockets.get(username);
      if (sockets) sockets.forEach((sid) => io.to(sid).emit(event, payload));
    });
}

function authenticateSocket(socket) {
  const cookieHeader = socket.handshake.headers.cookie || '';
  const match = cookieHeader.match(/token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(decodeURIComponent(match[1]), JWT_SECRET); }
  catch (e) { return null; }
}

io.on('connection', (socket) => {
  const user = authenticateSocket(socket);
  if (!user) { socket.emit('auth_error', 'Non authentifié'); socket.disconnect(true); return; }

  onlineUsers.set(socket.id, user.username);
  if (!userSockets.has(user.username)) userSockets.set(user.username, new Set());
  userSockets.get(user.username).add(socket.id);
  if (!userStatus.has(user.username)) userStatus.set(user.username, 'online');
  broadcastPresence();

  // ----- Chat -----
  socket.on('chat_message', (payload = {}) => {
    const { conversationId, text, attachment, ephemeral, scheduledFor } = payload;
    const hasText = typeof text === 'string' && text.trim().length > 0;
    if (!hasText && !attachment) return;
    if (typeof conversationId !== 'string' || !canAccessConversation(user.username, conversationId)) return;

    if (hasText) {
      let extraWords = [];
      if (conversationId.startsWith('group:')) {
        const group = db.getGroupById(conversationId.slice(6));
        if (group) extraWords = group.bannedWords || [];
      }
      if (containsBannedWord(text, extraWords)) {
        socket.emit('moderation_error', "Ce message contient un contenu non autorisé et n'a pas été envoyé.");
        return;
      }
    }

    const isEphemeral = !!ephemeral && conversationId.startsWith('dm:');
    const message = {
      id: crypto.randomUUID(),
      conversationId,
      author: user.username,
      text: hasText ? text.trim().slice(0, 2000) : '',
      attachment: attachment || null,
      ephemeral: isEphemeral,
      createdAt: new Date().toISOString(),
    };

    // Envoi différé
    if (scheduledFor && typeof scheduledFor === 'string' && scheduledFor > new Date().toISOString()) {
      db.addScheduledMessage({ ...message, sendAt: scheduledFor });
      socket.emit('message_scheduled', { ...message, sendAt: scheduledFor });
      return;
    }

    db.addMessage(message);
    if (conversationId === 'general') {
      io.emit('chat_message', message);
    } else {
      // Pour les DM : indiquer si le destinataire est actuellement en ligne (= délivré)
      if (conversationId.startsWith('dm:')) {
        const parts = conversationId.slice(3).split(':');
        const otherUsername = parts.find((p) => p !== user.username.toLowerCase());
        message.delivered = otherUsername ? userSockets.has(otherUsername) || userSockets.has(
          db.getUsers().find(u => u.username.toLowerCase() === otherUsername)?.username || ''
        ) : false;
      }
      emitToConversation(conversationId, 'chat_message', message, user.username);
      socket.emit('chat_message', message);
    }
  });

  socket.on('message_viewed', ({ messageId } = {}) => {
    if (!messageId) return;
    const updated = db.markEphemeralViewed(messageId, user.username);
    if (!updated) return;
    emitToConversation(updated.conversationId, 'message_updated', updated, null);
  });

  socket.on('message_edit', ({ messageId, text } = {}) => {
    if (!messageId || typeof text !== 'string' || !text.trim()) return;
    if (containsBannedWord(text)) { socket.emit('moderation_error', "Contenu non autorisé."); return; }
    const updated = db.editMessage(messageId, user.username, text.trim().slice(0, 2000));
    if (!updated) return;
    if (updated.conversationId === 'general') io.emit('message_updated', updated);
    else { emitToConversation(updated.conversationId, 'message_updated', updated, null); socket.emit('message_updated', updated); }
  });

  socket.on('message_delete', ({ messageId } = {}) => {
    if (!messageId) return;
    const updated = db.deleteMessage(messageId, user.username);
    if (!updated) return;
    if (updated.conversationId === 'general') io.emit('message_updated', updated);
    else { emitToConversation(updated.conversationId, 'message_updated', updated, null); socket.emit('message_updated', updated); }
  });

  socket.on('typing', ({ conversationId } = {}) => {
    if (typeof conversationId !== 'string' || !canAccessConversation(user.username, conversationId)) return;
    const payload = { username: user.username, conversationId };
    if (conversationId === 'general') socket.broadcast.emit('typing', payload);
    else emitToConversation(conversationId, 'typing', payload, user.username);
  });

  socket.on('status_change', ({ status } = {}) => {
    if (!['online', 'away', 'busy'].includes(status)) return;
    userStatus.set(user.username, status);
    broadcastPresence();
  });

  // ----- Accusés de lecture (DM uniquement) -----
  socket.on('read_receipt', ({ conversationId, lastMessageId } = {}) => {
    if (!conversationId || !conversationId.startsWith('dm:') || !lastMessageId) return;
    if (!canAccessConversation(user.username, conversationId)) return;
    emitToConversation(conversationId, 'messages_read', {
      conversationId,
      reader: user.username,
      lastMessageId,
      readAt: new Date().toISOString(),
    }, user.username);
  });

  // ----- Appels (signaling WebRTC — le flux audio/vidéo passe directement entre navigateurs) -----
  socket.on('call_invite', ({ conversationId, mode } = {}) => {
    if (!conversationId || !conversationId.startsWith('dm:') || !canAccessConversation(user.username, conversationId)) return;
    emitToConversation(conversationId, 'call_invite', { conversationId, from: user.username, mode: mode || 'video' }, user.username);
  });
  socket.on('call_signal', ({ conversationId, signal } = {}) => {
    if (!conversationId || !conversationId.startsWith('dm:') || !canAccessConversation(user.username, conversationId)) return;
    emitToConversation(conversationId, 'call_signal', { conversationId, from: user.username, signal }, user.username);
  });
  socket.on('call_end', ({ conversationId } = {}) => {
    if (!conversationId) return;
    emitToConversation(conversationId, 'call_end', { conversationId, from: user.username }, user.username);
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    const set = userSockets.get(user.username);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) { userSockets.delete(user.username); userStatus.delete(user.username); }
    }
    broadcastPresence();
  });
});

// Minuteur d'envoi différé
setInterval(() => {
  const due = db.getDueScheduledMessages();
  due.forEach((entry) => {
    const { sendAt, ...message } = entry;
    db.addMessage(message);
    db.removeScheduledMessage(entry.id);
    if (message.conversationId === 'general') io.emit('chat_message', message);
    else emitToConversation(message.conversationId, 'chat_message', message, null);
  });
}, 10000);

// Récupère les adresses IPv4 locales (utile pour accéder à l'app depuis d'autres
// appareils connectés au même point d'accès / réseau Wi-Fi, sans passer par internet)
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

// '0.0.0.0' = écoute explicitement sur toutes les interfaces réseau (pas seulement localhost)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Archangel en écoute sur http://localhost:${PORT}`);
  const ips = getLocalIPs();
  if (ips.length) {
    console.log('Accessible depuis les autres appareils du même réseau/point d\'accès sur :');
    ips.forEach((ip) => console.log(`  → http://${ip}:${PORT}`));
  } else {
    console.log('Aucune interface réseau locale détectée (vérifiez la connexion Wi-Fi/point d\'accès).');
  }
});
