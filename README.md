


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Live Classes (Zoom-like) — Admin + Student

### Routes
- **Student chat/login**: `/chat`
- **Student dashboard (Join Live)**: `/dashboard`
- **Join meeting (link)**: `/meet/:joinSlug`
- **Join meeting (meetingId + password)**: `/meet?meetingId=...&meetingPassword=...`
- **Admin login**: `/admin/login`
- **Admin panel**: `/admin`

### Admin setup (env)
Add these to your `.env` (or your deployment env vars) to auto-create an admin user on server start:
- `ADMIN_EMAIL=admin@example.com`
- `ADMIN_PASSWORD=your-strong-password`

Optional but recommended:
- `JWT_SECRET=your-jwt-secret`

### Notes
- Live video/audio uses WebRTC (mesh via `simple-peer`) and Socket.io signaling.
- Participant counts update in real time via Socket.io (`classes:update` + `room:participants`).
