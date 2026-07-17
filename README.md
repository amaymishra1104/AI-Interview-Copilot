# NEXUS.AI — AI Interview Simulation Platform

> **Live Demo → [ai-interview-platform-one-wine.vercel.app](https://ai-interview-platform-one-wine.vercel.app)**
> **GitHub → [sakshigupta372/ai-interview-platform](https://github.com/sakshigupta372/ai-interview-platform)**

![NEXUS.AI Screenshot](./assets/screenshot.png)

---

## What is this?

NEXUS.AI is a **production-grade, agentic AI interview simulation engine** powered by Google Gemini. It runs a full multi-agent pipeline to generate adaptive questions, evaluate your answers in real time, and build a neural profile of your strengths and weaknesses — across 5 progressively harder questions.

Users bring their own Gemini API key (BYOK), upload their resume for personalised questions, and choose between voice answers, text answers, or a full coding round with a Monaco code editor.

---

## Key Features

### 🧠 Multi-Agent AI Pipeline
- **Agent 1 — Generator:** Creates a role-specific opening question, optionally tailored to the candidate's resume
- **Agent 2 — Evaluator:** Scores your answer (0–10) with detailed feedback, detects strengths/weaknesses, and for coding rounds returns time & space complexity
- **Agent 3 — Follow-up:** Generates the next adaptive question based on your score and target difficulty

### 📄 Resume Upload & Personalised Questions
- Upload your **PDF resume** on the setup screen
- Gemini extracts your role, skills, experience, and projects
- Every question is tailored to your actual background — not just the job title
- Resume is parsed client-side and never stored on the server

### 💻 Coding Round Mode
- Select **Coding Round** as the interview type
- Full **Monaco Editor** (VS Code engine) replaces the text area
- Language picker: JavaScript, Python, Java, C++, TypeScript, Go, Rust, C#
- Evaluator grades correctness, code quality, time complexity, and space complexity
- Adaptive follow-up problems based on your performance

### 📥 PDF Report Export
- After completing any interview, click **Download PDF Report**
- Report includes every question, your answer, score, suggestions, ideal answer, and complexity metrics
- Generated entirely client-side with jsPDF — no data leaves your browser

### 📊 Score Progress Charts (Profile Page)
- **Score Trend** — line chart of your average score across all sessions over time
- **Top Weaknesses** — bar chart showing your most frequently detected weak areas
- Charts appear automatically after 2+ sessions

### 🎤 Full 2-Way Voice Mode
- AI speaks every question aloud via **Web Speech Synthesis**
- You respond via the **Microphone** button using Web Speech API
- Real-time **Clarity** and **Confidence** meters update as you type or speak
- Voice is disabled in Coding Round mode (code speaks for itself)

### 🏢 Company & Persona Targeting
- Target company: **Google, Amazon, Stripe** or Agnostic
- Interviewer tone: **Harsh Tech Lead, Friendly HR, Chaotic Startup Founder**
- Interview type: **Technical, HR & Culture, System Design, Coding Round**

### ⏱️ Adaptive Difficulty + Timer
- AI escalates or reduces difficulty dynamically based on your score
- Timer modes: **Practice (no timer), Pressure (2 min), Rapid Fire (30s)**

### 🔐 Clerk Authentication (BYOK Model)
- Sign in via **Clerk** (Google / GitHub / Email)
- Paste your own **Gemini API key** after login — zero platform rate limits
- Key is stored in `sessionStorage` only — never sent to our database

### 🧭 Nexus Mentor (V4)
- Powered by your full interview history
- **Weakness Analysis** — patterns, root causes, priority areas
- **4-Week Learning Roadmap** — weekly topics, resources, and goals
- **Recommended Projects** — with difficulty level and estimated weeks

### 📋 Profile Dashboard
- Full history of every session with expandable Q&A transcripts
- Average score, peak difficulty, strengths and weaknesses per session
- Per-question score dot visualisation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack) |
| Styling | Vanilla CSS + Inline Styles |
| Auth | Clerk |
| AI Engine | Google Gemini (`gemini-2.5-flash`) |
| Code Editor | Monaco Editor (`@monaco-editor/react`) |
| Charts | Recharts |
| PDF Export | jsPDF (client-side) |
| Backend | Node.js + Express.js |
| File Parsing | Multer + pdf-parse |
| Database | MongoDB (Mongoose) |
| Animations | Framer Motion |
| Voice | Web Speech API + SpeechSynthesis |
| Deployment | Vercel (frontend) + Render (backend) + MongoDB Atlas |

---

## Architecture

```
User Browser
  ↓  Clerk Auth Gate
  ↓  Gemini API Key Gate (BYOK)
  ↓  Resume Upload (optional PDF → /resume/parse)
Vercel → Next.js Frontend
  ↓  axios POST
Render → Express Backend
  ├── Agent 1: generateQuestion()     ← Gemini  (uses resumeContext if provided)
  ├── Agent 2: evaluateAnswer()       ← Gemini  (code-aware for Coding Round)
  ├── Agent 3: generateFollowUp()     ← Gemini  (adaptive difficulty)
  └── Resume:  extractResumeContext() ← Gemini  (pdf-parse → structured profile)
  ↓
MongoDB Atlas → Sessions Collection
```

---

## Pages

| Route | Description |
|---|---|
| `/` | Main interview simulator — setup, live interview, dashboard |
| `/profile` | Full session history, score charts, weakness trends |
| `/mentor` | AI career mentor — weakness analysis, roadmap, project ideas |

---

## Running Locally

### Prerequisites
- Node.js 18+
- A free [Gemini API key](https://aistudio.google.com/app/apikey)
- A free [Clerk account](https://clerk.com)
- MongoDB Atlas connection string (or local `mongod`)

### Backend
```bash
cd server
npm install
```

Create `server/.env`:
```env
MONGO_URI=mongodb://localhost:27017/nexus-ai
PORT=5000
FRONTEND_URL=http://localhost:3000
```

```bash
node index.js
# → Server running on port 5000
# → MongoDB Successfully Connected!
```

### Frontend
```bash
cd client
npm install
```

Create `client/.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:5000
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

### Frontend (`client/.env.local`)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=   # from Clerk dashboard
CLERK_SECRET_KEY=                    # from Clerk dashboard
NEXT_PUBLIC_API_URL=                 # https://your-backend.onrender.com
```

### Backend (`server/.env`)
```env
MONGO_URI=       # MongoDB Atlas connection string
PORT=5000
FRONTEND_URL=    # https://your-app.vercel.app
```

---

## Deployment

| Service | Purpose | Cost |
|---|---|---|
| [Vercel](https://vercel.com) | Frontend hosting | Free |
| [Render](https://render.com) | Backend hosting | Free |
| [MongoDB Atlas](https://cloud.mongodb.com) | Cloud database | Free |
| [Clerk](https://clerk.com) | Authentication | Free (10k MAU) |

**Total: $0/month**

### Vercel Setup
1. Import repo → set **Root Directory** to `client`
2. Add environment variables:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_API_URL` → your Render backend URL
3. Push to `main` — Vercel auto-deploys

### Render Setup
1. New Web Service → connect repo → set **Root Directory** to `server`
2. Build command: `npm install`
3. Start command: `node index.js`
4. Add environment variables:
   - `MONGO_URI`
   - `PORT=5000`
   - `FRONTEND_URL` → your Vercel app URL

### Clerk Setup
- Go to **Clerk Dashboard → your app → Domains**
- Add your Vercel domain (e.g. `your-app.vercel.app`) as an allowed origin

---

## Project Structure

```
nexus-ai/
├── client/                      # Next.js frontend (Vercel)
│   ├── app/
│   │   ├── page.js              # Main interview simulator
│   │   ├── profile/page.js      # Session history + charts
│   │   └── mentor/page.js       # Nexus mentor (V4)
│   └── components/
│       └── CodeEditor.js        # Monaco editor wrapper
│
└── server/                      # Express backend (Render)
    ├── index.js                 # App entry, CORS, routes
    ├── db.js                    # MongoDB connection
    ├── routes/
    │   ├── interview.js         # /interview — start, answer, history
    │   ├── mentor.js            # /mentor — career plan generation
    │   └── resume.js            # /resume/parse — PDF upload & extraction
    ├── ai/
    │   ├── llm.js               # Agent 1 — question generator
    │   ├── evaluate.js          # Agent 2 — answer evaluator
    │   ├── followUp.js          # Agent 3 — adaptive follow-up
    │   └── resumeParser.js      # Resume context extractor
    ├── models/
    │   └── session.model.js     # Mongoose session schema
    └── services/
        └── session.js           # Session CRUD helpers
```

---

## License

MIT — built with ❤️ by [@sakshigupta372](https://github.com/sakshigupta372)
