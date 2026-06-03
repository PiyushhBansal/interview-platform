# AI-Powered Interview Preparation Platform

## 1. Introduction

The purpose of this project is to build a smart interview preparation platform that helps students prepare for technical interviews in a realistic and personalized way. Most coding platforms today focus only on solving problems, but real interviews involve much more than writing correct code. Candidates are also expected to explain their thinking, communicate clearly, justify optimizations, answer follow-up questions, and present confidence during discussion.

This platform bridges that gap by combining coding practice with AI-powered interview simulation, verbal communication analysis, personalized analytics, and resume-based preparation.

The platform is designed primarily for college students and placement preparation. Unlike traditional coding websites, the goal is to simulate the behavior of a real interviewer and help users improve not only coding ability but also interview communication and confidence.

**What makes this project different from a typical CRUD app:**
- Real-time voice processing
- A custom-trained ML model that learns from user interview data (data flywheel)
- LLM integration for qualitative feedback
- Personalized analytics driven by the user's own data

---

## 2. Problem Statement

Most students preparing for placements face several major problems:

- They practice DSA questions but never practice explaining their logic verbally.
- They do not know whether their communication during interviews is good or poor.
- They are unable to identify weak topics consistently.
- Mock interview platforms are either expensive or require another human interviewer.
- Existing coding platforms do not provide personalized interview feedback.
- Students often memorize solutions instead of understanding interview thinking.

This project solves these issues by creating an AI-powered mock interview ecosystem.

---

## 3. Project Objective

Build a platform where users can:

- Solve coding problems
- Explain solutions verbally
- Participate in AI-driven mock interviews
- Receive communication analysis (powered by our own ML model)
- Get optimization feedback on code
- Track weak topics and performance trends
- Upload resumes for personalized interview preparation
- Practice company-specific interview rounds

The final system should feel like an intelligent interview mentor rather than only a coding website.

---

## 4. Core Features of the Platform

### 4.1 Coding Practice Module

Users practice DSA questions in an online coding environment.

**Features:**
- Problem list with filtering
- Difficulty levels (Easy, Medium, Hard)
- Topic-wise categorization
- Code editor with syntax highlighting (Monaco Editor)
- Multiple programming language support
- Code submissions and history
- AI-generated code feedback

**Code execution:** Judge0 via RapidAPI for MVP (hosted, free tier, zero infra). Move to self-hosted Judge0 later if scale demands it.

---

### 4.2 AI Code Review System

After a user submits code, an LLM analyzes the solution and provides feedback.

**Feedback dimensions:**
- Time complexity
- Space complexity
- Code readability
- Logic clarity
- Edge case handling
- Possible optimizations

**Example:**
If a user submits a brute-force solution for a sliding window problem, the AI suggests an optimized approach and explains why it's better.

**Powered by:** Gemini API (Gemini 2.5 Flash for cost-efficiency).

---

### 4.3 Verbal Solution Explanation Module

The most unique feature of the platform.

After solving a coding problem, the user clicks "Explain Solution" and verbally explains their approach using a microphone.

**Flow:**
1. Audio is recorded in the browser (MediaRecorder API).
2. Audio is uploaded to backend and stored in object storage.
3. Speech-to-text conversion via Deepgram (faster + cheaper than Whisper API for realtime).
4. Transcript + audio features are fed into our ML model + LLM for analysis.

**What gets analyzed:**
- Confidence level (from audio features — pitch, jitter, shimmer)
- Communication clarity (from transcript NLP)
- Use of filler words (um, uh, like)
- Explanation structure
- Whether complexity analysis was mentioned
- Whether brute-force and optimized approaches were discussed

---

### 4.4 AI Mock Interview System (Phase-Based State Machine)

This is the heart of the platform. Unlike LeetCode (type code → submit → done), our interview is a **stateful conversation** that mirrors a real technical interview at Google / Amazon / Meta.

**Core principle:** No "Submit" button per step. The entire interview is ONE session that gets ONE evaluation at the end — across approach, code, dry-run, complexity, and communication combined.

**The interview phases:**

| Phase | What happens | Candidate action | AI behavior |
|---|---|---|---|
| `INTRO` | AI greets, presents the problem | Reads problem | Welcoming, sets context |
| `APPROACH` | Candidate explains how they'd solve it | Speaks (mic on) | Listens; may ask follow-ups ("Why hashmap?") |
| `TRANSITION_TO_CODE` | AI confirms approach is reasonable | Clicks "Done explaining" | "Sounds good — go ahead and code it" |
| `CODING` | Candidate writes code in Monaco editor | Codes silently | Quiet (doesn't interrupt) |
| `SILENT_CHECK` | Code runs through Judge0 in background | (invisible to candidate) | Stores result; uses it later to guide questions |
| `DRY_RUN` | Candidate walks through with example input | Speaks (mic on) | "Walk me through `[1,2,3]`" — may pick an input that exposes a bug |
| `COMPLEXITY` | Candidate explains time + space complexity | Speaks (mic on) | "Can space be O(1)?" |
| `WRAP_UP` | Final reflection — "anything you'd improve?" | Speaks (mic on) | Open-ended |
| `EVALUATION` | ML model + LLM analyze entire session | (waits for report) | Generates multi-dimensional scorecard |

**Phase transitions:**
- v1: Explicit "I'm ready / done with this part" buttons (reliable, no false-positives)
- v2: Voice-triggered (AI detects "done" / "I'm finished" → auto-advance)

**Backward transitions:**
The candidate can go back to the editor during `DRY_RUN` or `COMPLEXITY` phases (real interviewers let you fix bugs you notice). Editor locks only at `WRAP_UP`.

**Silent code execution (key UX detail):**
When the candidate finishes `CODING`, the code is sent to Judge0 **silently**. The result is stored but NOT shown to the candidate. Why? A good interviewer doesn't say "your code is wrong" — they ask a question that leads you to discover the bug yourself. The stored result helps the AI:
- Pick a dry-run input that exposes a bug (if the code has one)
- Phrase the dry-run prompt as a probing question instead of a verdict
- Inform the final evaluation

**Example flow:**
```
AI: "Hey champ, welcome to your DSA interview. Today's problem: Two Sum.
     Given an array of integers and a target, return indices of the two
     numbers that add up to the target. Take a moment to read it. Whenever
     you're ready, walk me through your approach."

[Candidate clicks 'Start' → mic activates]

CANDIDATE: "Okay, my first thought is brute force — nested loops, O(n²).
            But I can do better with a hashmap..."

AI: "Why hashmap over sorting plus two pointers?"

CANDIDATE: "Hashmap is O(n), sorting is O(n log n)."

AI: "Good. Go ahead and code it up."

[Editor focuses; candidate codes for 4 minutes]

CANDIDATE: "Done."

[Judge0 silently runs the code → passes all test cases]

AI: "Let's walk through it. What does it do with [3, 2, 4] and target 6?"

CANDIDATE: "We start with hashmap empty. We see 3 — need 3, not there..."

AI: "And time/space complexity?"

CANDIDATE: "Time O(n), space O(n)."

AI: "Can you do it with less space?"

CANDIDATE: "Hmm, you'd lose the O(n) time guarantee..."

AI: "Fair. Anything you'd change if you had more time?"

[Final evaluation across all phases]
```

**Powered by:** Gemini API for question generation, follow-ups, and qualitative feedback. ML model for quantitative scoring (see Section 7).

---

### 4.5 Communication Analysis System (ML-Powered)

**This is where our custom ML model lives.** Unlike pure LLM scoring, this model learns from real user interview data and improves over time.

**Analysis dimensions:**
- Speaking confidence
- Pause frequency
- Communication flow
- Sentence clarity
- Technical explanation quality
- Interview behavior score

The user receives a final communication score after each interview, plus percentile rankings against other users.

**Details in Section 7 (ML System Design).**

---

### 4.6 Analytics Dashboard

The platform maintains detailed analytics for every user.

**Dashboard tracks:**
- Total problems solved
- Topic-wise mastery
- Weekly progress
- Accuracy percentage
- Interview scores (from ML model)
- Communication trends over time
- Strongest topics
- Weakest topics (with ML-based prediction)

Visualized using Recharts (graphs and charts).

---

### 4.7 Resume Analyzer Module

Integrated as a feature inside the platform (not a separate project).

**Users upload resumes in PDF format.**

**The AI analyzes:**
- Resume structure
- Skills section
- Project descriptions
- Technical keyword quality
- Resume formatting
- ATS friendliness

**The system generates:**
- Resume improvement suggestions
- Personalized interview questions
- Skill gap analysis
- Project recommendation suggestions

**Powered by:** Gemini API (for parsing + suggestions).

**Example:** If the resume contains React and Node.js projects, the platform generates frontend and backend interview questions automatically.

---

## 5. Technology Stack (Our Chosen Stack)

### Frontend
- **Next.js 15 (App Router)** — single repo, single deploy, server components
- **TypeScript** — type safety
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — pre-built accessible components, fast to ship
- **Monaco Editor** — same code editor as VS Code
- **Recharts** — dashboard visualizations

### Backend
- **Next.js API routes** — handles 90% of backend needs (auth, CRUD, AI proxy)
- **Separate Node + Socket.io service** — only for the real-time interview/voice feature (Phase 2). Deployed on Railway or Fly.io.

### Database
- **PostgreSQL on Neon** — serverless Postgres, branching, generous free tier
- **Drizzle ORM** — lightweight, type-safe, better DX than Prisma

### Authentication
- **Clerk** — drop-in auth (signup, login, password reset, social login). Free tier covers 10k users. No boilerplate.

### AI / LLM Services
- **Gemini API (Gemini 2.5 Flash)** — primary LLM for:
  - Code review feedback (Section 4.2)
  - Interview question generation (Section 4.4)
  - Follow-up question generation
  - Resume parsing and suggestions (Section 4.7)
  - Qualitative interview feedback ("you didn't mention space complexity")
- **Vercel AI SDK** — unified interface for swapping LLM providers if needed
- **API Key Storage:** Stored in `.env.local` (never committed). Access via `process.env.GEMINI_API_KEY` from server-side routes only. Never exposed to client.

### ML Stack (Our Custom Model)
- **Python + FastAPI** — separate microservice for ML
- **librosa** — audio feature extraction (pitch, jitter, energy, pauses)
- **pyannote** — voice activity detection
- **spaCy** — NLP / parsing
- **sentence-transformers (sBERT)** — semantic embeddings for transcripts
- **XGBoost / LightGBM** — gradient boosting model for scoring
- **scikit-learn** — preprocessing, evaluation
- **Hosting:** Modal or Railway (Modal has generous free tier for ML workloads)

### Voice & Speech
- **MediaRecorder API** — browser-side recording
- **Deepgram** — speech-to-text (word-level timestamps, faster than Whisper)
- **Browser TTS** — for AI interviewer voice (free); upgrade to ElevenLabs later if needed
- **Socket.io** — real-time bi-directional communication for live interviews
- **WebRTC** — NOT used (overkill for our needs; we stream audio to server via WebSocket instead)

### Code Execution
- **Judge0 via RapidAPI** — hosted code execution sandbox

### Storage
- **Cloudflare R2 or AWS S3** — for storing interview audio files

### Deployment
- **Vercel** — frontend + Next.js API routes
- **Neon** — Postgres database
- **Railway** — Socket.io service + any background workers
- **Modal** — Python ML service

### Job Queue (for async tasks)
- **Inngest or BullMQ** — for processing audio → features → ML scoring asynchronously

---

## 6. Why This Stack (Decisions Explained)

**Why Next.js over React + Express?**
Solo dev = fewer moving parts. Next.js handles routing, API routes, server components, and deploys cleanly to Vercel in one repo. Splitting into separate frontend/backend repos adds complexity without benefit at this stage.

**Why Clerk over rolling JWT auth?**
Solo dev should not be debugging password reset emails. Clerk handles it. Free tier is generous.

**Why Drizzle over Prisma?**
Lighter, faster cold starts (matters on Vercel), better TypeScript inference. Prisma is also fine if preferred.

**Why a separate Python ML service?**
Python has the entire ML ecosystem (librosa, spaCy, scikit-learn, HuggingFace). JS/TS doesn't. Keep ML in Python, call it from Next.js via REST.

**Why Gemini Flash and not GPT-4 or Claude for everything?**
Cost. Gemini Flash is fast and cheap, perfect for high-volume tasks. We can swap in Claude Sonnet for specific high-quality tasks later via the Vercel AI SDK.

**Why our own ML model AND LLM?**
They complement each other:
- **ML model** = quantitative scoring (numerical scores, percentiles, learns from our data)
- **LLM** = qualitative feedback (natural-language suggestions)
- **Critical:** an LLM can't tell you "your speech rate is in the 30th percentile" — only a model trained on our user data can.

---

## 7. ML System Design (Our Custom Model)

### 7.1 Core Idea

Every interview the user does, we save the audio, transcript, and question. Over time, this becomes a training dataset. We train an ML model on this data to score future interviews across multiple performance dimensions.

**This is the "data flywheel":** every user makes the model smarter. An LLM API call can never replicate this — it has no memory of our users.

### 7.2 Data We Collect Per Interview

- Raw audio file (stored in S3/R2)
- Transcript with word-level timestamps (from Deepgram)
- The question that was asked
- Metadata: duration, topic, difficulty, timestamp
- User profile data

### 7.3 Feature Extraction Pipeline

When a new interview answer comes in, the ML service extracts:

**Audio-level features (from librosa + Deepgram timestamps):**
- Speech rate (words per minute)
- Pause frequency and average pause length
- Filler word ratio (um, uh, like, you know)
- Pitch variance (monotone vs expressive)
- Energy / volume consistency
- Jitter and shimmer (voice stability — proxies for nervousness)

**Text-level features (from spaCy + sBERT):**
- Vocabulary richness (type-token ratio)
- Technical keyword density (did they mention "complexity", "edge case", "hashmap", etc.)
- Sentence structure complexity
- Coherence score (do sentences logically follow?)
- Answer completeness (approach → complexity → tradeoffs)
- sBERT embedding of full transcript

### 7.4 Scoring Model

Multi-dimensional scorer that outputs **separate scores per dimension** (not a single number):

| Dimension | What it measures | Inputs |
|---|---|---|
| Approach explanation | Did they explain the approach clearly before coding? | APPROACH phase audio + transcript |
| Code correctness | Did the code pass test cases? | Judge0 result |
| Code quality | Naming, structure, readability | Final code + Gemini |
| Communication confidence | Speech rate, filler words, pauses | All audio phases |
| Complexity analysis | Did they get TC + SC right? Did they consider tradeoffs? | COMPLEXITY phase audio + transcript |
| Dry-run thoroughness | Did they cover edge cases? Did they actually trace correctly? | DRY_RUN phase audio + transcript |
| Follow-up handling | Did they adapt when the AI pushed back? | Conversational turn-by-turn analysis |
| Coding behavior | Linear writer vs heavy backtracker? Pauses while coding? | Code snapshots every 10s |

**Phase-level features** the ML model uses (beyond per-utterance features):
- Time spent in each phase (rushed APPROACH = lower confidence score)
- Number of follow-up questions the AI asked per phase (more = candidate's initial answer was incomplete)
- Whether the candidate backtracked to the editor during DRY_RUN (caught their own bug = positive signal)
- Total interview duration vs problem difficulty (too fast or too slow both flag issues)

**Approach v1 (start here): Rule-based scoring**
Hard-coded thresholds (e.g., filler word ratio > 5% → low communication score). Works on day 1 with zero data.

**Approach v2: XGBoost / LightGBM**
- Features → scores
- Needs ~100–200 labeled training examples
- Explainable, lightweight, fast

**Approach v3: Embedding-based neural net**
- sBERT embeddings + audio features → neural net → scores
- Needs more data, less explainable, more sophisticated

### 7.5 Bootstrapping Labels (Cold Start Problem)

Until we have ~50–100 labeled interviews, the trained model won't be reliable.

**Solution — hybrid bootstrap:**
1. Use Gemini/Claude to generate initial labels.
2. Manually correct the wrong ones over time.
3. Retrain model periodically with corrected labels.

### 7.6 Killer Feature: Comparative Analytics

Once we have a user population, we can compute things an LLM can't:
- "Your speech rate is in the 30th percentile compared to top performers"
- "Users who explain complexity *before* coding score 23% higher on average"
- "Your filler word usage dropped 40% over the last 10 interviews"

This is real personalized analytics — driven by our own user data, not an API call.

### 7.7 ML Service Architecture

```
Frontend (Next.js)
    ↓ records audio, uploads to backend
Backend (Next.js API)
    ↓ saves audio to R2, metadata to Postgres
    ↓ queues a job (Inngest)
ML Service (Python + FastAPI on Modal)
    ↓ extracts features (librosa, spaCy, sBERT)
    ↓ runs scoring model
    ↓ writes scores back to Postgres
Frontend
    ↓ dashboard shows scores + percentiles + trends
```

---

## 8. System Workflow (End-to-End)

### 8.1 Coding Practice Flow (no interview)
1. User logs into the platform (Clerk auth).
2. User selects a coding problem from `/problems`.
3. User writes code in Monaco editor.
4. User clicks "Run" — code executes via Judge0, results shown.
5. User clicks "Submit" — submission stored in Postgres.
6. Gemini API analyzes the solution → returns AI code review.
7. Dashboard updates with topic mastery + accuracy stats.

### 8.2 Full Interview Flow (the main event)
1. User clicks "Start Interview" on a problem.
2. New `interview_sessions` row created with `phase = "INTRO"`.
3. AI greets the candidate and presents the problem (TTS).
4. Phase advances to `APPROACH`:
   - Mic activates.
   - Candidate explains approach verbally.
   - Audio streamed to backend; Deepgram transcribes in real time.
   - Gemini may inject follow-up questions ("Why hashmap?").
5. Candidate clicks "Done explaining" → phase advances to `TRANSITION_TO_CODE`.
6. AI confirms ("Sounds good — code it up") → phase advances to `CODING`.
7. Mic deactivates. Editor focuses. Candidate codes silently.
8. Candidate clicks "Done coding" → phase advances to `SILENT_CHECK`.
9. **Silently:** code is sent to Judge0. Result stored in DB. **NOT shown to candidate.**
10. Phase advances to `DRY_RUN`:
    - AI picks an example input (biased toward exposing bugs if Judge0 found any).
    - Mic activates.
    - Candidate walks through execution verbally.
11. Phase advances to `COMPLEXITY`:
    - AI asks for time + space complexity.
    - May push back ("Can space be O(1)?").
12. Phase advances to `WRAP_UP`:
    - AI asks open reflection ("Anything you'd change?").
    - Editor locks.
13. Phase advances to `EVALUATION`:
    - All audio + transcripts + code + Judge0 result sent to ML service.
    - ML model scores: confidence, communication clarity, structure, depth.
    - Gemini generates qualitative feedback per phase.
    - Multi-dimensional scorecard written to `interview_reports`.
14. Dashboard updates with new scores, percentiles, weak topic predictions.
15. User optionally uploads resume → Gemini analyzes → personalized questions generated.

### 8.3 Key UX rules
- **No "Submit" button per phase.** The interview is ONE session.
- **Code is editable until `WRAP_UP`.** Candidate can fix bugs mid-interview if they realize during dry-run.
- **Judge0 result is hidden from the candidate.** The AI uses it to ask probing questions, not to grade in real time.
- **Final evaluation is multi-dimensional**, not a single score (see Section 7.4).

---

## 9. Development Phases

### Phase 1 — Foundation and MVP (Weeks 1–6)

**Goal:** Usable coding practice platform with AI code review.

**Features:**
- User authentication (Clerk)
- Coding problem section
- Monaco editor integration
- Judge0 code execution
- Submission tracking (Postgres + Drizzle)
- Gemini-powered code review
- Basic dashboard (Recharts)

**Output:** Deployable, resume-worthy platform.

---

### Phase 2 — Interview State Machine + Voice (Weeks 7–12)

**Goal:** Voice-based, phase-driven mock interviews + custom ML scoring.

**Features:**
- Interview state machine (INTRO → APPROACH → CODING → SILENT_CHECK → DRY_RUN → COMPLEXITY → WRAP_UP → EVALUATION)
- Voice recording per phase (MediaRecorder)
- Audio storage (R2) with phase tagging
- Deepgram speech-to-text + word-level timestamps
- Socket.io service for real-time interview sessions
- AI interviewer (Gemini) — phase-aware prompts + dynamic follow-up questions
- **Silent Judge0 execution** between CODING and DRY_RUN — result stored, hidden from candidate
- Code snapshots every 10 seconds during CODING phase (for behavior analysis)
- Phase duration tracking (feeds ML model)
- **Rule-based ML v1** — runs day 1 with no training data
- Multi-dimensional scorecard at end of interview
- Begin collecting interview data for ML training

---

### Phase 3 — Advanced Intelligence & Personalization (Weeks 13–20)

**Goal:** Real ML model + advanced analytics.

**Features:**
- **Trained ML v2** (XGBoost) on collected data
- Advanced analytics dashboard
- Performance trend graphs
- Weak topic prediction (ML-based)
- Resume analyzer (Gemini)
- Personalized preparation roadmap
- Company-specific interview preparation
- Downloadable interview reports
- Percentile rankings against other users

---

## 10. Environment Variables (.env.local)

```
# Database
DATABASE_URL=postgresql://...neon...

# Auth
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...

# LLM
GEMINI_API_KEY=...

# Speech
DEEPGRAM_API_KEY=...

# Code Execution
RAPIDAPI_KEY=...

# Storage
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=...
R2_ENDPOINT=...

# ML Service
ML_SERVICE_URL=https://...modal.run
ML_SERVICE_API_KEY=...

# Job Queue
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

**Security rules:**
- All API keys are server-side only.
- `.env.local` is in `.gitignore`.
- Never expose `GEMINI_API_KEY` or any secret to the client.
- All LLM/ML calls happen through Next.js API routes (server-side).

---

## 11. Database Schema (High-Level)

**Tables (to be implemented with Drizzle):**

### Core
- `users` — Clerk user ID, profile, created_at
- `problems` — title, description, difficulty, topic, test_cases, example_inputs (jsonb)
- `submissions` — user_id, problem_id, code, language, status, execution_time, ai_review, created_at (used in coding-practice flow, NOT interviews)

### Interview flow (the main schema)
- `interview_sessions` — user_id, problem_id, current_phase (enum), started_at, ended_at, final_code, language, judge0_result (jsonb, hidden from user), total_score
- `interview_phase_logs` — session_id, phase (enum), started_at, ended_at, duration_seconds — tracks how long the candidate spent in each phase (used as a feature in the ML model)
- `interview_audio_chunks` — session_id, phase, audio_url, transcript, word_timestamps (jsonb), created_at — one row per phase that has audio (APPROACH, DRY_RUN, COMPLEXITY, WRAP_UP)
- `interview_code_snapshots` — session_id, code, language, captured_at — periodic snapshots of the editor (every 10 sec during CODING) so we can analyze coding behavior (linear vs backtracking)
- `interview_reports` — session_id, scores (jsonb: technical_clarity, confidence, structure, depth, complexity_analysis, dry_run_thoroughness), llm_feedback (per-phase), ml_features (jsonb), generated_at

### Analytics & profile
- `topic_mastery` — user_id, topic, accuracy, last_practiced, weakness_score (ML-predicted)
- `resumes` — user_id, file_url, parsed_data (jsonb), suggestions, created_at

### Phase enum
`INTRO | APPROACH | TRANSITION_TO_CODE | CODING | SILENT_CHECK | DRY_RUN | COMPLEXITY | WRAP_UP | EVALUATION | COMPLETED`

---

## 12. Future Scope

- Peer-to-peer live interviews
- AI-generated interview roadmaps
- Mobile application
- Contest mode
- Company-specific preparation paths
- AI-generated coding contests
- Real-time collaborative interviews
- Leaderboards for colleges
- Placement preparation communities

---

## 13. Expected Outcome

The final platform should help students:
- Improve coding ability
- Improve communication skills
- Practice realistic interviews
- Identify weaknesses
- Prepare smarter for placements
- Build confidence for technical interviews

The project stands out because it combines:
- Full-stack development (Next.js + Postgres)
- LLM integration (Gemini)
- Realtime systems (Socket.io)
- Voice processing (Deepgram + MediaRecorder)
- **Custom-trained ML model with data flywheel**
- Personalized analytics
- Product-oriented system design

This makes the project significantly more advanced than standard CRUD or tutorial-based applications.

---

## 14. Conclusion

This project is not just a coding platform. It is a complete AI-powered interview preparation ecosystem designed to simulate real technical interviews and help students improve both technical and communication skills.

By integrating coding practice, AI-based evaluation, verbal communication analysis, interview simulation, analytics, and resume analysis into one unified platform — and by training a custom ML model on real user interview data — the system provides a much more realistic and effective preparation experience for students than any existing competitor.

The project demonstrates strong skills in frontend development, backend engineering, LLM integration, ML model design, realtime communication, database management, and product-oriented system design — making it highly valuable as both a resume project and a potentially scalable startup idea.
