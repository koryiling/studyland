'use client';

import React, { useMemo } from 'react';
import { Marked } from 'marked';
import DOMPurify from 'dompurify';

const markdown = new Marked({ gfm: true, breaks: false });

interface MarkdownViewProps {
  content: string;
  className?: string;
}

// Renders AI-written Markdown. Output is sanitized because it comes from a model.
export function MarkdownView({ content, className = '' }: MarkdownViewProps) {
  const html = useMemo(
    () => DOMPurify.sanitize(markdown.parse(content || '', { async: false }), { FORBID_TAGS: ['img', 'style'] }),
    [content]
  );

  return (
    <div
      className={`text-sm text-[#1C2B22] leading-relaxed break-words
        [&_h1]:text-xl [&_h1]:font-extrabold [&_h1]:mt-5 [&_h1]:mb-2
        [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-[#2F8F5B] [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:pb-1 [&_h2]:border-b [&_h2]:border-[#E2EFE7]
        [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-1.5
        [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
        [&_li]:my-1 [&_strong]:font-bold [&_strong]:text-[#1C2B22]
        [&_code]:bg-[#F4F9F5] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[13px]
        [&_pre]:bg-[#F4F9F5] [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-3
        [&_blockquote]:border-l-4 [&_blockquote]:border-[#C8E3D3] [&_blockquote]:pl-3 [&_blockquote]:text-[#607367]
        [&_table]:w-full [&_table]:my-3 [&_table]:text-xs [&_table]:border-collapse [&_table]:block [&_table]:overflow-x-auto
        [&_th]:bg-[#EBF5F0] [&_th]:font-bold [&_th]:text-left [&_th]:p-2 [&_th]:border [&_th]:border-[#E2EFE7]
        [&_td]:p-2 [&_td]:border [&_td]:border-[#E2EFE7] [&_td]:align-top
        [&_hr]:my-5 [&_hr]:border-[#E2EFE7]
        ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
