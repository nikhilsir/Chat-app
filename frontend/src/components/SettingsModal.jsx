import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import {
  X, User, KeyRound, Palette, Check, LogOut, Loader2, BadgeCheck, AlertCircle,
} from 'lucide-react';

export default function SettingsModal({ onClose, onLogout }) {
  const { user, token, API, setUser } = useAuth();
  const { theme, setTheme, themes } = useTheme();

  // profile
  const [name, setName] = useState(user?.displayName || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameDone, setNameDone] = useState(false);
  const [nameError, setNameError] = useState('');

  // password
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [passSaving, setPassSaving] = useState(false);
  const [passDone, setPassDone] = useState(false);
  const [passError, setPassError] = useState('');

  const saveName = async () => {
    if (!name.trim() || nameSaving) return;
    setNameSaving(true); setNameError(''); setNameDone(false);
    try {
      const res = await axios.patch(
        `${API}/users/me`,
        { displayName: name.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(res.data);
      setNameDone(true);
      setTimeout(() => setNameDone(false), 2500);
    } catch (err) {
      setNameError(err.response?.data?.error || 'Could not save');
    } finally {
      setNameSaving(false);
    }
  };

  const savePassword = async () => {
    if (passSaving) return;
    setPassSaving(true); setPassError(''); setPassDone(false);
    try {
      await axios.post(
        `${API}/auth/change-password`,
        { currentPassword: current, newPassword: next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPassDone(true);
      setCurrent(''); setNext('');
      setTimeout(() => setPassDone(false), 3000);
    } catch (err) {
      setPassError(err.response?.data?.error || 'Could not change password');
    } finally {
      setPassSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Settings</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            <X size={19} />
          </button>
        </div>

        <div className="modal-body">
          {/* ---------- PROFILE ---------- */}
          <section>
            <div className="settings-section-title"><User size={14} /> Profile</div>
            <div className="profile-hero">
              <div className="avatar lg">{user?.displayName?.[0]?.toUpperCase()}</div>
              <div className="who">
                <div className="n">{user?.displayName}</div>
                <div className="u">@{user?.username}</div>
              </div>
            </div>
            <div className="form-col">
              <div className="form-label">Display name</div>
              <input
                className="form-input"
                value={name}
                onChange={e => { setName(e.target.value); setNameDone(false); setNameError(''); }}
                maxLength={100}
                placeholder="Your name"
              />
              {nameError && (
                <div className="auth-error" style={{ fontSize: 12.5 }}>
                  <AlertCircle size={14} /> {nameError}
                </div>
              )}
              <div className="save-row">
                <button className="save-btn" onClick={saveName} disabled={nameSaving || !name.trim()}>
                  {nameSaving ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                  Save
                </button>
                {nameDone && <span className="save-ok"><BadgeCheck size={15} /> Saved!</span>}
              </div>
            </div>
          </section>

          {/* ---------- PASSWORD ---------- */}
          <section>
            <div className="settings-section-title"><KeyRound size={14} /> Change password</div>
            <div className="form-col">
              <input
                className="form-input"
                type="password"
                placeholder="Current password"
                value={current}
                onChange={e => { setCurrent(e.target.value); setPassDone(false); setPassError(''); }}
                autoComplete="current-password"
              />
              <input
                className="form-input"
                type="password"
                placeholder="New password (min 4 chars)"
                value={next}
                onChange={e => { setNext(e.target.value); setPassDone(false); setPassError(''); }}
                autoComplete="new-password"
              />
              {passError && (
                <div className="auth-error" style={{ fontSize: 12.5 }}>
                  <AlertCircle size={14} /> {passError}
                </div>
              )}
              <div className="save-row">
                <button
                  className="save-btn"
                  onClick={savePassword}
                  disabled={passSaving || !current || next.length < 4}
                >
                  {passSaving ? <Loader2 size={15} className="spin" /> : <KeyRound size={15} />}
                  Update
                </button>
                {passDone && <span className="save-ok"><BadgeCheck size={15} /> Password changed!</span>}
              </div>
            </div>
          </section>

          {/* ---------- THEME ---------- */}
          <section>
            <div className="settings-section-title"><Palette size={14} /> Theme</div>
            <div className="theme-grid">
              {themes.map(t => (
                <button
                  key={t.id}
                  className={`theme-card ${theme === t.id ? 'active' : ''}`}
                  onClick={() => setTheme(t.id)}
                  aria-pressed={theme === t.id}
                >
                  <span className="theme-swatches">
                    {t.swatches.map(c => (
                      <span key={c} className="theme-swatch" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="t-name">{t.name}</span>
                  {theme === t.id && <span className="t-check"><Check size={15} strokeWidth={3} /></span>}
                </button>
              ))}
            </div>
          </section>

          {/* ---------- LOGOUT ---------- */}
          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={17} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
