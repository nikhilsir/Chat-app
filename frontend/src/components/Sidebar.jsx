import { useState } from 'react';

export default function Sidebar({
  user, chats, users, onlineMap, activeChat,
  onSelectChat, onStartPrivate, onCreateGroup, onLogout
}) {
  const [tab, setTab] = useState('chats'); // chats | users | group
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const filteredChats = chats.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = users.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (id) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    onCreateGroup(groupName.trim(), selectedMembers);
    setGroupName('');
    setSelectedMembers([]);
    setTab('chats');
  };

  return (
    <div style={styles.sidebar}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={styles.avatar}>{user?.displayName?.[0]?.toUpperCase() || '?'}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{user?.displayName}</div>
            <div style={{ fontSize: 12, color: '#8696a0' }}>@{user?.username}</div>
          </div>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn} title="Logout">⏻</button>
      </div>

      {/* Search */}
      <div style={styles.searchBox}>
        <input
          style={styles.searchInput}
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={tab === 'chats' ? styles.tabActive : styles.tab} onClick={() => setTab('chats')}>
          Chats
        </button>
        <button style={tab === 'users' ? styles.tabActive : styles.tab} onClick={() => setTab('users')}>
          Users
        </button>
        <button style={tab === 'group' ? styles.tabActive : styles.tab} onClick={() => setTab('group')}>
          New Group
        </button>
      </div>

      {/* Content */}
      <div style={styles.list}>
        {tab === 'chats' && (
          filteredChats.length === 0 ? (
            <div style={styles.empty}>No chats yet. Start a conversation!</div>
          ) : (
            filteredChats.map(c => (
              <div
                key={c.id}
                style={{
                  ...styles.chatItem,
                  background: activeChat?.id === c.id ? '#2a3942' : 'transparent'
                }}
                onClick={() => onSelectChat(c)}
              >
                <div style={styles.avatar}>
                  {c.type === 'group' ? '👥' : (c.name?.[0]?.toUpperCase() || '?')}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    {c.lastMessage && (
                      <span style={{ fontSize: 11, color: '#8696a0' }}>
                        {new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#8696a0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.lastMessage?.text || (c.lastMessage?.mediaUrl ? '📎 Media' : 'No messages')}
                  </div>
                </div>
              </div>
            ))
          )
        )}

        {tab === 'users' && (
          filteredUsers.map(u => (
            <div
              key={u.id}
              style={styles.chatItem}
              onClick={() => onStartPrivate(u.id)}
            >
              <div style={{ position: 'relative' }}>
                <div style={styles.avatar}>{u.displayName?.[0]?.toUpperCase()}</div>
                {onlineMap[u.id] && <div style={styles.onlineDot} />}
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>{u.displayName}</div>
                <div style={{ fontSize: 12, color: '#8696a0' }}>
                  {onlineMap[u.id] ? 'Online' : 'Offline'} · @{u.username}
                </div>
              </div>
            </div>
          ))
        )}

        {tab === 'group' && (
          <div style={{ padding: 16 }}>
            <input
              style={{ ...styles.searchInput, marginBottom: 12 }}
              placeholder="Group name"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
            <div style={{ fontSize: 13, color: '#8696a0', marginBottom: 8 }}>Select members:</div>
            {users.map(u => (
              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(u.id)}
                  onChange={() => toggleMember(u.id)}
                />
                <span>{u.displayName}</span>
              </label>
            ))}
            <button
              style={{
                ...styles.createBtn,
                opacity: groupName && selectedMembers.length ? 1 : 0.5
              }}
              onClick={handleCreateGroup}
              disabled={!groupName || selectedMembers.length === 0}
            >
              Create Group
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: 340,
    background: '#111b21',
    borderRight: '1px solid #222d34',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#202c33',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: '#00a884',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    color: '#111b21',
    fontSize: 18,
  },
  logoutBtn: {
    fontSize: 20,
    color: '#8696a0',
    padding: 8,
  },
  searchBox: { padding: '10px 16px' },
  searchInput: {
    width: '100%',
    background: '#202c33',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #2a3942',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #222d34',
  },
  tab: {
    flex: 1,
    padding: '12px',
    color: '#8696a0',
    fontSize: 14,
  },
  tabActive: {
    flex: 1,
    padding: '12px',
    color: '#00a884',
    fontSize: 14,
    borderBottom: '2px solid #00a884',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
  },
  chatItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    cursor: 'pointer',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#00a884',
    border: '2px solid #111b21',
  },
  empty: {
    padding: 40,
    textAlign: 'center',
    color: '#8696a0',
    fontSize: 14,
  },
  createBtn: {
    width: '100%',
    background: '#00a884',
    color: '#111b21',
    padding: '12px',
    borderRadius: 8,
    fontWeight: 600,
    marginTop: 16,
  },
};
