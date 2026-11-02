import MainLayout from "@/app/(main)/layout";

// The public freelancer pages live outside the (main) route group, so they don't get
// its header, bottom navigation and footer on their own. Reuse that shell here.
// (Moving this folder to app/(main)/freelancers would do the same and make this
// file unnecessary.)
export default function FreelancersLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
