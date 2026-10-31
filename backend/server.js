const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Allow both local and production origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_chat_key_change_in_production_12345';

// ============ NEON POSTGRESQL ============
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test connection + create tables
async function initDB() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to Neon PostgreSQL');

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar TEXT,
        online BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Chats table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id UUID PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('private', 'group')),
        name VARCHAR(100),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Chat members (many-to-many)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_members (
        chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (chat_id, user_id)
      )
    `);

    // Messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY,
        chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id),
        sender_name VARCHAR(100),
        text TEXT DEFAULT '',
        media_url TEXT,
        media_type VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes for speed
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id)`);

    console.log('✅ Database tables ready');
  } catch (err) {
    console.error('❌ DB Init Error:', err.message);
  }
}

initDB();

// Middleware
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer for media (temporary - later move to Cloudinary)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|webm|ogg|mp3|wav/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only images and videos/audio allowed'));
  }
});

// Auth helpers
function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ============ AUTH ROUTES ============
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (username.length < 3) return res.status(400).json({ error: 'Username too short' });

    const existing = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const name = displayName || username;

    await pool.query(
      `INSERT INTO users (id, username, display_name, password) VALUES ($1, $2, $3, $4)`,
      [id, username, name, hashed]
    );

    const user = { id, username, displayName: name, avatar: null };
    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const token = generateToken({ id: user.id, username: user.username });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, display_name, avatar FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = result.rows[0];
    res.json({ id: u.id, username: u.username, displayName: u.display_name, avatar: u.avatar });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ USERS ============
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, display_name, avatar, online 
       FROM users WHERE id != $1 ORDER BY display_name`,
      [req.user.id]
    );
    res.json(result.rows.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      avatar: u.avatar,
      online: u.online
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ CHATS ============
app.get('/api/chats', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.type, c.name, c.created_at,
             (
               SELECT json_build_object(
                 'id', m.id,
                 'text', m.text,
                 'mediaUrl', m.media_url,
                 'createdAt', m.created_at,
                 'senderName', m.sender_name
               )
               FROM messages m
               WHERE m.chat_id = c.id
               ORDER BY m.created_at DESC
               LIMIT 1
             ) as last_message
      FROM chats c
      JOIN chat_members cm ON cm.chat_id = c.id
      WHERE cm.user_id = $1
      ORDER BY COALESCE(
        (SELECT MAX(created_at) FROM messages WHERE chat_id = c.id),
        c.created_at
      ) DESC
    `, [req.user.id]);

    const chats = [];
    for (const row of result.rows) {
      let displayName = row.name;
      let avatar = null;

      if (row.type === 'private') {
        const other = await pool.query(`
          SELECT u.id, u.display_name, u.avatar
          FROM chat_members cm
          JOIN users u ON u.id = cm.user_id
          WHERE cm.chat_id = $1 AND cm.user_id != $2
        `, [row.id, req.user.id]);
        if (other.rows[0]) {
          displayName = other.rows[0].display_name;
          avatar = other.rows[0].avatar;
        }
      }

      const membersRes = await pool.query(
        'SELECT user_id FROM chat_members WHERE chat_id = $1',
        [row.id]
      );

      chats.push({
        id: row.id,
        type: row.type,
        name: displayName,
        avatar,
        members: membersRes.rows.map(r => r.user_id),
        lastMessage: row.last_message ? {
          id: row.last_message.id,
          text: row.last_message.text,
          mediaUrl: row.last_message.mediaUrl,
          createdAt: row.last_message.createdAt,
          senderName: row.last_message.senderName
        } : null,
        updatedAt: row.last_message?.createdAt || row.created_at
      });
    }

    res.json(chats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/chats/private', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Check existing private chat
    const existing = await pool.query(`
      SELECT c.id FROM chats c
      JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = $1
      JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = $2
      WHERE c.type = 'private'
      LIMIT 1
    `, [req.user.id, userId]);

    let chatId;
    if (existing.rows.length > 0) {
      chatId = existing.rows[0].id;
    } else {
      chatId = uuidv4();
      await pool.query(
        `INSERT INTO chats (id, type, created_by) VALUES ($1, 'private', $2)`,
        [chatId, req.user.id]
      );
      await pool.query(
        `INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [chatId, req.user.id, userId]
      );
    }

    const other = await pool.query(
      'SELECT display_name, avatar FROM users WHERE id = $1',
      [userId]
    );

    res.json({
      id: chatId,
      type: 'private',
      name: other.rows[0]?.display_name || 'Unknown',
      avatar: other.rows[0]?.avatar || null,
      members: [req.user.id, userId]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/chats/group', authMiddleware, async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    if (!name || !memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ error: 'name and memberIds required' });
    }

    const chatId = uuidv4();
    const members = [...new Set([req.user.id, ...memberIds])];

    await pool.query(
      `INSERT INTO chats (id, type, name, created_by) VALUES ($1, 'group', $2, $3)`,
      [chatId, name, req.user.id]
    );

    for (const mId of members) {
      await pool.query(
        `INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [chatId, mId]
      );
    }

    res.json({
      id: chatId,
      type: 'group',
      name,
      members
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/chats/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    // Check membership
    const member = await pool.query(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [req.params.chatId, req.user.id]
    );
    if (member.rows.length === 0) return res.status(403).json({ error: 'Not a member' });

    const result = await pool.query(`
      SELECT id, chat_id, sender_id, sender_name, text, media_url, media_type, created_at
      FROM messages
      WHERE chat_id = $1
      ORDER BY created_at ASC
      LIMIT 100
    `, [req.params.chatId]);

    res.json(result.rows.map(m => ({
      id: m.id,
      chatId: m.chat_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      text: m.text,
      mediaUrl: m.media_url,
      mediaType: m.media_type,
      createdAt: m.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload media
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, mimetype: req.file.mimetype });
});

// ============ SOCKET.IO ============
const onlineUsers = new Map(); // userId -> socketId

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Auth error'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Auth error'));
  }
});

io.on('connection', async (socket) => {
  const userId = socket.user.id;
  console.log(`User connected: ${socket.user.username} (${userId})`);

  onlineUsers.set(userId, socket.id);

  try {
    await pool.query('UPDATE users SET online = true WHERE id = $1', [userId]);
  } catch (e) {}

  io.emit('user:online', { userId, online: true });

  // Join all user's chat rooms
  try {
    const chats = await pool.query(
      'SELECT chat_id FROM chat_members WHERE user_id = $1',
      [userId]
    );
    chats.rows.forEach(r => socket.join(r.chat_id));
  } catch (e) {}

  // Send message
  socket.on('message:send', async (data) => {
    const { chatId, text, mediaUrl, mediaType } = data;
    if (!chatId) return;

    try {
      // Check membership
      const member = await pool.query(
        'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
        [chatId, userId]
      );
      if (member.rows.length === 0) return;

      const messageId = uuidv4();
      const createdAt = new Date().toISOString();

      await pool.query(`
        INSERT INTO messages (id, chat_id, sender_id, sender_name, text, media_url, media_type, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [messageId, chatId, userId, socket.user.username, text || '', mediaUrl || null, mediaType || null, createdAt]);

      const message = {
        id: messageId,
        chatId,
        senderId: userId,
        senderName: socket.user.username,
        text: text || '',
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        createdAt
      };

      io.to(chatId).emit('message:new', message);
    } catch (err) {
      console.error('Message send error:', err);
    }
  });

  // Typing
  socket.on('typing:start', ({ chatId }) => {
    socket.to(chatId).emit('typing:start', { chatId, userId, username: socket.user.username });
  });
  socket.on('typing:stop', ({ chatId }) => {
    socket.to(chatId).emit('typing:stop', { chatId, userId });
  });

  socket.on('chat:join', ({ chatId }) => {
    socket.join(chatId);
  });

  socket.on('group:created', async ({ chatId, members }) => {
    for (const mId of members) {
      const sid = onlineUsers.get(mId);
      if (sid) {
        io.to(sid).emit('chat:new', { chatId });
        const s = io.sockets.sockets.get(sid);
        if (s) s.join(chatId);
      }
    }
  });

  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.user.username}`);
    onlineUsers.delete(userId);
    try {
      await pool.query('UPDATE users SET online = false WHERE id = $1', [userId]);
    } catch (e) {}
    io.emit('user:online', { userId, online: false });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
