'use client';

import React from 'react';
import { Home, FolderClosed, CalendarCheck2, User, Sparkles } from 'lucide-react';
import { StudyBubMascot } from '@/components/ui/StudyBubMascot';

export type TabType = 'home' | 'files' | 'plan' | 'profile';

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export function Navigation({ activeTab, onChangeTab }: NavigationProps) {
  return (
    <>
      {/* Desktop Top Header Bar */}
      <header className="hidden md:block sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2EFE7] shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            onClick={() => onChangeTab('home')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <StudyBubMascot mood="icon" size={38} />
            <div>
              <span className="font-extrabold text-xl tracking-tight text-[#1C2B22]">
                StudyBub
              </span>
              <span className="text-[10px] text-[#2F8F5B] font-semibold tracking-wider uppercase block -mt-1">
                Upload · Learn · Grow
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'files', label: 'My Files', icon: FolderClosed },
              { id: 'plan', label: 'Study Plan', icon: CalendarCheck2 },
              { id: 'profile', label: 'Profile', icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onChangeTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[#2F8F5B] text-white shadow-md shadow-[#2F8F5B]/20'
                      : 'text-[#607367] hover:text-[#1C2B22] hover:bg-[#EBF5F0]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Matching Mockup) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2EFE7] shadow-lg px-4 py-2 flex items-center justify-around">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'files', label: 'Files', icon: FolderClosed },
          { id: 'plan', label: 'Plan', icon: CalendarCheck2 },
          { id: 'profile', label: 'Profile', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id as TabType)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
                isActive ? 'text-[#2F8F5B] font-bold' : 'text-[#8A9E92] font-medium'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'bg-[#EBF5F0]' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="text-[11px]">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
