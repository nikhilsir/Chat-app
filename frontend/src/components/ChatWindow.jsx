import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  ArrowLeft, Send, Paperclip, Loader2, MessageCircle, Trash2,
  MessageSquareOff, FileAudio, Sparkles,
} from 'lucide-react';

export default function ChatWindow({
  chat, messages, currentUser, typingUsers, onSend, onDeleteMessage,
  socket, token, API, onBack,
}) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // messageId

  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  useEffect(() => {
    return () => clearTimeout(typingTimeout.current);
  }, []);

  useEffect(() => { setConfirmDelete(null); }, [chat?.id]);

  const handleTyping = val => {
    setText(val);
    if (!socket || !chat) return;
    socket.emit('typing:start', { chatId: chat.id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { chatId: chat.id });
    }, 1500);
  };

  const handleSend = () => {
    if (!text.trim() || uploading) return;
    onSend(text.trim());
    setText('');
    if (socket && chat) socket.emit('typing:stop', { chatId: chat.id });
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
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(`${API}/upload`, form, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      const type = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('audio/') ? 'audio' : 'file';
      onSend('', res.data.url, type);
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const askDelete = (messageId) => setConfirmDelete(messageId);

  const doDelete = async (messageId) => {
    setConfirmDelete(null);
    try {
      await axios.delete(
        `${API}/chats/${chat.id}/messages/${messageId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (onDeleteMessage) onDeleteMessage(messageId, chat.id);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  if (!chat) {
    return (
      <div className="cw-empty">
        <div className="auth-blob b1" />
        <div className="auth-blob b2" />
        <div className="cw-empty-icon anim-pop"><MessageCircle size={42} strokeWidth={1.8} /></div>
        <h2 className="anim-fade-up">Welcome to <span>ChatApp</span></h2>
        <p className="anim-fade-up">Select a conversation, or open the People tab to start a new one.</p>
        <div className="cw-badge anim-fade-up">
          <Sparkles size={14} /> Real-time · Fast · Beautiful
        </div>
      </div>
    );
  }

  const typingText = Object.values(typingUsers || {}).filter(Boolean).join(', ');

  return (
    <div className="cw">
      {/* Header */}
      <header className="cw-header">
        <button className="mobile-back-btn" onClick={onBack} aria-label="Back to chats">
          <ArrowLeft size={21} />
        </button>
        <div className={`avatar ${chat.type === 'group' ? 'group' : ''}`}>
          {chat.type === 'group' ? '#' : (chat.name?.[0]?.toUpperCase() || '?')}
        </div>
        <div className="cw-head-body">
          <div className="cw-chat-name">{chat.name || 'Conversation'}</div>
          <div className="cw-chat-status">
            {typingText ? (
              <span className="cw-typing-status">{typingText} is typing…</span>
            ) : (
              <>
                <span className="status-dot" />
                {chat.type === 'group' ? `${chat.members?.length || 0} members` : 'Direct message'}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="cw-messages">
        {messages.map(m => {
          const isMe = m.senderId === currentUser?.id;

          if (m.deleted) {
            return (
              <div key={m.id} className={`msg-row ${isMe ? 'me' : 'them'}`}>
                <div className="msg-bubble" style={{ opacity: 0.75 }}>
                  <div className="msg-deleted">
                    <MessageSquareOff size={14} />
                    This message was deleted
                  </div>
                  <div className="msg-time">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={m.id} className={`msg-row ${isMe ? 'me' : 'them'}`}>
              {isMe && confirmDelete === m.id && (
                <button
                  className="msg-del-btn"
                  style={{ opacity: 1, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={() => doDelete(m.id)}
                  title="Delete for everyone"
                  aria-label="Confirm delete for everyone"
                >
                  <Trash2 size={15} />
                </button>
              )}

              <div className="msg-bubble">
                {!isMe && chat.type === 'group' && (
                  <div className="msg-sender">{m.senderName || 'Member'}</div>
                )}

                {m.mediaUrl && m.mediaType === 'image' && (
                  <img src={m.mediaUrl} alt="Shared attachment" loading="lazy" className="msg-image" />
                )}
                {m.mediaUrl && m.mediaType === 'video' && (
                  <video src={m.mediaUrl} controls className="msg-video" />
                )}
                {m.mediaUrl && m.mediaType === 'audio' && (
                  <audio src={m.mediaUrl} controls className="msg-audio" />
                )}
                {m.mediaUrl && (m.mediaType === 'file' || !['image', 'video', 'audio'].includes(m.mediaType)) && (
                  <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="msg-file">
                    <FileAudio size={17} /> Open attachment
                  </a>
                )}

                {m.text && <div className="msg-text">{m.text}</div>}

                <div className="msg-time">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {isMe && confirmDelete !== m.id && (
                <button
                  className="msg-del-btn"
                  onClick={() => askDelete(m.id)}
                  title="Delete for everyone"
                  aria-label="Delete for everyone"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing */}
      {typingText && (
        <div className="typing-row">
          <span className="typing-dots"><i /><i /><i /></span>
          {typingText} is typing…
        </div>
      )}

      {/* Composer */}
      <div className="cw-composer">
        <button
          type="button"
          className="icon-btn attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Attach a file"
          title="Attach photo, video or audio"
        >
          {uploading ? <Loader2 size={19} className="spin" /> : <Paperclip size={19} />}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,video/*,audio/*"
          onChange={handleFile}
        />

        <div className="field">
          <input
            placeholder="Write a message…"
            value={text}
            onChange={e => handleTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Message"
            maxLength={4000}
          />
        </div>

        <button
          type="button"
          className="send-btn"
          onClick={handleSend}
          disabled={!text.trim() || uploading}
          aria-label="Send message"
          title="Send"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Delete confirmation strip */}
      {confirmDelete && (
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 78,
            display: 'flex', justifyContent: 'center', zIndex: 20,
            padding: '0 14px',
          }}
        >
          <div
            className="auth-error anim-pop"
            style={{ background: 'var(--panel)', alignItems: 'center', gap: 12 }}
          >
            <MessageSquareOff size={16} />
            Delete this message for everyone?
            <button
              className="save-btn"
              style={{ height: 32, padding: '0 12px', fontSize: 12.5 }}
              onClick={() => doDelete(confirmDelete)}
            >
              Yes, delete
            </button>
            <button
              className="save-btn"
              style={{ height: 32, padding: '0 12px', fontSize: 12.5, background: 'var(--panel-2)' }}
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
