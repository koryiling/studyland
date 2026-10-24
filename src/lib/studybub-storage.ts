// Cloud data layer (Supabase). Every row belongs to the signed-in user and Row Level
// Security (supabase/schema.sql) makes sure users can only read and write their own rows.
// Everything the UI reads or writes goes through `db` below.

import { StudyFile, StudyTask, MistakeItem, QuizResult, StudyNote } from '@/types/studybub';
import { createClient } from '@/lib/supabase/client';

type Collection = 'files' | 'notes' | 'quizResults' | 'mistakes' | 'tasks';

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
      await fileRecords.delete(id);
    },
  },
  quizResults: collection<QuizResult>('quizResults'),
  mistakes: collection<MistakeItem>('mistakes'),
  tasks: collection<StudyTask>('tasks'),
  notes: collection<StudyNote>('notes'),
};

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
