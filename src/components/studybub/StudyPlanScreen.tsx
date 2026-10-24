'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Flame,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StudyTask } from '@/types/studybub';
import { newId } from '@/lib/studybub-storage';
import { fromDayKey, toDayKey, todayKey, weekDays } from '@/lib/dates';
import { playChimeSound, triggerConfetti } from '@/lib/utils';

interface StudyPlanScreenProps {
  tasks: StudyTask[];
  streakDays: number;
  onSaveTask: (task: StudyTask) => void;
  onDeleteTask: (taskId: string) => void;
  onStartQuizForTask?: (task: StudyTask) => void;
}

export function StudyPlanScreen({
  tasks,
  streakDays,
  onSaveTask,
  onDeleteTask,
  onStartQuizForTask
}: StudyPlanScreenProps) {
  const today = todayKey();
  const [selectedDay, setSelectedDay] = useState<string>(today);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('General');
  const [newTaskCount, setNewTaskCount] = useState(10);
  const [newTaskMinutes, setNewTaskMinutes] = useState(15);

  const days = weekDays(selectedDay);
  const dayTasks = tasks.filter(t => t.date === selectedDay);
  const daysWithTasks = new Set(tasks.map(t => t.date));

  const shiftWeek = (deltaDays: number) => {
    const d = fromDayKey(selectedDay);
    d.setDate(d.getDate() + deltaDays);
    setSelectedDay(toDayKey(d));
  };

  const toggleTask = (task: StudyTask) => {
    const nextState = !task.completed;
    if (nextState) {
      playChimeSound('success');
      triggerConfetti();
    } else {
      playChimeSound('ping');
    }
    onSaveTask({
      ...task,
      completed: nextState,
      completedAt: nextState ? new Date().toISOString() : undefined
    });
  };

  const deleteTask = (taskId: string) => {
    onDeleteTask(taskId);
    playChimeSound('ping');
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    onSaveTask({
      id: newId('task'),
      title: newTaskTitle.trim(),
      subject: newTaskSubject,
      date: selectedDay,
      questionCount: newTaskCount,
      estimatedMinutes: newTaskMinutes,
      completed: false,
      createdAt: new Date().toISOString()
    });
    setNewTaskTitle('');
    setIsAddingTask(false);
    playChimeSound('success');
  };

  const completedCount = dayTasks.filter(t => t.completed).length;
  const selectedLabel = selectedDay === today
    ? "Today's Tasks"
    : fromDayKey(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6 pb-20 md:pb-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-extrabold text-[#1C2B22]">
          Study Plan
        </h1>

        <button
          onClick={() => setIsAddingTask(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#2F8F5B] hover:bg-[#26774B] text-white text-xs font-bold shadow-md shadow-[#2F8F5B]/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Week Calendar Bar (Matching Screen 9 in Mockup) */}
      <div className="p-4 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#607367]">
          <button onClick={() => shiftWeek(-7)} className="p-1 rounded-lg hover:bg-[#EBF5F0]" title="Previous week">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>{fromDayKey(days[0].key).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => shiftWeek(7)} className="p-1 rounded-lg hover:bg-[#EBF5F0]" title="Next week">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {days.map((d) => {
            const isSelected = selectedDay === d.key;
            return (
              <button
                key={d.key}
                onClick={() => setSelectedDay(d.key)}
                className={`py-2 rounded-2xl flex flex-col items-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-[#2F8F5B] text-white shadow-md shadow-[#2F8F5B]/20'
                    : 'text-[#607367] hover:bg-[#EBF5F0]'
                }`}
              >
                <span className="text-[10px] font-semibold">{d.weekday}</span>
                <span className={`text-sm md:text-base font-extrabold ${isSelected ? 'text-white' : d.key === today ? 'text-[#2F8F5B]' : 'text-[#1C2B22]'}`}>
                  {d.date}
                </span>
                <span className={`w-1 h-1 rounded-full ${daysWithTasks.has(d.key) ? (isSelected ? 'bg-white' : 'bg-[#2F8F5B]') : 'bg-transparent'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Task Inline Form */}
      {isAddingTask && (
        <form onSubmit={handleAddTask} className="p-5 rounded-3xl bg-white border-2 border-[#2F8F5B] shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1C2B22]">New Study Task</h3>
            <button
              type="button"
              onClick={() => setIsAddingTask(false)}
              className="text-xs text-[#8A9E92] hover:text-[#1C2B22]"
            >
              Cancel
            </button>
          </div>

          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="e.g. Biology Cell Membrane Review"
            className="w-full p-3 rounded-2xl bg-[#F4F9F5] border border-[#E2EFE7] text-sm text-[#1C2B22] focus:outline-none focus:border-[#2F8F5B]"
          />

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[#8A9E92] mb-1 font-bold">Subject</label>
              <select
                value={newTaskSubject}
                onChange={(e) => setNewTaskSubject(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#F4F9F5] border border-[#E2EFE7] text-[#1C2B22] font-semibold"
              >
                <option value="Biology">Biology</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Math">Math</option>
                <option value="English">English</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block text-[#8A9E92] mb-1 font-bold">Questions</label>
              <input
                type="number"
                min="5"
                max="50"
                value={newTaskCount}
                onChange={(e) => setNewTaskCount(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-[#F4F9F5] border border-[#E2EFE7] text-[#1C2B22] font-bold"
              />
            </div>

            <div>
              <label className="block text-[#8A9E92] mb-1 font-bold">Est. Minutes</label>
              <input
                type="number"
                min="5"
                max="120"
                value={newTaskMinutes}
                onChange={(e) => setNewTaskMinutes(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-[#F4F9F5] border border-[#E2EFE7] text-[#1C2B22] font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#2F8F5B] hover:bg-[#26774B] text-white text-xs font-bold shadow-md shadow-[#2F8F5B]/20"
            >
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* Today's Tasks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1C2B22] uppercase tracking-wider">
            {selectedLabel}
          </h2>
          {dayTasks.length > 0 && (
            <span className="text-xs font-bold text-[#2F8F5B]">
              {completedCount} / {dayTasks.length} completed
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {dayTasks.length === 0 && (
            <div className="p-6 rounded-3xl bg-white border border-dashed border-[#C8E3D3] text-center text-xs text-[#8A9E92]">
              No tasks for this day. Tap <span className="font-bold text-[#2F8F5B]">Add Task</span> to plan one.
            </div>
          )}
          {dayTasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-3xl border transition-all flex items-center justify-between gap-3 ${
                task.completed
                  ? 'bg-white border-[#E2EFE7] opacity-80'
                  : 'bg-white border-[#E2EFE7] shadow-sm hover:border-[#2F8F5B]'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <button
                  type="button"
                  onClick={() => toggleTask(task)}
                  className="flex-shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-[#2F8F5B] fill-[#EBF5F0]" />
                  ) : (
                    <Circle className="w-6 h-6 text-[#C8E3D3] hover:text-[#2F8F5B] transition-colors" />
                  )}
                </button>

                <div className="min-w-0">
                  <h3 className={`text-sm md:text-base font-bold truncate ${task.completed ? 'text-[#8A9E92] line-through' : 'text-[#1C2B22]'}`}>
                    {task.title}
                  </h3>
                  <p className="text-xs text-[#8A9E92] mt-0.5">
                    {task.questionCount} questions · {task.estimatedMinutes} min
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!task.completed && onStartQuizForTask && (
                  <button
                    onClick={() => onStartQuizForTask(task)}
                    className="px-3 py-1.5 rounded-xl bg-[#EBF5F0] hover:bg-[#2F8F5B] hover:text-white text-[#2F8F5B] text-xs font-bold transition-all"
                  >
                    Start
                  </button>
                )}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1.5 rounded-xl text-[#8A9E92] hover:text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Study Streak Card (Screen 9 in Mockup) */}
      <div className="p-5 rounded-3xl bg-white border border-[#E2EFE7] shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6 fill-current animate-pulse" />
          </div>
          <div>
            <div className="text-base font-bold text-[#1C2B22]">
              Study Streak
            </div>
            <div className="text-xs text-[#8A9E92]">
              {streakDays > 0
                ? `${streakDays} day${streakDays > 1 ? 's' : ''} of consistent progress! 🌿`
                : 'Finish a quiz or task today to start your streak 🌱'}
            </div>
          </div>
        </div>

        <span className="text-sm font-extrabold text-[#D97706] bg-[#FEF3C7] px-3 py-1 rounded-full">
          🔥 {streakDays} {streakDays === 1 ? 'day' : 'days'}
        </span>
      </div>

    </div>
  );
}

