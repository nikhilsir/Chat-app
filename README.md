# ChatApp - Real-time WhatsApp-like Chat

React + Node.js + Socket.io + **Neon PostgreSQL**

### Features
- User signup / login (JWT)
- Real-time 1-to-1 messaging
- Group chats
- Image & video sharing
- Online status + Typing indicators
- Dark WhatsApp-style UI
- Data permanently saved in Neon PostgreSQL

---

## Local Development

### 1. Backend
```bash
cd backend
npm install
npm start
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open → http://localhost:5173

---

## Environment Variables (backend/.env)

```
PORT=5000
JWT_SECRET=your_secret_key
DATABASE_URL=your_neon_connection_string
FRONTEND_URL=https://your-frontend-url.vercel.app
```

---

## Deploy Guide (coming next)

1. Push code to GitHub
2. Deploy Backend on **Render**
3. Deploy Frontend on **Vercel**
