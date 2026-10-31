import { useState, useEffect, useRef } from 'react';
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

  // Load chats & users
  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    axios.get(`${API}/chats`, { headers }).then(r => setChats(r.data)).catch(console.error);
    axios.get(`${API}/users`, { headers }).then(r => {
      setUsers(r.data);
      const map = {};
      r.data.forEach(u => { map[u.id] = u.online; });
      setOnlineMap(map);
    }).catch(console.error);
  }, [token, API]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg) => {
      setMessages(prev => {
        if (activeChat?.id === msg.chatId) {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        }
        return prev;
      });
      // Update chat list last message
      setChats(prev => {
        const updated = prev.map(c => {
          if (c.id === msg.chatId) {
            return { ...c, lastMessage: msg, updatedAt: msg.createdAt };
          }
          return c;
        });
        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    const onOnline = ({ userId, online }) => {
      setOnlineMap(prev => ({ ...prev, [userId]: online }));
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, online } : u));
    };

    const onTypingStart = ({ chatId, userId, username }) => {
      if (chatId === activeChat?.id) {
        setTypingUsers(prev => ({ ...prev, [userId]: username }));
      }
    };
    const onTypingStop = ({ chatId, userId }) => {
      if (chatId === activeChat?.id) {
        setTypingUsers(prev => {
          const n = { ...prev };
          delete n[userId];
          return n;
        });
      }
    };

    const onChatNew = () => {
      // Refresh chats
      axios.get(`${API}/chats`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setChats(r.data));
    };

    socket.on('message:new', onNewMessage);
    socket.on('user:online', onOnline);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('chat:new', onChatNew);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('user:online', onOnline);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('chat:new', onChatNew);
    };
  }, [socket, activeChat, token, API]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChat || !token) {
      setMessages([]);
      return;
    }
    axios.get(`${API}/chats/${activeChat.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => setMessages(r.data)).catch(console.error);

    // Join room
    if (socket) socket.emit('chat:join', { chatId: activeChat.id });
  }, [activeChat, token, API, socket]);

  const startPrivateChat = async (userId) => {
    try {
      const res = await axios.post(`${API}/chats/private`, { userId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const chat = res.data;
      setChats(prev => {
        if (prev.find(c => c.id === chat.id)) return prev;
        return [chat, ...prev];
      });
      setActiveChat(chat);
      if (socket) socket.emit('chat:join', { chatId: chat.id });
    } catch (err) {
      console.error(err);
    }
  };

  const createGroup = async (name, memberIds) => {
    try {
      const res = await axios.post(`${API}/chats/group`, { name, memberIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const chat = res.data;
      setChats(prev => [chat, ...prev]);
      setActiveChat(chat);
      if (socket) {
        socket.emit('chat:join', { chatId: chat.id });
        socket.emit('group:created', { chatId: chat.id, members: chat.members });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = (text, mediaUrl = null, mediaType = null) => {
    if (!activeChat || !socket) return;
    socket.emit('message:send', {
      chatId: activeChat.id,
      text,
      mediaUrl,
      mediaType
    });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0b141a' }}>
      <Sidebar
        user={user}
        chats={chats}
        users={users}
        onlineMap={onlineMap}
        activeChat={activeChat}
        onSelectChat={setActiveChat}
        onStartPrivate={startPrivateChat}
        onCreateGroup={createGroup}
        onLogout={logout}
      />
      <ChatWindow
        chat={activeChat}
        messages={messages}
        currentUser={user}
        typingUsers={typingUsers}
        onSend={sendMessage}
        socket={socket}
        token={token}
        API={API}
      />
    </div>
  );
}
