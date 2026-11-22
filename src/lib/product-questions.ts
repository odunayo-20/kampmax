/** The rules for product questions, matching the backend's question-policy and the mobile app. */

export const QUESTION_MIN = 10;
export const QUESTION_MAX = 300;
export const ANSWER_MAX = 1000;

/** Collapses stray whitespace, the same way the server does before it saves. */
export function tidyQuestion(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** What is wrong with a question, or null when it can be sent. */
export function questionProblem(text: string): string | null {
  const q = tidyQuestion(text);
  if (q.length < QUESTION_MIN) return `Write at least ${QUESTION_MIN} characters so the seller can answer`;
  if (q.length > QUESTION_MAX) return `Keep the question under ${QUESTION_MAX} characters`;
  return null;
}

/** What is wrong with an answer, or null when it can be posted. */
export function answerProblem(text: string): string | null {
  const a = text.trim();
  if (!a) return "Write an answer";
  if (a.length > ANSWER_MAX) return `Keep the answer under ${ANSWER_MAX} characters`;
  return null;
}

/** "3 questions", "1 question". */
export function questionsCount(count: number): string {
  return count === 1 ? "1 question" : `${count.toLocaleString("en-NG")} questions`;
}
