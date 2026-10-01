import type { Metadata } from "next";
import "./globals.css";
import AnimatedLogo from "@/components/AnimatedLogo";
import IntroAnimation from "@/components/IntroAnimation";

export const metadata: Metadata = {
  title: "ReturnOps AI — Inspect. Verify. Explain. Recover.",
  description: "Evidence-first AI returns inspection workstation",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {/* ── Seamless Cinematic Intro Animation ────────────────── */}
        <IntroAnimation />

        {/* ── App shell header ───────────────────────────────────── */}
        <header className="bg-[#0b1329] border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            {/* Brand + Slogan with slight gap */}
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-2.5 group">
                <AnimatedLogo size="md" showShadow={false} />
                <span className="font-bold text-white text-base tracking-tight">ReturnOps AI</span>
              </a>

              {/* Slight gap + Slogan */}
              <div className="hidden sm:flex items-center ml-3 pl-3.5 border-l border-slate-700/60">
                <span className="text-xs text-slate-400 font-medium tracking-wide">
                  Inspect · Verify · Explain · Recover
                </span>
              </div>
            </div>

            {/* Right side: Org + Status + Profile Image & Name (Ayush Kumar) */}
            <div className="flex items-center gap-3 sm:gap-4 text-xs">
              {/* Org badge */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Org:</span>
                <span className="font-semibold text-slate-200">Apex Global Logistics</span>
              </div>

              {/* Online indicator */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>

              {/* Profile Image & Name: Ayush Kumar */}
              <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-800">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow ring-1 ring-blue-400/30">
                  A
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-100 leading-tight">Ayush Kumar</div>
                  <div className="text-[10px] text-slate-400 leading-tight">Lead Inspector</div>
                </div>
              </div>
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
