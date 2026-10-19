'use client';

import React, { useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export function MarkdownView({ content, className = '' }: MarkdownViewProps) {
  const html = useMemo(() => {
    try {
      marked.setOptions({
        gfm: true,
        breaks: true,
      });
      return marked.parse(content || '') as string;
    } catch (err) {
      return content;
    }
  }, [content]);

  return (
    <div
      className={`prose prose-invert max-w-none text-slate-200 leading-relaxed 
        [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
        [&_li]:mb-1 [&_strong]:text-indigo-300 [&_strong]:font-semibold
        [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-3
        [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-2
        [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-indigo-200 [&_h3]:mb-2
        [&_code]:bg-slate-800 [&_code]:text-emerald-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
        [&_pre]:bg-slate-900/90 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-800 [&_pre]:overflow-x-auto [&_pre]:mb-3
        [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-400
        ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

