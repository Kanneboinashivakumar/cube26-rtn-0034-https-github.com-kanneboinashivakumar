"use client";

/**
 * DispositionBadge.tsx
 * Coloured badge for the five disposition outcomes.
 */

import type { Disposition } from "@/lib/schemas";

const STYLES: Record<Disposition, string> = {
  restock: "bg-green-100 text-green-800 border-green-200",
  refurbish: "bg-blue-100 text-blue-800 border-blue-200",
  liquidate: "bg-purple-100 text-purple-800 border-purple-200",
  dispose: "bg-red-100 text-red-800 border-red-200",
  pending_review: "bg-amber-100 text-amber-800 border-amber-200",
};

const LABELS: Record<Disposition, string> = {
  restock: "Restock",
  refurbish: "Refurbish",
  liquidate: "Liquidate",
  dispose: "Dispose",
  pending_review: "Pending Review",
};

const ICONS: Record<Disposition, string> = {
  restock: "↩",
  refurbish: "🔧",
  liquidate: "💰",
  dispose: "🗑",
  pending_review: "⏳",
};

interface DispositionBadgeProps {
  disposition: Disposition;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-3 py-1",
  lg: "text-base px-4 py-2 font-bold tracking-wide",
};

export default function DispositionBadge({
  disposition,
  size = "md",
}: DispositionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-semibold ${STYLES[disposition]} ${SIZES[size]}`}
    >
      <span>{ICONS[disposition]}</span>
      <span>{LABELS[disposition]}</span>
    </span>
  );
}
