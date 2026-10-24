'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Target,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Award,
  Loader2,
  Zap
} from 'lucide-react';
import { StudyFile, QuizConfig, QuizQuestion, QuizQuestionType } from '@/types/studybub';
import { generateQuizFromMaterial, analyzePastYearPaper, AIRequestError } from '@/lib/studybub-ai';
import { playChimeSound } from '@/lib/utils';

interface PastYearAnalysisViewProps {
  file: StudyFile;
  onBack: () => void;
  onUpdateFile: (file: StudyFile) => void;
  onStartExamDrill: (questions: QuizQuestion[], config: QuizConfig) => void;
}

export function PastYearAnalysisView({
  file,
  onBack,
  onUpdateFile,
  onStartExamDrill
}: PastYearAnalysisViewProps) {
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [questionType, setQuestionType] = useState<QuizQuestionType>('mixed');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const analysis = file.pastYearAnalysis;
  const isUnreadable = Boolean(file.extractionWarning);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setErrorMsg('');
    try {
      const result = await analyzePastYearPaper(file.textContent, file.name, file.subject);
      onUpdateFile({ ...file, pastYearAnalysis: result });
      playChimeSound('success');
    } catch (err) {
      setErrorMsg(err instanceof AIRequestError ? err.message : '分析失败，请重试。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartSimilarDrill = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    playChimeSound('ping');

    const config: QuizConfig = {
      fileId: file.id,
      fileName: file.name,
      subject: file.subject,
      category: 'past_year',
      questionType,
      difficulty: 'Normal',
      questionCount
    };

    try {
      const { questions } = await generateQuizFromMaterial(config, file.textContent);
      playChimeSound('success');
      onStartExamDrill(questions, config);
    } catch (err) {
      setErrorMsg(err instanceof AIRequestError ? err.message : '生成题目失败，请重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">
      
      {/* Top Bar */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="p-2 rounded-2xl bg-white border border-[#E2EFE7] text-[#1C2B22] hover:bg-[#EBF5F0] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-extrabold text-[#1C2B22] truncate">
              历年真题透视 & 考点仿练
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
              Past Year
            </span>
          </div>
          <p className="text-xs text-[#8A9E92] mt-0.5">
            AI 深度解析历年卷考点，同频高仿同类题库同步刷题
          </p>
        </div>
      </div>

      {/* File Info Card */}
      <div className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#2F8F5B] flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#1C2B22] truncate">
              {file.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#8A9E92] mt-0.5">
              <span>{file.subject}</span>
              {analysis && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-[#2F8F5B]">{analysis.examYear || '历年真题'}</span>
                  {analysis.totalQuestionsDetected > 0 && (
                    <>
                      <span>•</span>
                      <span>识别 {analysis.totalQuestionsDetected} 道原题</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {analysis && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EBF5F0] text-[#2F8F5B] text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>真题考点已解析</span>
          </div>
        )}
      </div>

      {isUnreadable && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          {file.extractionWarning}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!analysis && (
        <div className="p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm text-center space-y-3">
          <p className="text-sm text-[#607367]">
            还没有分析这份试卷。AI 会阅读整份试卷，找出高频考点、常见陷阱和采分建议。
          </p>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || isUnreadable}
            className="px-5 py-2.5 rounded-2xl bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-2"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            <span>{isAnalyzing ? 'AI 正在分析试卷…' : '开始分析试卷'}</span>
          </button>
        </div>
      )}

      {analysis && <>
      {/* SECTION 1: HIGH FREQUENCY TOPICS */}
      <div className="p-6 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[#EBF5F0] text-[#2F8F5B]">
            <Target className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#1C2B22] uppercase tracking-wider">
            历年真题高频命题点分布
          </h3>
        </div>

        <div className="space-y-3">
          {analysis.highFrequencyTopics.map((topicItem, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-[#FAFCF9] border border-[#E2EFE7] space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#1C2B22]">
                  {idx + 1}. {topicItem.topic}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#2F8F5B]">
                  {topicItem.weight}
                </span>
              </div>
              <p className="text-xs text-[#607367] leading-relaxed">
                {topicItem.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: EXAM TRAPS & SCORING TIPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Traps */}
        <div className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              历年常见易错失分陷阱
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-[#607367]">
            {analysis.commonExamTraps.map((trap, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-rose-50/60 p-2.5 rounded-xl border border-rose-100">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                <span>{trap}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Scoring Tips */}
        <div className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-[#2F8F5B]">
            <Award className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              阅卷评分与采分规范建议
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-[#607367]">
            {analysis.scoringStrategyTips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-[#EBF5F0]/60 p-2.5 rounded-xl border border-[#DCEDE4]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F8F5B] mt-1.5 flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      <div className="text-right">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="text-xs font-semibold text-[#8A9E92] hover:text-[#2F8F5B] disabled:opacity-50"
        >
          {isAnalyzing ? 'AI 正在重新分析…' : '重新分析'}
        </button>
      </div>
      </>}

      {/* SECTION 3: GENERATE SIMILAR EXAM DRILL (高仿试卷设置与生成) */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border-2 border-[#2F8F5B]/30 shadow-md space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#2F8F5B]" />
            <h3 className="text-lg font-bold text-[#1C2B22]">
              生成同款高仿预测题库
            </h3>
          </div>
          <p className="text-xs text-[#8A9E92] mt-1">
            AI 将仿照该套真题的题型比例、设问陷阱与采分标准，为您定制一套高仿真试卷进行实战同步演练。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1C2B22] uppercase tracking-wider mb-2">
              题型组合
            </label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuizQuestionType)}
              className="w-full p-3 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-xs font-bold text-[#1C2B22]"
            >
              <option value="mixed">Mixed (单选 + 填空/判断 + 简答大题)</option>
              <option value="mcq">仅生成单选选择题</option>
              <option value="short">仅生成简答与机制分析大题</option>
              <option value="tf">仅生成判断概念题</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C2B22] uppercase tracking-wider mb-2">
              题目数量
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 10, 15, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuestionCount(num)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    questionCount === num
                      ? 'bg-[#2F8F5B] text-white shadow-sm'
                      : 'bg-[#F4F9F5] text-[#607367] hover:bg-[#EBF5F0]'
                  }`}
                >
                  {num} 题
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleStartSimilarDrill}
            disabled={isGenerating || isUnreadable}
            className="w-full py-4 px-6 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] disabled:opacity-50 text-white font-extrabold text-sm md:text-base shadow-lg shadow-[#2F8F5B]/25 transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI 正在分析考点并生成同款高仿题库...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-current" />
                <span>开始做题 · 同步历年高仿试卷（{questionCount}题）</span>
              </>
            )}
          </button>
          {errorMsg && !isAnalyzing && (
            <p className="text-xs text-rose-600 mt-2 text-center">{errorMsg}</p>
          )}
        </div>
      </div>

    </div>
  );
}

