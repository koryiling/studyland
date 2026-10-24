// One group of messages in all three languages. The English keys are the source of truth:
// a key missing from `zh` or `ms` (or an extra one) is a type error.
export function defineMessages<const E extends Record<string, string>>(m: {
  en: E;
  zh: Record<keyof E, string>;
  ms: Record<keyof E, string>;
}) {
  return m;
}
