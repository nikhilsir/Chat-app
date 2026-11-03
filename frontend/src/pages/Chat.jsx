
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import SettingsModal from '../components/SettingsModal';

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
  const [settingsOpen, setSettingsOpen] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  // Load chats and users
  useEffect(() => {
    if (!token) return;

    axios.get(`${API}/chats`, { headers })
      .then(response => setChats(response.data))
      .catch(error => console.error(error));

    axios.get(`${API}/users`, { headers })
      .then(response => {
        setUsers(response.data);
        const map = {};
        response.data.forEach(currentUser => {
          map[currentUser.id] = currentUser.online;
        });
        setOnlineMap(map);
      })
      .catch(error => console.error(error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, API]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = message => {
      if (activeChat?.id === message.chatId) {
        setMessages(previousMessages => {
          if (previousMessages.some(item => item.id === message.id)) {
            return previousMessages;
          }
          return [...previousMessages, message];
        });
      }

      setChats(previousChats => {
        const updatedChats = previousChats.map(chat =>
          chat.id === message.chatId
            ? { ...chat, lastMessage: message, updatedAt: message.createdAt }
            : chat
        );
        return updatedChats.sort(
          (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
        );
      });
    };

    const onMessageDeleted = ({ messageId, chatId }) => {
      if (activeChat?.id === chatId) {
        setMessages(previous =>
          previous.map(m =>
            m.id === messageId
              ? { ...m, deleted: true, text: '', mediaUrl: null }
              : m
          )
        );
      }
      setChats(previousChats =>
        previousChats.map(c =>
          c.id === chatId && c.lastMessage?.id === messageId
            ? { ...c, lastMessage: { ...c.lastMessage, deleted: true, text: '' } }
            : c
        )
      );
    };

    const onUserUpdated = updated => {
      setUsers(previousUsers =>
        previousUsers.map(u => (u.id === updated.id ? { ...u, displayName: updated.displayName } : u))
      );
      setChats(previousChats =>
        previousChats.map(c =>
          c.type === 'private' && c.members?.includes(updated.id) && c.id !== activeChat?.id
            ? { ...c, name: updated.displayName }
            : c
        )
      );
    };

    const onOnline = ({ userId, online }) => {
      setOnlineMap(previous => ({ ...previous, [userId]: online }));
      setUsers(previousUsers =>
        previousUsers.map(currentUser =>
          currentUser.id === userId ? { ...currentUser, online } : currentUser
        )
      );
    };

    const onTypingStart = ({ chatId, userId, username }) => {
      if (chatId === activeChat?.id) {
        setTypingUsers(previous => ({ ...previous, [userId]: username }));
      }
    };

    const onTypingStop = ({ chatId, userId }) => {
      if (chatId === activeChat?.id) {
        setTypingUsers(previous => {
          const updated = { ...previous };
          delete updated[userId];
          return updated;
        });
      }
    };

    const onChatNew = () => {
      axios.get(`${API}/chats`, { headers })
        .then(response => setChats(response.data))
        .catch(error => console.error(error));
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('user:updated', onUserUpdated);
    socket.on('user:online', onOnline);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('chat:new', onChatNew);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('user:updated', onUserUpdated);
      socket.off('user:online', onOnline);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('chat:new', onChatNew);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, activeChat, token, API]);

  // Load messages
  useEffect(() => {
    if (!activeChat || !token) {
      setMessages([]);
      setTypingUsers({});
      return;
    }

    let cancelled = false;
    setMessages([]);
    setTypingUsers({});

    axios.get(`${API}/chats/${activeChat.id}/messages`, { headers })
      .then(response => {
        if (!cancelled) setMessages(response.data);
      })
      .catch(error => {
        if (!cancelled) console.error(error);
      });

    if (socket) {
      socket.emit('chat:join', { chatId: activeChat.id });
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat, token, API, socket]);

  const selectChat = chat => {
    setActiveChat(chat);
    setMobileShowChat(true);
  };

  const startPrivateChat = async userId => {
    try {
      const response = await axios.post(`${API}/chats/private`, { userId }, { headers });
      const chat = response.data;
      setChats(previousChats => {
        const existing = previousChats.find(item => item.id === chat.id);
        if (existing) {
          return [{ ...existing, ...chat }, ...previousChats.filter(item => item.id !== chat.id)];
        }
        return [chat, ...previousChats];
      });
      selectChat(chat);
      if (socket) socket.emit('chat:join', { chatId: chat.id });
    } catch (error) {
      console.error(error);
    }
  };

  const createGroup = async (name, memberIds) => {
    try {
      const response = await axios.post(`${API}/chats/group`, { name, memberIds }, { headers });
      const chat = response.data;
      setChats(previousChats => [chat, ...previousChats.filter(item => item.id !== chat.id)]);
      selectChat(chat);
      if (socket) {
        socket.emit('chat:join', { chatId: chat.id });
        socket.emit('group:created', { chatId: chat.id, members: chat.members });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const sendMessage = (text, mediaUrl = null, mediaType = null) => {
    if (!activeChat || !socket) return;
    socket.emit('message:send', {
      chatId: activeChat.id,
      text,
      mediaUrl,
      mediaType,
    });
  };

  const handleDeletedMessage = (messageId, chatId) => {
    setMessages(previous =>
      previous.map(m =>
        m.id === messageId ? { ...m, deleted: true, text: '', mediaUrl: null } : m
      )
    );
    setChats(previousChats =>
      previousChats.map(c =>
        c.id === chatId && c.lastMessage?.id === messageId
          ? { ...c, lastMessage: { ...c.lastMessage, deleted: true, text: '' } }
          : c
      )
    );
  };

  return (
    <div className="chat-layout">
      <div className={`chat-sidebar-col ${mobileShowChat ? 'mobile-hidden' : ''}`}>
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
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      <div className={`chat-main-col ${mobileShowChat ? 'mobile-visible' : ''}`}>
        <ChatWindow
          chat={activeChat}
          messages={messages}
          currentUser={user}
          typingUsers={typingUsers}
          onSend={sendMessage}
          onDeleteMessage={handleDeletedMessage}
          socket={socket}
          token={token}
          API={API}
          onBack={() => setMobileShowChat(false)}
        />
      </div>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onLogout={logout}
        />
      )}
    </div>
  );
}
