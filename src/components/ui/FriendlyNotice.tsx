'use client';

import React from 'react';
import { StudyBubMascot } from '@/components/ui/StudyBubMascot';

// Gentle message box for things that didn't work (AI busy, network, etc.).
// Studyland talks like a study buddy, so problems are shown calmly, not as alarms.
export function FriendlyNotice({ message, className = '' }: { message: string; className?: string }) {
  return (
    <div role="status" className={`p-3 rounded-2xl bg-[#FFF8EC] border border-[#F6E3BF] text-[#7A5A1E] text-xs flex items-start gap-2.5 ${className}`}>
      <div className="flex-shrink-0 -my-1">
        <StudyBubMascot mood="icon" size={28} />
      </div>
      <span className="leading-relaxed pt-0.5">{message}</span>
    </div>
  );
}
