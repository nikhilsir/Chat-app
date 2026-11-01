import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function ChatWindow({
chat, messages, currentUser, typingUsers, onSend, socket, token, API
}) {
const [text, setText] = useState('');
const [uploading, setUploading] = useState(false);
const messagesEndRef = useRef(null);
const typingTimeout = useRef(null);
const fileInputRef = useRef(null);

useEffect(() => {
messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);

useEffect(() => {
return () => clearTimeout(typingTimeout.current);
}, []);

const handleTyping = val => {
setText(val);
if (!socket || !chat) return;

socket.emit('typing:start', { chatId: chat.id }); clearTimeout(typingTimeout.current); typingTimeout.current = setTimeout(() => { socket.emit('typing:stop', { chatId: chat.id }); }, 1500);

};

const handleSend = () => {
if (!text.trim() || uploading) return;

onSend(text.trim()); setText(''); if (socket && chat) { socket.emit('typing:stop', { chatId: chat.id }); }

};

const handleKeyDown = e => {
if (e.key === 'Enter' && !e.shiftKey) {
e.preventDefault();
handleSend();
}
};

const handleFile = async e => {
const file = e.target.files?.[0];
if (!file || !chat) return;

setUploading(true); try { const form = new FormData(); form.append('file', file); const res = await axios.post(`${API}/upload`, form, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }); const isImage = file.type.startsWith('image/'); const isVideo = file.type.startsWith('video/'); onSend( '', res.data.url, isImage ? 'image' : isVideo ? 'video' : 'file' ); } catch (err) { console.error(err); alert('Upload failed. Please try again.'); } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }

};

if (!chat) {
return (
<div style={styles.empty}>
<div style={styles.emptyIcon}>✉</div>
<h2 style={styles.emptyTitle}>
Welcome to <span style={{ color: '#a78bfa' }}>ChatApp</span>
</h2>
<p style={styles.emptyText}>
Select a conversation or find someone to start chatting.
</p>
<div style={styles.emptyBadge}>
<span style={{ color: '#2dd4bf' }}>●</span> Your space to connect
</div>
</div>
);
}

const typingText = Object.values(typingUsers || {})
.filter(Boolean)
.join(', ');

return (
<div style={styles.window}>
<header style={styles.header}>
<div style={styles.avatar}>
{chat.type === 'group'
? '♧'
: (chat.name?.[0]?.toUpperCase() || '?')}
</div>

<div style={{ flex: 1, minWidth: 0 }}> <div style={styles.chatName}>{chat.name || 'Conversation'}</div> <div style={styles.chatStatus}> <span style={styles.statusDot} /> {chat.type === 'group' ? `${chat.members?.length || 0} members` : 'Direct message'} </div> </div> <div style={styles.headerTag}>CHAT</div> </header> <div style={styles.messages}> {messages.map(m => { const isMe = m.senderId === currentUser.id; return ( <div key={m.id} style={{ ...styles.msgRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }} > <div style={{ ...styles.bubble, background: isMe ? 'linear-gradient(135deg, #6d4aff, #8b5cf6)' : '#18223a', border: isMe ? '1px solid rgba(196,181,253,0.22)' : '1px solid rgba(148,163,184,0.12)', borderBottomRightRadius: isMe ? 5 : 16, borderBottomLeftRadius: isMe ? 16 : 5 }} > {!isMe && chat.type === 'group' && ( <div style={styles.senderName}> {m.senderName || 'Member'} </div> )} {m.mediaUrl && m.mediaType === 'image' && ( <img src={m.mediaUrl} alt="Shared attachment" loading="lazy" style={styles.image} /> )} {m.mediaUrl && m.mediaType === 'video' && ( <video src={m.mediaUrl} controls style={styles.video} /> )} {m.mediaUrl && m.mediaType === 'file' && ( <a href={m.mediaUrl} target="_blank" rel="noreferrer" style={styles.fileLink} > ↗ Open attachment </a> )} {m.text && ( <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}> {m.text} </div> )} <div style={styles.time}> {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} </div> </div> </div> ); })} <div ref={messagesEndRef} /> </div> {typingText && ( <div style={styles.typing}> <span style={{ color: '#2dd4bf' }}>●</span> <span>{typingText} typing...</span> </div> )} <div style={styles.inputArea}> <button type="button" style={{ ...styles.attachBtn, opacity: uploading ? 0.5 : 1 }} onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Attach a file" title="Attach image or video" > {uploading ? '…' : '＋'} </button> <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,video/*" onChange={handleFile} /> <input style={styles.input} placeholder="Write a message..." value={text} onChange={e => handleTyping(e.target.value)} onKeyDown={handleKeyDown} aria-label="Message" /> <button type="button" style={{ ...styles.sendBtn, opacity: text.trim() && !uploading ? 1 : 0.65 }} onClick={handleSend} disabled={!text.trim() || uploading} aria-label="Send message" title="Send message" > ➤ </button> </div> </div>

);
}

const styles = {
empty: {
flex: 1,
minWidth: 0,
display: 'flex',
flexDirection: 'column',
alignItems: 'center',
justifyContent: 'center',
textAlign: 'center',
padding: 24,
background: '#0b1020',
color: '#f1f5f9'
},
emptyIcon: {
width: 82,
height: 82,
borderRadius: 26,
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
fontSize: 38,
color: '#c4b5fd',
background: 'linear-gradient(135deg, #211b42, #18223a)',
border: '1px solid rgba(139,92,246,0.28)',
boxShadow: '0 12px 40px rgba(0,0,0,0.18)'
},
emptyTitle: {
fontSize: 26,
margin: '24px 0 8px',
letterSpacing: '-0.7px'
},
emptyText: {
color: '#94a3b8',
fontSize: 14,
lineHeight: 1.7,
maxWidth: 330
},
emptyBadge: {
display: 'flex',
alignItems: 'center',
gap: 8,
marginTop: 18,
padding: '10px 14px',
borderRadius: 30,
border: '1px solid rgba(148,163,184,0.15)',
background: '#11182b',
color: '#cbd5e1',
fontSize: 12
},
window: {
flex: 1,
minWidth: 0,
minHeight: 0,
display: 'flex',
flexDirection: 'column',
background: '#0b1020',
color: '#f1f5f9',
overflow: 'hidden'
},
header: {
minHeight: 76,
boxSizing: 'border-box',
padding: '14px 22px',
background: '#11182b',
display: 'flex',
alignItems: 'center',
gap: 13,
borderBottom: '1px solid rgba(148,163,184,0.14)',
boxShadow: '0 4px 18px rgba(0,0,0,0.08)'
},
avatar: {
width: 45,
height: 45,
minWidth: 45,
borderRadius: 15,
background: 'linear-gradient(135deg, #8b5cf6, #5b4bdb)',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
fontWeight: 800,
fontSize: 18,
color: '#fff',
boxShadow: '0 5px 16px rgba(139,92,246,0.2)'
},
chatName: {
fontWeight: 800,
fontSize: 15,
overflow: 'hidden',
textOverflow: 'ellipsis',
whiteSpace: 'nowrap'
},
chatStatus:

