
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

  // Load chats and users
  useEffect(() => {
    if (!token) return;

    const headers = {
      Authorization: `Bearer ${token}`,
    };

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

  }, [token, API]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const onNewMessage = message => {
      if (activeChat?.id === message.chatId) {
        setMessages(previousMessages => {
          if (
            previousMessages.some(
              item => item.id === message.id
            )
          ) {
            return previousMessages;
          }

          return [...previousMessages, message];
        });
      }

      setChats(previousChats => {
        const updatedChats = previousChats.map(chat =>
          chat.id === message.chatId
            ? {
                ...chat,
                lastMessage: message,
                updatedAt: message.createdAt,
              }
            : chat
        );

        return updatedChats.sort(
          (a, b) =>
            new Date(b.updatedAt || 0) -
            new Date(a.updatedAt || 0)
        );
      });
    };

    const onOnline = ({ userId, online }) => {
      setOnlineMap(previous => ({
        ...previous,
        [userId]: online,
      }));

      setUsers(previousUsers =>
        previousUsers.map(currentUser =>
          currentUser.id === userId
            ? { ...currentUser, online }
            : currentUser
        )
      );
    };

    const onTypingStart = ({ chatId, userId, username }) => {
      if (chatId === activeChat?.id) {
        setTypingUsers(previous => ({
          ...previous,
          [userId]: username,
        }));
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

    axios.get(
      `${API}/chats/${activeChat.id}/messages`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then(response => {
        if (!cancelled) {
          setMessages(response.data);
        }
      })
      .catch(error => {
        if (!cancelled) {
          console.error(error);
        }
      });

    if (socket) {
      socket.emit('chat:join', {
        chatId: activeChat.id,
      });
    }

    return () => {
      cancelled = true;
    };

  }, [activeChat, token, API, socket]);

  // Select chat
  const selectChat = chat => {
    setActiveChat(chat);
    setMobileShowChat(true);
  };

  // Start private chat
  const startPrivateChat = async userId => {
    try {
      const response = await axios.post(
        `${API}/chats/private`,
        { userId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const chat = response.data;

      setChats(previousChats => {
        const existing = previousChats.find(
          item => item.id === chat.id
        );

        if (existing) {
          return [
            { ...existing, ...chat },
            ...previousChats.filter(
              item => item.id !== chat.id
            ),
          ];
        }

        return [chat, ...previousChats];
      });

      selectChat(chat);

      if (socket) {
        socket.emit('chat:join', {
          chatId: chat.id,
        });
      }

    } catch (error) {
      console.error(error);
    }
  };

  // Create group
  const createGroup = async (name, memberIds) => {
    try {
      const response = await axios.post(
        `${API}/chats/group`,
        { name, memberIds },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const chat = response.data;

      setChats(previousChats => [
        chat,
        ...previousChats.filter(
          item => item.id !== chat.id
        ),
      ]);

      selectChat(chat);

      if (socket) {
        socket.emit('chat:join', {
          chatId: chat.id,
        });

        socket.emit('group:created', {
          chatId: chat.id,
          members: chat.members,
        });
      }

    } catch (error) {
      console.error(error);
    }
  };

  // Send message
  const sendMessage = (
    text,
    mediaUrl = null,
    mediaType = null
  ) => {
    if (!activeChat || !socket) return;

    socket.emit('message:send', {
      chatId: activeChat.id,
      text,
      mediaUrl,
      mediaType,
    });
  };

  return (
    <div className="chat-layout">

      <div
        className={`chat-sidebar ${
          mobileShowChat ? 'mobile-hidden' : ''
        }`}
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

      <div
        className={`chat-main ${
          mobileShowChat ? 'mobile-visible' : ''
        }`}
      >

        {mobileShowChat && (
          <button
            type="button"
            className="mobile-back-button"
            onClick={() => setMobileShowChat(false)}
            aria-label="Back to chats"
          >
            ← <span>Chats</span>
          </button>
        )}

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

      <style>{`
        .chat-layout {
          display: flex;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          background: #0b1020;
          color: #f1f5f9;
        }

        .chat-sidebar {
          display: flex;
          flex: 0 0 320px;
          width: 320px;
          min-width: 0;
          height: 100%;
          overflow: hidden;
        }

        .chat-sidebar > * {
          width: 100%;
          min-width: 0;
        }

        .chat-main {
          display: flex;
          flex: 1;
          min-width: 0;
          min-height: 0;
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        .chat-main > * {
          min-width: 0;
        }

        .mobile-back-button {
          display: none;
        }

        @media (max-width: 700px) {
          .chat-sidebar {
            flex: 0 0 100%;
            width: 100%;
          }

          .chat-main {
            display: none;
            flex: 0 0 100%;
            width: 100%;
          }

          .chat-sidebar.mobile-hidden {
            display: none;
          }

          .chat-main.mobile-visible {
            display: flex;
            flex-direction: column;
          }

          .mobile-back-button {
            display: flex;
            flex: 0 0 auto;
            align-items: center;
            gap: 9px;
            align-self: flex-start;
            margin: 8px 10px 0;
            padding: 9px 13px;
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 10px;
            background: #18223a;
            color: #c4b5fd;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
          }
        }

        @media (min-width: 701px) {
          .mobile-back-button {
            display: none;
          }
        }

        @media (max-width: 380px) {
          .mobile-back-button {
            margin: 6px 7px 0;
          }
        }
      `}</style>

    </div>
  );
}
