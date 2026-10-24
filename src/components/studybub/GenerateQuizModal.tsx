'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { FriendlyNotice } from "@/components/ui/FriendlyNotice";
import { StudyFile, QuizConfig, QuizQuestion, QuizQuestionType, QuizDifficulty } from '@/types/studybub';
import { generateQuizFromMaterial, AIRequestError } from '@/lib/studybub-ai';
import { formatBytes } from '@/lib/dates';
import { playChimeSound } from '@/lib/utils';

interface GenerateQuizModalProps {
  file: StudyFile;
  onBack: () => void;
  onQuizGenerated: (questions: QuizQuestion[], config: QuizConfig) => void;
}

export function GenerateQuizModal({
  file,
  onBack,
  onQuizGenerated
}: GenerateQuizModalProps) {
  const [questionType, setQuestionType] = useState<QuizQuestionType>('mixed');
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('Normal');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    playChimeSound('ping');

    const config: QuizConfig = {
      fileId: file.id,
      fileName: file.name,
      subject: file.subject,
      category: file.category,
      questionType,
      difficulty,
      questionCount
    };

    try {
      const { questions } = await generateQuizFromMaterial(config, file.textContent);
      playChimeSound('success');
      onQuizGenerated(questions, config);
    } catch (err) {
      setErrorMsg(err instanceof AIRequestError ? err.message : '这次没能出题，请再试一次。');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="p-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#1C2B22] hover:bg-[#EBF5F0] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22] truncate">
          {file.name}
        </h1>
      </div>

      {/* File Info Banner Card (Matching Mockup Screen 4) */}
      <div className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#2F8F5B] flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#1C2B22] truncate">
              {file.name}
            </h2>
            <p className="text-xs text-[#8A9E92] mt-0.5">
              {file.subject} · {formatBytes(file.sizeBytes)}
              {file.pageCount ? ` · ${file.pageCount} ${file.type === 'pptx' ? 'slides' : 'pages'}` : ''}
            </p>
          </div>
        </div>

        {file.extractionWarning && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            {file.extractionWarning}
          </div>
        )}
      </div>

      {/* Settings Form */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-[#1C2B22]">Generate Quiz</h3>
          <p className="text-xs text-[#8A9E92] mt-0.5">
            Choose the settings for your quiz.
          </p>
        </div>

        {/* Question Type */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#1C2B22] uppercase tracking-wider">
            Question Type
          </label>
          <div className="relative">
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuizQuestionType)}
              className="w-full appearance-none p-3.5 pr-10 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm font-semibold text-[#1C2B22] focus:outline-none focus:border-[#2F8F5B]"
            >
              <option value="mixed">Mixed (MCQ + True/False + Short Answer)</option>
              <option value="mcq">Multiple Choice</option>
              <option value="tf">True / False</option>
              <option value="short">Short Answer</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[#8A9E92] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#1C2B22] uppercase tracking-wider">
            Difficulty
          </label>
          <div className="relative">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}
              className="w-full appearance-none p-3.5 pr-10 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm font-semibold text-[#1C2B22] focus:outline-none focus:border-[#2F8F5B]"
            >
              <option value="Normal">Normal</option>
              <option value="Easy">Easy</option>
              <option value="Hard">Hard</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[#8A9E92] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Number of Questions */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#1C2B22] uppercase tracking-wider">
              Number of Questions
            </label>
            <span className="text-sm font-extrabold text-[#2F8F5B] bg-[#EBF5F0] px-3 py-1 rounded-full">
              {questionCount}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {[5, 10, 15, 20].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setQuestionCount(num)}
                className={`py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  questionCount === num
                    ? 'bg-[#2F8F5B] text-white shadow-sm'
                    : 'bg-[#F4F9F5] text-[#607367] hover:bg-[#EBF5F0]'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <FriendlyNotice message={errorMsg} />
        )}

        {/* Big Generate Button (Solid Green #2F8F5B) */}
        <div className="pt-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || Boolean(file.extractionWarning)}
            className="w-full py-4 px-6 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] disabled:opacity-50 text-white font-bold text-sm md:text-base shadow-lg shadow-[#2F8F5B]/25 transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating questions from material...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Quiz</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}

