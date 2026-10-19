'use client';

import React from 'react';

interface StudyBubMascotProps {
  mood?: 'reading' | 'happy' | 'waving' | 'icon';
  size?: number;
  className?: string;
}

export function StudyBubMascot({
  mood = 'reading',
  size = 120,
  className = ''
}: StudyBubMascotProps) {
  if (mood === 'icon') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Leaf sprout on top */}
        <path
          d="M50 24 C46 12 36 12 35 18 C34 24 45 28 50 32 C55 28 66 24 65 18 C64 12 54 12 50 24 Z"
          fill="#2F8F5B"
        />
        <path
          d="M50 32 V24"
          stroke="#26774B"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Head/Body */}
        <rect
          x="20"
          y="30"
          width="60"
          height="55"
          rx="27"
          fill="#A7D7B5"
          stroke="#2F8F5B"
          strokeWidth="3.5"
        />

        {/* Eyes */}
        <circle cx="38" cy="52" r="3.5" fill="#1C2B22" />
        <circle cx="62" cy="52" r="3.5" fill="#1C2B22" />

        {/* Eye catchlights */}
        <circle cx="37" cy="51" r="1.2" fill="#FFFFFF" />
        <circle cx="61" cy="51" r="1.2" fill="#FFFFFF" />

        {/* Blush */}
        <ellipse cx="32" cy="59" rx="4" ry="2" fill="#FFB7B2" opacity="0.8" />
        <ellipse cx="68" cy="59" rx="4" ry="2" fill="#FFB7B2" opacity="0.8" />

        {/* Cute Smile */}
        <path
          d="M45 58 Q50 63 55 58"
          stroke="#1C2B22"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (mood === 'happy') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 140 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Sparkle Stars */}
        <path
          d="M25 35 L27 42 L34 44 L27 46 L25 53 L23 46 L16 44 L23 42 Z"
          fill="#F59E0B"
        />
        <path
          d="M115 30 L117 36 L123 38 L117 40 L115 46 L113 40 L107 38 L113 36 Z"
          fill="#F59E0B"
        />

        {/* Little top Sprout Leaves */}
        <path
          d="M70 20 C64 6 48 8 48 16 C48 24 64 28 70 34 C76 28 92 24 92 16 C92 8 76 6 70 20 Z"
          fill="#2F8F5B"
        />
        <path
          d="M70 34 V20"
          stroke="#26774B"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Rounded Body */}
        <path
          d="M32 75 C32 45 50 34 70 34 C90 34 108 45 108 75 C108 105 95 118 70 118 C45 118 32 105 32 75 Z"
          fill="#A7D7B5"
          stroke="#2F8F5B"
          strokeWidth="4"
        />

        {/* Happy Curved Closed Eyes */}
        <path
          d="M50 62 Q56 54 62 62"
          stroke="#1C2B22"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M78 62 Q84 54 90 62"
          stroke="#1C2B22"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Rosy Blush */}
        <ellipse cx="44" cy="72" rx="6" ry="3.5" fill="#FFB7B2" opacity="0.9" />
        <ellipse cx="96" cy="72" rx="6" ry="3.5" fill="#FFB7B2" opacity="0.9" />

        {/* Wide Happy Smile */}
        <path
          d="M62 72 Q70 82 78 72"
          stroke="#1C2B22"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="#E76F51"
        />

        {/* Raised Little Arms */}
        <path
          d="M35 76 Q20 62 18 52"
          stroke="#2F8F5B"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M105 76 Q120 62 122 52"
          stroke="#2F8F5B"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Default: Reading Book mascot
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Decorative little sparkle */}
      <path
        d="M110 32 L112 37 L117 39 L112 41 L110 46 L108 41 L103 39 L108 37 Z"
        fill="#F59E0B"
      />

      {/* Sprout on head */}
      <path
        d="M70 22 C64 10 50 12 50 19 C50 26 64 29 70 35 C76 29 90 26 90 19 C90 12 76 10 70 22 Z"
        fill="#2F8F5B"
      />
      <path
        d="M70 35 V22"
        stroke="#26774B"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Mascot Body */}
      <path
        d="M36 72 C36 44 50 35 70 35 C90 35 104 44 104 72 C104 100 92 114 70 114 C48 114 36 100 36 72 Z"
        fill="#A7D7B5"
        stroke="#2F8F5B"
        strokeWidth="4"
      />

      {/* Eyes */}
      <ellipse cx="56" cy="62" rx="4" ry="5.5" fill="#1C2B22" />
      <ellipse cx="84" cy="62" rx="4" ry="5.5" fill="#1C2B22" />

      {/* Eye shine */}
      <circle cx="54.5" cy="60" r="1.5" fill="#FFFFFF" />
      <circle cx="82.5" cy="60" r="1.5" fill="#FFFFFF" />

      {/* Cheek Blush */}
      <ellipse cx="46" cy="70" rx="5.5" ry="3" fill="#FFB7B2" opacity="0.85" />
      <ellipse cx="94" cy="70" rx="5.5" ry="3" fill="#FFB7B2" opacity="0.85" />

      {/* Friendly Smile */}
      <path
        d="M64 70 Q70 76 76 70"
        stroke="#1C2B22"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Open Book held in hands */}
      <g transform="translate(42, 80)">
        {/* Book Cover */}
        <path
          d="M28 8 L4 4 C2 3.8 0 5.4 0 7.5 L0 26 C0 27.5 1.5 28.5 28 32 C54.5 28.5 56 27.5 56 26 L56 7.5 C56 5.4 54 3.8 52 4 L28 8 Z"
          fill="#2F8F5B"
          stroke="#1F6941"
          strokeWidth="2"
        />
        {/* Book Pages */}
        <path
          d="M28 7 L6 3.5 C4.5 3.3 3 4.5 3 6 L3 23 C15 25 24 26 28 27 C32 26 41 25 53 23 L53 6 C53 4.5 51.5 3.3 50 3.5 L28 7 Z"
          fill="#FFFFFF"
        />
        {/* Center Spine */}
        <line x1="28" y1="7" x2="28" y2="28" stroke="#D1E7DD" strokeWidth="2" />
        {/* Text lines in book */}
        <line x1="8" y1="9" x2="23" y2="11" stroke="#9BBCA8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="14" x2="21" y2="16" stroke="#9BBCA8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="33" y1="11" x2="48" y2="9" stroke="#9BBCA8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="35" y1="16" x2="48" y2="14" stroke="#9BBCA8" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Little green hands holding book */}
      <circle cx="43" cy="94" r="5" fill="#88C49B" stroke="#2F8F5B" strokeWidth="2.5" />
      <circle cx="97" cy="94" r="5" fill="#88C49B" stroke="#2F8F5B" strokeWidth="2.5" />
    </svg>
  );
}
