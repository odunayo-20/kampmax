/** What a followed store has been up to, for its row in the followed list. */
export function newItemsText(count: number): string {
  if (count <= 0) return "Nothing new this week";
  return count === 1 ? "1 new item this week" : `${count.toLocaleString("en-NG")} new items this week`;
}
