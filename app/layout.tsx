import "./globals.css";
import { Toaster } from "sonner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MCP MD Sharing",
  description:
    "MCP MD Sharing — share and version Markdown documentation across your team, accessible from the web and from AI coding agents (Claude Code, Cursor, Codex) via the Model Context Protocol.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors theme="dark" position="top-right" />
      </body>
    </html>
  );
}
