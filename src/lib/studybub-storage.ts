// Cloud data layer (Supabase). Every row belongs to the signed-in user and Row Level
// Security (supabase/schema.sql) makes sure users can only read and write their own rows.
// Everything the UI reads or writes goes through `db` below.

import type { FileImage, StudyFile, StudyTask, MistakeItem, QuizResult, StudyNote, Semester, StudyEvent, FocusSession, SubjectAnalysis } from '@/types/studybub';
import { createClient } from '@/lib/supabase/client';

type Collection = 'files' | 'notes' | 'quizResults' | 'mistakes' | 'tasks' | 'semesters' | 'events' | 'focusSessions' | 'analyses';

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function collection<T extends { id: string }>(name: Collection) {
  const table = () => createClient().from('user_records');
  return {
    list: async (): Promise<T[]> => {
      const rows = check(await table().select('data').eq('collection', name));
      return (rows || []).map((r: { data: T }) => r.data);
    },
    put: async (item: T): Promise<T> => {
      check(
        await table().upsert(
          { collection: name, id: item.id, data: item, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,collection,id' }
        )
      );
      return item;
    },
    delete: async (id: string): Promise<void> => {
      check(await table().delete().eq('collection', name).eq('id', id));
    },
  };
}

const fileRecords = collection<StudyFile>('files');

export const db = {
  files: {
    // File list without the (possibly large) extracted text; use loadText() before reading it
    list: async (): Promise<StudyFile[]> =>
      (await fileRecords.list()).map((f) => ({ ...f, textContent: '' })),
    loadText: async (file: StudyFile): Promise<StudyFile> => {
      if (file.textContent) return file;
      const row = check(
        await createClient().from('file_texts').select('text_content').eq('file_id', file.id).maybeSingle()
      );
      return { ...file, textContent: row?.text_content || '' };
    },
    put: async (file: StudyFile): Promise<StudyFile> => {
      const { textContent, ...meta } = file;
      if (textContent) {
        check(
          await createClient()
            .from('file_texts')
            .upsert(
              { file_id: file.id, text_content: textContent, updated_at: new Date().toISOString() },
              { onConflict: 'user_id,file_id' }
            )
        );
      }
      await fileRecords.put({ ...meta, textContent: '' } as StudyFile);
      return file;
    },
    delete: async (id: string): Promise<void> => {
      check(await createClient().from('file_texts').delete().eq('file_id', id));
      check(await createClient().from('file_images').delete().eq('file_id', id));
      await fileRecords.delete(id);
    },
  },
  // Pictures of a file, loaded only when a quiz with picture questions is made
  fileImages: {
    list: async (fileId: string): Promise<FileImage[]> => {
      const rows = check(await createClient().from('file_images').select('idx, source, data').eq('file_id', fileId).order('idx'));
      return (rows || []) as FileImage[];
    },
    putAll: async (fileId: string, images: FileImage[]): Promise<void> => {
      if (images.length === 0) return;
      check(
        await createClient()
          .from('file_images')
          .upsert(
            images.map((img) => ({ file_id: fileId, idx: img.idx, source: img.source, data: img.data })),
            { onConflict: 'user_id,file_id,idx' }
          )
      );
    },
  },
  quizResults: collection<QuizResult>('quizResults'),
  mistakes: collection<MistakeItem>('mistakes'),
  tasks: collection<StudyTask>('tasks'),
  notes: collection<StudyNote>('notes'),
  semesters: collection<Semester>('semesters'),
  events: collection<StudyEvent>('events'),
  focusSessions: collection<FocusSession>('focusSessions'),
  analyses: collection<SubjectAnalysis>('analyses'),
};

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
