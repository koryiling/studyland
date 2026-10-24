# Studyland 🌿📚
> **Upload · Learn · Grow** — Clean, beginner-friendly AI study planning and quiz generator.

Studyland allows students to upload their school files (**PDF**, **PPTX**, and **DOCX**), extracts readable text, and automatically generates interactive quizzes and exams strictly grounded in their actual course material.

---

## 🎨 Design Philosophy
- **Primary Green**: `#2F8F5B`
- **Background**: Soft Mint Green (`#F4F9F5`) with crisp white rounded cards
- **Vibe**: Calming, modern, cute, and distraction-free
- **Mascot**: Friendly little sprout creature reading a book
- **Device Support**: Fully responsive on mobile and desktop

---

## 🚀 Key User Flow
1. **Upload School Files**: Drag & drop or pick any `.pdf`, `.pptx`, `.docx` or `.txt` file (up to 25 MB).
2. **Reading**: Text is extracted in the browser (`pdfjs-dist` for PDF, `jszip` for PPTX/DOCX) with page/slide markers, so the file itself is never uploaded.
3. **AI Notes**: Choose a language (简体中文 / English / Bahasa Melayu / 中英双语) and Simple or Detailed notes. Long files are read section by section and merged; notes cite page numbers.
4. **Generate Quiz**: Select question types (*Multiple Choice*, *True/False*, *Short Answer*, or *Mixed*), difficulty and question count.
5. **Answer & Immediate Feedback**: Explanations with page references; short answers are graded by AI.
6. **Review Mistakes & Save Tasks**: Incorrect questions go to the **Mistake Notebook**; weak topics and follow-up tasks go to the **Study Plan**.
7. **Past Year Papers**: AI analyses an uploaded exam paper and generates similar practice questions.

---

## 📱 Navigation Sections
- **Home**: Next exam countdown, today's tasks with one-tap start, quick actions and recent files.
- **My Files**: Filter by type or past-year papers, preview extracted text, open AI Notes (exportable to PDF / Word) or a quiz.
- **Study Plan**: Semester setup (subjects, credit hours, Pass/Fail, target grades, teaching weeks, finals, sprint start),
  a month calendar for exams/quizzes/deadlines, and an AI sprint plan of two task kinds:
  *study* (finished only with the Focus timer; overtime capped at 30 min) and *practice* (finished by completing its quiz).
- **Journey**: Focus time per day/week/subject, clickable day history (focus sessions, quizzes, tasks),
  and GPA / CGPA on the UTAR scale (Pass/Fail not counted) with the GPA needed to reach a target CGPA.
- **Profile**: Progress, quiz history, Mistake Notebook, and AI settings.

---

## 🤖 AI Setup

Studyland never shows made-up questions: if no AI is connected, it says so.

**Built-in AI (free, for the site owner):** get a free Gemini key at
[Google AI Studio](https://aistudio.google.com/apikey), then create `.env.local`
(see `.env.example`):

```bash
GEMINI_API_KEY=your-key-here
# GEMINI_MODEL=gemini-3.8-flash   # optional
```

The key stays on the server and is never sent to the browser. All students share
its free-tier quota.

**Optional backup:** set `GROQ_API_KEY` (free at [Groq Console](https://console.groq.com/keys)) and
short requests (grading short answers, study plans) switch to Groq when Gemini is busy or out of quota.
Groq is very fast, but its free tier only allows about 8K tokens per minute, so long material stays on Gemini.

**Students' own keys:** in *Profile → AI Settings* a student can instead use their
own Google Gemini, Groq (free, very fast, best for short material), OpenAI (GPT) or DeepSeek key, with a step-by-step guide in the app.
These keys are stored only in that student's browser and are forwarded through the
Studyland server to the chosen provider; the server does not log or store them.

---

## 👤 Accounts & Data

- Sign up / log in with email + password (Supabase Auth). Forgot-password emails need a
  custom SMTP provider in Supabase (the built-in sender only reaches project team members).
- Files, notes, quiz results, mistakes, tasks, semesters, calendar events and focus sessions are stored in Supabase Postgres
  (`supabase/schema.sql`). Row Level Security means each user can only read and write
  their own rows. All access goes through `src/lib/studybub-storage.ts`.
- AI settings (including a student's own API key) stay in that browser only.
- The AI endpoint requires a signed-in user, so the built-in key can't be used anonymously.

**Admin page (`/admin`):** list users, generate a one-time reset-password link, set a
temporary password (the user must change it at next login), or confirm an email manually.
Admins never see passwords. Grant admin rights to a registered, confirmed account with:

```bash
node scripts/make-admin.mjs you@example.com
```

**Database schema:** `node scripts/apply-schema.mjs` (idempotent; uses `.env.local`).

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
# Or run production build on port 3005:
npm run build
npm run start -- -p 3005
```

Open [http://localhost:3005](http://localhost:3005) in your browser.
