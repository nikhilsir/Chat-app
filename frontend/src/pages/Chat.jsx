import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';

export default function Chat() {
const { user, token, API, logout } = useAuth();
const socket = useSocket();

const [chats, setChats] = useState([]);
const [users, setUsers] = useState([]);
const [activeChat, setActiveChat] = useState(null);
const [messages, setMessages] = useState([]);
const [onlineMap, setOnlineMap] = useState({});
const [typingUsers, setTypingUsers] = useState({});
const [mobileShowChat, setMobileShowChat] = useState(false);

useEffect(() => {
if (!token) return;

const headers = { Authorization: `Bearer ${token}` }; axios.get(`${API}/chats`, { headers }) .then(r => setChats(r.data)) .catch(console.error); axios.get(`${API}/users`, { headers }) .then(r => { setUsers(r.data); const map = {}; r.data.forEach(u => { map[u.id] = u.online; }); setOnlineMap(map); }) .catch(console.error);

}, [token, API]);

useEffect(() => {
if (!socket) return;

const headers = { Authorization: `Bearer ${token}` }; const onNewMessage = msg => { if (activeChat?.id === msg.chatId) { setMessages(prev => { if (prev.some(m => m.id === msg.id)) return prev; return [...prev, msg]; }); } setChats(prev => { const updated = prev.map(c => c.id === msg.chatId ? { ...c, lastMessage: msg, updatedAt: msg.createdAt } : c ); return updated.sort( (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0) ); }); }; const onOnline = ({ userId, online }) => { setOnlineMap(prev => ({ ...prev, [userId]: online })); setUsers(prev => prev.map(u => u.id === userId ? { ...u, online } : u )); }; const onTypingStart = ({ chatId, userId, username }) => { if (chatId === activeChat?.id) { setTypingUsers(prev => ({ ...prev, [userId]: username })); } }; const onTypingStop = ({ chatId, userId }) => { if (chatId === activeChat?.id) { setTypingUsers(prev => { const next = { ...prev }; delete next[userId]; return next; }); } }; const onChatNew = () => { axios.get(`${API}/chats`, { headers }) .then(r => setChats(r.data)) .catch(console.error); }; socket.on('message:new', onNewMessage); socket.on('user:online', onOnline); socket.on('typing:start', onTypingStart); socket.on('typing:stop', onTypingStop); socket.on('chat:new', onChatNew); return () => { socket.off('message:new', onNewMessage); socket.off('user:online', onOnline); socket.off('typing:start', onTypingStart); socket.off('typing:stop', onTypingStop); socket.off('chat:new', onChatNew); };

}, [socket, activeChat, token, API]);

useEffect(() => {
if (!activeChat || !token) {
setMessages([]);
setTypingUsers({});
return;
}

let cancelled = false; setMessages([]); setTypingUsers({}); axios.get(`${API}/chats/${activeChat.id}/messages`, { headers: { Authorization: `Bearer ${token}` } }) .then(r => { if (!cancelled) setMessages(r.data); }) .catch(err => { if (!cancelled) console.error(err); }); if (socket) { socket.emit('chat:join', { chatId: activeChat.id }); } return () => { cancelled = true; };

}, [activeChat, token, API, socket]);

const selectChat = chat => {
setActiveChat(chat);
setMobileShowChat(true);
};

const startPrivateChat = async userId => {
try {
const res = await axios.post(
${API}/chats/private,
{ userId },
{ headers: { Authorization: Bearer ${token} } }
);

const chat = res.data; setChats(prev => { const existing = prev.find(c => c.id === chat.id); if (existing) { return [ { ...existing, ...chat }, ...prev.filter(c => c.id !== chat.id) ]; } return [chat, ...prev]; }); selectChat(chat); if (socket) { socket.emit('chat:join', { chatId: chat.id }); } } catch (err) { console.error(err); }

};

const createGroup = async (name, memberIds) => {
try {
const res = await axios.post(
${API}/chats/group,
{ name, memberIds },
{ headers: { Authorization: Bearer ${token} } }
);

const chat = res.data; setChats(prev => [ chat, ...prev.filter(c => c.id !== chat.id) ]); selectChat(chat); if (socket) { socket.emit('chat:join', { chatId: chat.id }); socket.emit('group:created', { chatId: chat.id, members: chat.members }); } } catch (err) { console.error(err); }

};

const sendMessage = (text, mediaUrl = null, mediaType = null) => {
if (!activeChat || !socket) return;

socket.emit('message:send', { chatId: activeChat.id, text, mediaUrl, mediaType });

};

return (
<div className="chat-layout">
<div
className={chat-sidebar ${mobileShowChat ? 'mobile-hidden' : ''}}
>
<Sidebar
user={user}
chats={chats}
users={users}
onlineMap={onlineMap}
activeChat={activeChat}
onSelectChat={selectChat}
onStartPrivate={startPrivateChat}
onCreateGroup={createGroup}
onLogout={logout}
/>
</div>

<div className={`chat-main ${mobileShowChat ? 'mobile-visible' : ''}`} > {mobileShowChat && ( <button type="button" className="mobile-back-button" onClick={() => setMobileShowChat(false)} aria-label="Back to chats" > ← <span>Chats</span> </button> )} <ChatWindow chat={activeChat} messages={messages} currentUser={user} typingUsers={typingUsers} onSend={sendMessage} socket={socket} token={token} API={API} /> </div> <style>{` .chat-layout { display: flex; width: 100%; height: 100vh; height: 100dvh; overflow: hidden; background: #0b1020; color: #f1f5f9; } .chat-sidebar { display: flex; flex: 0 0 340px; width: 340px; min-width: 0; height: 100%; overflow: hidden; } .chat-sidebar > * { width: 100%; min-width: 0; } .chat-main { display: flex; flex: 1; min-width: 0; min-height: 0; height: 100%; overflow: hidden; position: relative; } .chat-main > * { min-width: 0; } .mobile-back-button { display: none; } @media (max-width: 700px) { .chat-sidebar { flex: 0 0 100%; width: 100%; } .chat-main { display: none; flex: 0 0 100%; width: 100%; } .chat-sidebar.mobile-hidden { display: none; } .chat-main.mobile-visible { display: flex; flex-direction: column; } .mobile-back-button { display: flex; flex: 0 0 auto; align-items: center; gap: 9px; align-self: flex-start; margin: 8px 10px 0; padding: 9px 13px; border: 1px solid rgba(148,163,184,0.18); border-radius: 10px; background: #18223a; color: #c4b5fd; font-size: 14px; font-weight: 700; cursor: pointer; } .chat-main.mobile-visible > .chat-window { flex: 1; min-height: 0; } } @media (min-width: 701px) { .chat-sidebar { flex-basis: 320px; width: 320px; } .mobile-back-button { display: none; } } @media (max-width: 380px) { .mobile-back-button { margin: 6px 7px 0; } } `}</style> </div>

);
}

