import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study League",
  description: "A gamified university study platform MVP.",
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
