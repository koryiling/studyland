// UTAR GPA / CGPA. GPA = Σ(grade point × credit hours) / Σ credit hours.
// Pass/Fail and exempted subjects are left out of both GPA and CGPA.
import type { GradeLetter, Semester, SemesterCourse } from '@/types/studybub';

export const GRADE_POINTS: Record<GradeLetter, number> = {
  'A+': 4.0,
  A: 4.0,
  'A-': 3.67,
  'B+': 3.33,
  B: 3.0,
  'B-': 2.67,
  'C+': 2.33,
  C: 2.0,
  F: 0,
};

export const GRADE_LETTERS = Object.keys(GRADE_POINTS) as GradeLetter[];

const isGradeLetter = (g: unknown): g is GradeLetter => typeof g === 'string' && g in GRADE_POINTS;

interface Totals {
  points: number;
  credits: number;
}

const gpaOf = (t: Totals): number | null => (t.credits > 0 ? t.points / t.credits : null);

function add(t: Totals, course: SemesterCourse, grade: unknown): Totals {
  if (course.passFail || !isGradeLetter(grade) || !(course.creditHours > 0)) return t;
  return { points: t.points + GRADE_POINTS[grade] * course.creditHours, credits: t.credits + course.creditHours };
}

const EMPTY: Totals = { points: 0, credits: 0 };

// Released results only
export function semesterTotals(semester: Semester): Totals {
  return semester.courses.reduce((t, c) => add(t, c, c.result), EMPTY);
}

export function semesterGpa(semester: Semester): number | null {
  return gpaOf(semesterTotals(semester));
}

// GPA if every graded subject gets its result, or its target where no result is out yet
export function semesterTargetGpa(semester: Semester): number | null {
  return gpaOf(semester.courses.reduce((t, c) => add(t, c, c.result ?? c.targetGrade), EMPTY));
}

export function cgpa(semesters: Semester[]): number | null {
  return gpaOf(semesters.reduce((t, s) => {
    const st = semesterTotals(s);
    return { points: t.points + st.points, credits: t.credits + st.credits };
  }, EMPTY));
}

export function countedCredits(semesters: Semester[]): number {
  return semesters.reduce((sum, s) => sum + semesterTotals(s).credits, 0);
}

// CGPA once the current semester ends with its targets met
export function projectedCgpa(semesters: Semester[], current: Semester): number | null {
  const others = semesters.filter((s) => s.id !== current.id).reduce((t, s) => {
    const st = semesterTotals(s);
    return { points: t.points + st.points, credits: t.credits + st.credits };
  }, EMPTY);
  const cur = current.courses.reduce((t, c) => add(t, c, c.result ?? c.targetGrade), EMPTY);
  return gpaOf({ points: others.points + cur.points, credits: others.credits + cur.credits });
}

// GPA the current semester needs so the CGPA reaches `target`. null if there is nothing to plan with.
export function requiredGpa(semesters: Semester[], current: Semester, target: number): number | null {
  const others = semesters.filter((s) => s.id !== current.id).reduce((t, s) => {
    const st = semesterTotals(s);
    return { points: t.points + st.points, credits: t.credits + st.credits };
  }, EMPTY);
  const credits = current.courses.filter((c) => !c.passFail && c.creditHours > 0).reduce((s, c) => s + c.creditHours, 0);
  if (credits === 0) return null;
  return (target * (others.credits + credits) - others.points) / credits;
}

export function formatGpa(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : value.toFixed(2);
}

// A short, encouraging line about where the student stands
export function encouragement(semesters: Semester[], current: Semester | null): string {
  const now = cgpa(semesters);
  if (!current) {
    return now === null ? '先加一个学期和科目，我们就能帮你算 GPA 和 CGPA 🌱' : `目前 CGPA ${formatGpa(now)}，继续保持，你做得很好 🌿`;
  }
  const projected = projectedCgpa(semesters, current);
  const hasTargets = current.courses.some((c) => !c.passFail && c.targetGrade && !c.result);
  if (current.targetCgpa) {
    const need = requiredGpa(semesters, current, current.targetCgpa);
    if (need !== null) {
      // C (2.00) is the lowest passing grade, so a need at or below it just means "pass everything"
      if (need <= GRADE_POINTS.C) {
        return `只要每科都及格（C 以上），CGPA 目标 ${current.targetCgpa.toFixed(2)} 就稳稳在手了${
          projected !== null && hasTargets ? `；照你的目标成绩，CGPA 会到 ${formatGpa(projected)}` : ''
        } 🎉`;
      }
      if (need > 4) {
        return `这学期就算全拿 A，CGPA 最多也到 ${formatGpa(requiredCeiling(semesters, current))}。先把目标定在这附近，一步一步来，下学期继续追 💪`;
      }
      return `这学期 GPA 拿到 ${need.toFixed(2)}，CGPA 就能达到 ${current.targetCgpa.toFixed(2)}。按计划每天进步一点，你可以的 💪`;
    }
  }
  if (hasTargets && projected !== null) {
    return now === null
      ? `照你的目标成绩，这学期 GPA 会是 ${formatGpa(semesterTargetGpa(current))}，加油 🌱`
      : `照你的目标成绩，CGPA 会从 ${formatGpa(now)} 变成 ${formatGpa(projected)}，加油 🌱`;
  }
  return '给每个科目定一个目标成绩，我们帮你算出 CGPA 会到多少 ✨';
}

function requiredCeiling(semesters: Semester[], current: Semester): number | null {
  const allA: Semester = {
    ...current,
    courses: current.courses.map((c) => ({ ...c, result: c.result ?? (c.passFail ? undefined : 'A') })),
  };
  return cgpa(semesters.map((s) => (s.id === current.id ? allA : s)).concat(semesters.some((s) => s.id === current.id) ? [] : [allA]));
}
