"use client";

/**
 * VerdictBadge.tsx
 * Small, visually obvious badge for PASS / FAIL / UNCERTAIN verdicts.
 */

interface VerdictBadgeProps {
  verdict: string;
  size?: "sm" | "md" | "lg";
}

const STYLES: Record<string, string> = {
  PASS: "bg-green-100 text-green-800 border-green-200",
  FAIL: "bg-red-100 text-red-800 border-red-200",
  UNCERTAIN: "bg-amber-100 text-amber-800 border-amber-200",
};

const ICONS: Record<string, string> = {
  PASS: "✓",
  FAIL: "✗",
  UNCERTAIN: "?",
};

const SIZES = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5 font-bold",
};

export default function VerdictBadge({ verdict, size = "md" }: VerdictBadgeProps) {
  const style = STYLES[verdict] ?? "bg-gray-100 text-gray-800 border-gray-200";
  const icon = ICONS[verdict] ?? "–";
  const sizeClass = SIZES[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${style} ${sizeClass}`}
    >
      <span>{icon}</span>
      <span>{verdict}</span>
    </span>
  );
}
