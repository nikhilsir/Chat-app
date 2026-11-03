import { useState } from 'react';
import {
  Search, MessageCircle, Users, UsersRound, LogOut, Settings, Check,
} from 'lucide-react';

export default function Sidebar({
  user, chats, users, onlineMap, activeChat,
  onSelectChat, onStartPrivate, onCreateGroup, onLogout, onOpenSettings,
}) {
  const [tab, setTab] = useState('chats');
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const q = search.toLowerCase();
  const filteredChats = chats.filter(c => c.name?.toLowerCase().includes(q));
  const filteredUsers = users.filter(u =>
    u.displayName?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
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

  const previewOf = (c) => {
    if (!c.lastMessage) return 'No messages yet';
    if (c.lastMessage.deleted) return '🚫 Deleted message';
    if (c.lastMessage.mediaUrl) return `📎 ${c.lastMessage.mediaType === 'image' ? 'Photo' : c.lastMessage.mediaType === 'video' ? 'Video' : 'Audio'}`
    return c.lastMessage.text || 'No messages yet';
  };

  return (
    <div className="sb">
      {/* Header */}
      <div className="sb-head">
        <div className="sb-identity">
          <div className="avatar">{user?.displayName?.[0]?.toUpperCase() || '?'}</div>
          <div style={{ minWidth: 0 }}>
            <div className="sb-name">{user?.displayName}</div>
            <div className="sb-username">@{user?.username}</div>
          </div>
        </div>
        <button className="icon-btn" onClick={onOpenSettings} title="Settings" aria-label="Settings">
          <Settings size={19} />
        </button>
        <button className="icon-btn danger" onClick={onLogout} title="Logout" aria-label="Logout">
          <LogOut size={19} />
        </button>
      </div>

      {/* Search */}
      <div className="sb-search">
        <div className="field">
          <Search size={16} />
          <input placeholder="Search chats & people…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="sb-tabs">
        <button className={`sb-tab ${tab === 'chats' ? 'active' : ''}`} onClick={() => setTab('chats')}>
          <MessageCircle size={15} /> Chats
        </button>
        <button className={`sb-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          <Users size={15} /> People
        </button>
        <button className={`sb-tab ${tab === 'group' ? 'active' : ''}`} onClick={() => setTab('group')}>
          <UsersRound size={15} /> Group
        </button>
      </div>

      {/* Content */}
      <div className="sb-list">
        {tab === 'chats' && (
          filteredChats.length === 0 ? (
            <div className="sb-empty">
              <MessageCircle size={34} strokeWidth={1.5} />
              <div>No chats yet.<br />Open the People tab to start one!</div>
            </div>
          ) : (
            filteredChats.map((c, i) => (
              <div
                key={c.id}
                className={`sb-item ${activeChat?.id === c.id ? 'active' : ''}`}
                style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
                onClick={() => onSelectChat(c)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onSelectChat(c)}
              >
                <div className={`avatar ${c.type === 'group' ? 'group' : ''}`}>
                  {c.type === 'group' ? <UsersRound size={18} /> : (c.name?.[0]?.toUpperCase() || '?')}
                </div>
                <div className="sb-item-body">
                  <div className="sb-item-top">
                    <span className="sb-item-name">{c.name}</span>
                    {c.lastMessage && (
                      <span className="sb-item-time">
                        {new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className="sb-item-preview">{previewOf(c)}</div>
                </div>
              </div>
            ))
          )
        )}

        {tab === 'users' && (
          filteredUsers.length === 0 ? (
            <div className="sb-empty">
              <Users size={34} strokeWidth={1.5} />
              <div>No people found.</div>
            </div>
          ) : (
            filteredUsers.map((u, i) => (
              <div
                key={u.id}
                className="sb-item"
                style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
                onClick={() => onStartPrivate(u.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onStartPrivate(u.id)}
              >
                <div style={{ position: 'relative' }}>
                  <div className="avatar sm">{u.displayName?.[0]?.toUpperCase()}</div>
                  {onlineMap[u.id] && <span className="online-dot" />}
                </div>
                <div className="sb-item-body">
                  <div className="sb-item-name">{u.displayName}</div>
                  <div className="sb-item-preview sb-online-label">
                    <span className="status-dot" style={{ background: onlineMap[u.id] ? 'var(--ok)' : 'var(--muted)', width: 6, height: 6 }} />
                    {onlineMap[u.id] ? 'Online now' : 'Offline'} · @{u.username}
                  </div>
                </div>
              </div>
            ))
          )
        )}

        {tab === 'group' && (
          <div className="group-form">
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Group name</div>
              <input className="form-input" placeholder="e.g. Friends Forever" value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Select members</div>
              {users.map(u => (
                <label
                  key={u.id}
                  className={`member-row ${selectedMembers.includes(u.id) ? 'selected' : ''}`}
                >
                  <span className="check-box"><Check size={13} strokeWidth={3.2} /></span>
                  <div className="avatar sm">{u.displayName?.[0]?.toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.displayName}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>@{u.username}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(u.id)}
                    onChange={() => toggleMember(u.id)}
                    style={{ display: 'none' }}
                  />
                </label>
              ))}
            </div>
            <button
              className="primary-btn"
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedMembers.length === 0}
            >
              <UsersRound size={17} /> Create Group
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
