import type { Metadata } from "next";

// The pages themselves are client components, so their title is set here.
export const metadata: Metadata = { title: "Log in" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
