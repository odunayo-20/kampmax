/**
 * Renders the article body. The HTML is produced and sanitized by the backend
 * (markdown -> allow-listed HTML) on every save, so it is safe to inject.
 * Typography lives in the `.blog-prose` rules in globals.css.
 */
export function ArticleContent({ html }: { html: string }) {
  return <div className="blog-prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
