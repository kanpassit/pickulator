import type { Metadata } from "next";

// Page client components can't export metadata, so each route gets its own
// title here. Distinct titles let screen readers (and Next's route announcer)
// tell people which screen they landed on.
export const metadata: Metadata = {
  title: "Create your account | Pickulator",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
