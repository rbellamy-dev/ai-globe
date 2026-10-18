/**
 * A per-visit cap on typed questions, so one visitor can't run up the API
 * bill. It lives in sessionStorage: a courtesy limit, not security.
 */
export const QUESTIONS_PER_VISIT = 20;
const KEY = "ask-the-planet:questions";

const read = () => {
  try {
    return Number(sessionStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
};

export const questionsLeft = () => Math.max(0, QUESTIONS_PER_VISIT - read());

export function countQuestion() {
  try {
    sessionStorage.setItem(KEY, String(read() + 1));
  } catch {
    // Storage blocked (private mode): no cap, which is fine.
  }
}
