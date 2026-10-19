# StudyBub 🌿📚
> **Upload · Learn · Grow** — Clean, beginner-friendly AI study planning and quiz generator.

StudyBub allows students to upload their school files (**PDF**, **PPTX**, and **DOCX**), extracts readable text, and automatically generates interactive quizzes and exams strictly grounded in their actual course material.

---

## 🎨 Design Philosophy
- **Primary Green**: `#2F8F5B`
- **Background**: Soft Mint Green (`#F4F9F5`) with crisp white rounded cards
- **Vibe**: Calming, modern, cute, and distraction-free
- **Mascot**: Friendly little sprout creature reading a book
- **Device Support**: Fully responsive on mobile and desktop

---

## 🚀 Key User Flow
1. **Upload School Files**: Drag & drop or pick any `.pdf`, `.pptx`, or `.docx` lecture slide or note.
2. **AI Reading**: Text is extracted locally using `jszip` and server-side parsers.
3. **Generate Quiz**: Select question types (*Multiple Choice*, *True/False*, *Short Answer*, or *Mixed*), difficulty (*Easy*, *Normal*, *Hard*), and question count (*5, 10, 15, 20*).
4. **Answer & Immediate Feedback**: Interactive questions one by one with instant explanations grounded in your uploaded text. Short answers are evaluated by AI with concrete tips on how to improve.
5. **Review Mistakes & Save Tasks**: Incorrect questions are automatically saved to your **Mistake Notebook**, and 1-click follow-up tasks can be added to your **Study Plan**.

---

## 📱 Navigation Sections
- **Home**: Greeting ("*Hi! Let's make progress today!*"), today's quiz progress, prominent action buttons (*Upload Materials*, *Create Quiz*, *My Files*), continue learning card, and recent files.
- **My Files**: Filter by *All*, *PDF*, *PPTX*, *DOCX*, view extracted text, or trigger a quiz.
- **Study Plan**: Weekly calendar bar, daily tasks checklist, and 3-day study streak.
- **Profile**: Accuracy rate, total questions answered, Mistake Notebook, and AI settings (Gemini, OpenAI, Ollama, Smart Simulator).

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
