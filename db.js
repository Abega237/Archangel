// db.js — Persistance légère sur fichiers JSON
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const BLOCKS_FILE = path.join(DATA_DIR, 'blocks.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const SCHEDULED_FILE = path.join(DATA_DIR, 'scheduled.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
[USERS_FILE, MESSAGES_FILE, GROUPS_FILE, BLOCKS_FILE, REPORTS_FILE, SCHEDULED_FILE].forEach((f) => {
  if (!fs.existsSync(f)) fs.writeFileSync(f, '[]');
});

function readJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

// --- Users ---
function getUsers() { return readJSON(USERS_FILE); }
function getUserByUsername(username) {
  return getUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
}
function createUser(user) {
  const users = getUsers();
  users.push(user);
  writeJSON(USERS_FILE, users);
  return user;
}
function updateUserProfile(username, { displayName, bio, avatarFilename }) {
  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return null;
  if (displayName !== undefined) user.displayName = displayName.trim().slice(0, 60);
  if (bio !== undefined) user.bio = bio.trim().slice(0, 300);
  if (avatarFilename !== undefined) user.avatarFilename = avatarFilename;
  writeJSON(USERS_FILE, users);
  return user;
}
function updateUserPassword(username, newHash) {
  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return null;
  user.passwordHash = newHash;
  writeJSON(USERS_FILE, users);
  return user;
}
function deleteAccount(username) {
  const uLower = username.toLowerCase();
  writeJSON(USERS_FILE, readJSON(USERS_FILE).filter((u) => u.username.toLowerCase() !== uLower));
  const messages = readJSON(MESSAGES_FILE).map((m) => {
    if (m.author.toLowerCase() === uLower && !m.deleted) {
      return { ...m, deleted: true, text: '', attachment: null };
    }
    return m;
  });
  writeJSON(MESSAGES_FILE, messages);
  const groups = readJSON(GROUPS_FILE).map((g) => {
    const newMembers = g.members.filter((m) => m.toLowerCase() !== uLower);
    if (newMembers.length === 0) return null;
    const updatedRoles = { ...g.roles };
    delete updatedRoles[username];
    let newOwner = g.owner;
    if (g.owner.toLowerCase() === uLower) {
      const nextAdmin = newMembers.find((m) => updatedRoles[m] === 'admin');
      newOwner = nextAdmin || newMembers[0];
      if (newOwner) updatedRoles[newOwner] = 'admin';
    }
    return { ...g, members: newMembers, roles: updatedRoles, owner: newOwner };
  }).filter(Boolean);
  writeJSON(GROUPS_FILE, groups);
  writeJSON(BLOCKS_FILE, readJSON(BLOCKS_FILE).filter(
    (b) => b.blocker.toLowerCase() !== uLower && b.blocked.toLowerCase() !== uLower
  ));
  writeJSON(SCHEDULED_FILE, readJSON(SCHEDULED_FILE).filter((s) => s.author.toLowerCase() !== uLower));
}

// --- Messages ---
// conversationId : "general" | "dm:<userA>:<userB>" (triés) | "group:<groupId>"
function getMessages(conversationId, { limit = 30, before = null } = {}) {
  let messages = readJSON(MESSAGES_FILE).filter((m) => m.conversationId === conversationId);
  if (before) {
    const idx = messages.findIndex((m) => m.id === before);
    if (idx !== -1) messages = messages.slice(0, idx);
  }
  const hasMore = messages.length > limit;
  return { messages: messages.slice(-limit), hasMore };
}
function getAllMessages() { return readJSON(MESSAGES_FILE); }
function addMessage(message) {
  const messages = readJSON(MESSAGES_FILE);
  messages.push(message);
  writeJSON(MESSAGES_FILE, messages);
  return message;
}
function editMessage(messageId, username, newText) {
  const messages = readJSON(MESSAGES_FILE);
  const msg = messages.find((m) => m.id === messageId);
  if (!msg || msg.author !== username) return null;
  if (!msg.editHistory) msg.editHistory = [];
  msg.editHistory.push({ text: msg.text, editedAt: new Date().toISOString() });
  msg.text = newText;
  msg.edited = true;
  writeJSON(MESSAGES_FILE, messages);
  return msg;
}
function deleteMessage(messageId, username) {
  const messages = readJSON(MESSAGES_FILE);
  const msg = messages.find((m) => m.id === messageId);
  if (!msg || msg.author !== username) return null;
  msg.deleted = true;
  msg.text = '';
  msg.attachment = null;
  writeJSON(MESSAGES_FILE, messages);
  return msg;
}
function markEphemeralViewed(messageId, viewerUsername) {
  const messages = readJSON(MESSAGES_FILE);
  const msg = messages.find((m) => m.id === messageId);
  if (!msg || !msg.ephemeral || msg.deleted || msg.author === viewerUsername) return null;
  msg.deleted = true;
  msg.text = '';
  msg.attachment = null;
  msg.viewedAt = new Date().toISOString();
  writeJSON(MESSAGES_FILE, messages);
  return msg;
}

// --- Groups ---
function getGroups() { return readJSON(GROUPS_FILE); }
function getGroupById(id) { return getGroups().find((g) => g.id === id); }
function getGroupsForUser(username) { return getGroups().filter((g) => g.members.includes(username)); }
function createGroup(group) {
  const groups = getGroups();
  groups.push(group);
  writeJSON(GROUPS_FILE, groups);
  return group;
}
function getGroupRole(group, username) { return (group.roles && group.roles[username]) || 'member'; }
function setGroupRole(groupId, targetUsername, role) {
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group || !group.members.includes(targetUsername)) return null;
  if (!['admin', 'moderator', 'member'].includes(role)) return null;
  group.roles = group.roles || {};
  group.roles[targetUsername] = role;
  writeJSON(GROUPS_FILE, groups);
  return group;
}
function updateGroupCategory(groupId, category) {
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;
  group.category = (category || '').slice(0, 40);
  writeJSON(GROUPS_FILE, groups);
  return group;
}
function updateGroupBannedWords(groupId, words) {
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;
  group.bannedWords = Array.isArray(words)
    ? words.map((w) => String(w).toLowerCase().trim()).filter(Boolean).slice(0, 50)
    : [];
  writeJSON(GROUPS_FILE, groups);
  return group;
}
function pinMessage(groupId, message) {
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;
  group.pinned = group.pinned || [];
  if (!group.pinned.some((p) => p.messageId === message.id)) {
    group.pinned.push({ messageId: message.id, text: message.text, author: message.author, pinnedAt: new Date().toISOString() });
  }
  writeJSON(GROUPS_FILE, groups);
  return group;
}
function unpinMessage(groupId, messageId) {
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;
  group.pinned = (group.pinned || []).filter((p) => p.messageId !== messageId);
  writeJSON(GROUPS_FILE, groups);
  return group;
}

// --- Blocks ---
function getBlocks() { return readJSON(BLOCKS_FILE); }
function isBlocked(blocker, blocked) {
  return getBlocks().some(
    (b) => b.blocker.toLowerCase() === blocker.toLowerCase() && b.blocked.toLowerCase() === blocked.toLowerCase()
  );
}
function isBlockedEitherWay(userA, userB) { return isBlocked(userA, userB) || isBlocked(userB, userA); }
function addBlock(blocker, blocked) {
  const blocks = getBlocks();
  if (!blocks.some((b) => b.blocker === blocker && b.blocked === blocked)) {
    blocks.push({ blocker, blocked, createdAt: new Date().toISOString() });
    writeJSON(BLOCKS_FILE, blocks);
  }
}
function removeBlock(blocker, blocked) {
  writeJSON(BLOCKS_FILE, getBlocks().filter((b) => !(b.blocker === blocker && b.blocked === blocked)));
}
function getBlocksByUser(blocker) { return getBlocks().filter((b) => b.blocker === blocker).map((b) => b.blocked); }

// --- Reports ---
function getReports() { return readJSON(REPORTS_FILE); }
function addReport(report) {
  const reports = getReports();
  reports.push(report);
  writeJSON(REPORTS_FILE, reports);
  return report;
}

// --- Scheduled messages ---
function getScheduledMessages() { return readJSON(SCHEDULED_FILE); }
function addScheduledMessage(entry) {
  const list = getScheduledMessages();
  list.push(entry);
  writeJSON(SCHEDULED_FILE, list);
  return entry;
}
function getDueScheduledMessages() {
  const now = new Date().toISOString();
  return getScheduledMessages().filter((s) => s.sendAt <= now);
}
function getScheduledForUser(username) { return getScheduledMessages().filter((s) => s.author === username); }
function removeScheduledMessage(id) {
  writeJSON(SCHEDULED_FILE, getScheduledMessages().filter((s) => s.id !== id));
}

module.exports = {
  getUsers, getUserByUsername, createUser, updateUserProfile, updateUserPassword, deleteAccount,
  getMessages, getAllMessages, addMessage, editMessage, deleteMessage, markEphemeralViewed,
  getGroups, getGroupById, getGroupsForUser, createGroup, getGroupRole, setGroupRole,
  updateGroupCategory, updateGroupBannedWords, pinMessage, unpinMessage,
  isBlocked, isBlockedEitherWay, addBlock, removeBlock, getBlocksByUser,
  getReports, addReport,
  getScheduledMessages, addScheduledMessage, getDueScheduledMessages, getScheduledForUser, removeScheduledMessage,
};
