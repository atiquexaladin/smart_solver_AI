


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Render

This app needs a Node web service and MongoDB; GitHub Pages cannot run its API, Socket.IO, or live meeting signaling server.

1. Create a free MongoDB Atlas cluster and a database user. Allow network access from Render in the Atlas Network Access settings.
2. In Render, choose **New > Blueprint**, connect this GitHub repository, and deploy the `render.yaml` blueprint.
3. When prompted, set `MONGODB_URI` to the Atlas connection string and provide `GEMINI_API_KEY`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Keep these values in Render's environment settings, never in GitHub.
4. Wait for the service health check to pass, then open the `onrender.com` URL shown in the Render dashboard.

The Blueprint generates `JWT_SECRET` and deploys the Node server with the built frontend. The free web-service plan can sleep when idle; the URL remains the same and wakes on the next visit. Select a paid always-on plan in Render if the service must never sleep.

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
