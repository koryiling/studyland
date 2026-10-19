# Studyland 🧠⚡
> **Personal Learning Cockpit & AI Active Understanding Companion**

Studyland is a personal learning system designed to transform passive reading into **deep mental models**. It combines structured curriculum roadmaps with active recall, Socratic questioning, and Feynman-technique drills powered by AI.

---

## 🌟 Key Features

### 1. 🗺️ AI Cognitive Roadmaps & Study Planner
- **One-Click Curriculum Generation**: Enter any topic (e.g. *Distributed Systems*, *Quantum Computing*, *Rust Memory Safety*, *Microeconomics*), select your target timeframe and difficulty, and AI designs structured milestones and digestible concepts.
- **Checkpoint Tracking**: Mark milestones as *To-Do*, *In Progress*, or *Mastered*.
- **Direct Drill Triggers**: Every concept features a **"Test Understanding"** button that instantly starts an AI interrogation session on that specific topic.

### 2. 🤖 Active Understanding & AI Questioning Engine
Studyland features three distinct cognitive drill modes:
- **Socratic Dialogue Coach**: The AI acts as a patient tutor. Rather than lecturing, it asks probing questions about root motivations, tradeoffs, and failure modes. It scores your answers (0–100%) and identifies conceptual gaps.
- **Feynman Technique Challenge**: Prompt: *"Explain this concept simply without technical jargon as if teaching a 10-year-old."* The AI detects vague buzzwords, highlights missing causal links, provides memorable physical analogies, and poses an ultimate mastery question.
- **Diagnostic Quiz Drill**: Progressive 3-tier active recall test:
  1. *Foundational Concept*
  2. *Real-World Application Scenario*
  3. *Failure Mode & Boundary Condition*  
  Evaluates your answers, explains ideal solutions, and flags missing elements.

### 3. 🧩 Cognitive Gap Matrix
- Whenever an AI interrogation session detects a misconception, unexplained jargon, or missing link, it automatically logs it into your **Gap Matrix**.
- Track your weak spots, review targeted notes, and launch 1-click **"Drill Now"** sessions until the concept is mastered.

### 4. ⏱️ Focus & Pomodoro Study Timer
- Built-in customizable study timer (25 min Focus, 50 min Deep Work, 5 min Rest).
- Web Audio synthetic chimes and celebratory confetti when you hit your daily goals or complete milestones.

### 5. 🔌 Multi-Provider AI Flexibility
Configure your preferred AI engine in **Settings**:
- **Google Gemini**: Supports `gemini-2.0-flash`, `gemini-1.5-flash`, and `gemini-1.5-pro` (generous free tier).
- **OpenAI**: Supports `gpt-4o` and `gpt-4o-mini`.
- **Local Ollama**: 100% free, private, and offline (`llama3.2`, `mistral`, `deepseek-r1`).
- **Zero-Config Smart Simulator**: Works immediately out of the box with realistic Socratic questioning and roadmap synthesis without needing any API keys.

### 6. 🔒 Privacy & Local-First Sovereignty
- All study roadmaps, sessions, knowledge gaps, and API keys are stored safely in your browser (`localStorage`).
- Instant **Export JSON** and **Restore Backup** buttons to safeguard your data.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm / pnpm / yarn

### Run Locally

```bash
# Clone the repository
git clone https://github.com/koryiling/studyland.git
cd studyland

# Install dependencies
npm install

# Start development server
npm run dev
# Or run production build on port 3005:
npm run build
npm run start -- -p 3005
```

Open [http://localhost:3000](http://localhost:3000) (or `http://localhost:3005`) in your browser.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Markdown & Audio**: Marked, Canvas-Confetti, Web Audio API
