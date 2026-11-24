/** FAQs whose question or answer contains every word typed. Everything when nothing is typed. The same rule as the mobile app's help screen. */
export function searchFaq<T extends { question: string; answer: string }>(items: T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items;
  return items.filter((f) => {
    const hay = `${f.question} ${f.answer}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
