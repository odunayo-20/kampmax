import { ArticleEditor } from "@/components/admin/blog/ArticleEditor";

export const metadata = { title: "Edit article" };

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArticleEditor articleId={id} />;
}
