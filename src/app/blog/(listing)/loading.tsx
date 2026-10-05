import { BlogListSkeleton } from "@/components/blog/BlogStates";

export default function BlogLoading() {
  return (
    <div className="py-10">
      <BlogListSkeleton />
    </div>
  );
}
