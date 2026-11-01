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

  const handleTyping = (val) => {
    setText(val);
    if (!socket || !chat) return;
    socket.emit('typing:start', { chatId: chat.id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { chatId: chat.id });
    }, 1500);
  };

  const handleSend = () => {
    if (!text.trim() && !uploading) return;
    onSend(text.trim());
    setText('');
    if (socket && chat) socket.emit('typing:stop', { chatId: chat.id });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !chat) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(`${API}/upload`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      onSend('', res.data.url, isImage ? 'image' : isVideo ? 'video' : 'file');
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!chat) {
    return (
      <div style={styles.empty}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
        <h2>Welcome to ChatApp</h2>
        <p style={{ color: '#8696a0', marginTop: 8 }}>Select a chat or start a new conversation</p>
      </div>
    );
  }

  const typingText = Object.values(typingUsers).filter(Boolean).join(', ');

  return (
    <div style={styles.window}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.avatar}>
          {chat.type === 'group' ? '👥' : (chat.name?.[0]?.toUpperCase() || '?')}
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>{chat.name}</div>
          <div style={{ fontSize: 13, color: '#8696a0' }}>
            {chat.type === 'group' ? `${chat.members?.length || 0} members` : 'Direct message'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map(m => {
          const isMe = m.senderId === currentUser.id;
          return (
            <div key={m.id} style={{ ...styles.msgRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                ...styles.bubble,
                background: isMe ? '#005c4b' : '#202c33',
                borderBottomRightRadius: isMe ? 4 : 12,
                borderBottomLeftRadius: isMe ? 12 : 4,
              }}>
                {!isMe && chat.type === 'group' && (
                  <div style={{ fontSize: 12, color: '#00a884', marginBottom: 2, fontWeight: 500 }}>
                    {m.senderName}
                  </div>
                )}
                {m.mediaUrl && m.mediaType === 'image' && (
                  <img
                    src={m.mediaUrl}
                    alt="media"
                    style={{ maxWidth: 240, borderRadius: 8, marginBottom: 4, display: 'block' }}
                  />
                )}
                {m.mediaUrl && m.mediaType === 'video' && (
                  <video
                    src={m.mediaUrl}
                    controls
                    style={{ maxWidth: 260, borderRadius: 8, marginBottom: 4 }}
                  />
                )}
                {m.text && <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: 2 }}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing */}
      {typingText && (
        <div style={styles.typing}>{typingText} typing...</div>
      )}

      {/* Input */}
      <div style={styles.inputArea}>
        <button style={styles.attachBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? '⏳' : '📎'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,video/*"
          onChange={handleFile}
        />
        <input
          style={styles.input}
          placeholder="Type a message..."
          value={text}
          onChange={e => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button style={styles.sendBtn} onClick={handleSend}>
          ➤
        </button>
      </div>
    </div>
  );
}

const styles = {
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0b141a',
  },
  window: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#0b141a',
  },
  header: {
    padding: '12px 20px',
    background: '#202c33',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderBottom: '1px solid #222d34',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#00a884',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    color: '#111b21',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  msgRow: {
    display: 'flex',
  },
  bubble: {
    maxWidth: '65%',
    padding: '8px 12px',
    borderRadius: 12,
    fontSize: 15,
  },
  typing: {
    padding: '4px 40px',
    fontSize: 13,
    color: '#8696a0',
    fontStyle: 'italic',
  },
  inputArea: {
    padding: '12px 20px',
    background: '#202c33',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderTop: '1px solid #222d34',
  },
  attachBtn: {
    fontSize: 22,
    padding: 8,
    color: '#8696a0',
  },
  input: {
    flex: 1,
    background: '#2a3942',
    padding: '12px 16px',
    borderRadius: 8,
  },
  sendBtn: {
    background: '#00a884',
    color: '#111b21',
    width: 44,
    height: 44,
    borderRadius: '50%',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
