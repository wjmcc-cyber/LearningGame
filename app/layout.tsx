import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth/session";
import "./globals.css";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Study League",
  description: "A gamified university study platform MVP.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Study League",
    description: "A gamified university study platform for classrooms, quizzes, friends, and leaderboards.",
    url: siteUrl,
    siteName: "Study League",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Study League",
    description: "A gamified university study platform for classrooms, quizzes, friends, and leaderboards.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
