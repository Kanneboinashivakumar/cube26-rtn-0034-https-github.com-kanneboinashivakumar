import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReturnOps AI — Inspect. Verify. Explain. Recover.",
  description: "Evidence-first AI returns inspection workstation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {/* ── App shell ─────────────────────────────────────────── */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-900 tracking-tight">ReturnOps AI</span>
              <span className="hidden sm:inline text-xs text-gray-400 font-medium ml-1">
                Inspect · Verify · Explain · Recover
              </span>
            </div>

            {/* Org badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Organisation</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {process.env.NEXT_PUBLIC_ORG_ID ?? "org_demo_alpha"}
              </span>
            </div>
          </div>
        </header>

        {/* ── Main content ───────────────────────────────────────── */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
