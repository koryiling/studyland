// All UI and server messages, merged from the groups in ./parts.
import { common } from './parts/common';
import { auth } from './parts/auth';
import { home } from './parts/home';
import { upload } from './parts/upload';
import { files } from './parts/files';
import { notes } from './parts/notes';
import { quiz } from './parts/quiz';
import { pastYear } from './parts/pastYear';
import { plan } from './parts/plan';
import { journey } from './parts/journey';
import { profile } from './parts/profile';
import { admin } from './parts/admin';
import { server } from './parts/server';
import { pictures } from './parts/pictures';

const groups = [common, auth, home, upload, files, notes, quiz, pastYear, plan, journey, profile, admin, server, pictures] as const;

type Group = (typeof groups)[number];
type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;
type AllEn = UnionToIntersection<Group['en']>;

export type MessageKey = keyof AllEn & string;

function merge(lang: 'en' | 'zh' | 'ms'): Record<MessageKey, string> {
  return Object.assign({}, ...groups.map((g) => g[lang])) as Record<MessageKey, string>;
}

export const en = merge('en');
export const zh = merge('zh');
export const ms = merge('ms');
