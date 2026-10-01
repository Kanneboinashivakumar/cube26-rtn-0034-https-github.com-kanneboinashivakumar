"use client";

import React from "react";

interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showShadow?: boolean;
}

export default function AnimatedLogo({
  size = "md",
  className = "",
  showShadow = true,
}: AnimatedLogoProps) {
  const sizeMap = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-14 h-14",
    xl: "w-24 h-24",
  };

  const dim = sizeMap[size] || "w-9 h-9";

  return (
    <div className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 200 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${dim} overflow-visible transition-transform duration-300 hover:scale-105`}
      >
        <defs>
          {/* Left Face Gradient (Royal Blue to Deep Indigo) */}
          <linearGradient id="animBoxLeft" x1="28" y1="62" x2="98" y2="176" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="60%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>

          {/* Right Face Gradient (Midnight Slate to Deep Navy) */}
          <linearGradient id="animBoxRight" x1="102" y1="62" x2="172" y2="176" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="50%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#080D1A" />
          </linearGradient>

          {/* Top Left Flap Gradient (Luminous Sky Blue) */}
          <linearGradient id="animTopLeft" x1="30" y1="58" x2="124" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          {/* Top Right Flap Gradient (Vibrant Azure) */}
          <linearGradient id="animTopRight" x1="76" y1="22" x2="170" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* Tape Ribbon Gradient (Electric Cyan / Neon Glow) */}
          <linearGradient id="animTape" x1="56" y1="34" x2="146" y2="126" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="30%" stopColor="#38BDF8" />
            <stop offset="70%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* Shimmer Light Beam Gradient */}
          <linearGradient id="animShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          {/* Tape Drop Shadow */}
          <filter id="animShadow" x="116" y="68" width="40" height="70" filterUnits="userSpaceOnUse">
            <feDropShadow dx="-1.5" dy="2.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.5" />
          </filter>

          {/* Ambient Ground Shadow Filter */}
          <filter id="groundBlur" x="20" y="180" width="160" height="40" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <style>{`
          @keyframes boxFloat {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            50% {
              transform: translateY(-6px) rotate(-0.5deg);
            }
          }

          @keyframes tapeFlutter {
            0%, 100% {
              transform: scaleY(1) skewX(0deg);
            }
            30% {
              transform: scaleY(1.025) skewX(-1deg);
            }
            60% {
              transform: scaleY(0.985) skewX(1deg);
            }
          }

          @keyframes shimmerSweep {
            0% {
              transform: translateX(-120px) translateY(-80px);
              opacity: 0;
            }
            20% {
              opacity: 0.8;
            }
            40%, 100% {
              transform: translateX(180px) translateY(120px);
              opacity: 0;
            }
          }

          @keyframes groundPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.45;
            }
            50% {
              transform: scale(0.85);
              opacity: 0.22;
            }
          }

          .box-group {
            animation: boxFloat 3.8s ease-in-out infinite;
            transform-origin: 100px 100px;
          }

          .tape-tail {
            animation: tapeFlutter 3.8s ease-in-out infinite;
            transform-origin: 135px 71px;
          }

          .shimmer-layer {
            animation: shimmerSweep 4.5s ease-in-out infinite;
            pointer-events: none;
          }

          .ground-shadow {
            animation: groundPulse 3.8s ease-in-out infinite;
            transform-origin: 100px 198px;
          }
        `}</style>

        {/* ── Ambient Ground Shadow ────────────────────────────────────── */}
        {showShadow && (
          <ellipse
            cx="100"
            cy="198"
            rx="52"
            ry="11"
            fill="#0284c7"
            className="ground-shadow"
            filter="url(#groundBlur)"
          />
        )}

        {/* ── Main Isometric Box Group (Floats Smoothly) ───────────────── */}
        <g className="box-group">
          {/* 1. Left Isometric Face */}
          <polygon
            points="30,62 97,97 97,175 30,140"
            fill="url(#animBoxLeft)"
          />

          {/* 2. Right Isometric Face (With Tape Cutout) */}
          <polygon
            points="103,97 124,86 124,124 135,113 146,124 146,75 170,62 170,140 103,175"
            fill="url(#animBoxRight)"
          />

          {/* 3. Top-Left Flap */}
          <polygon
            points="32,58 56,46 123,82 99,94"
            fill="url(#animTopLeft)"
          />

          {/* 4. Top-Right Flap */}
          <polygon
            points="76,34 98,22 168,58 146,69"
            fill="url(#animTopRight)"
          />

          {/* 5. Central Tape Ribbon (Fixed top portion) */}
          <polygon
            points="56,46 76,34 146,71 124,82"
            fill="url(#animTape)"
          />

          {/* 6. Hanging Tape Tail with Swallowtail Notch (Subtly Animated) */}
          <g className="tape-tail">
            <polygon
              points="124,82 146,71 146,124 135,113 124,124"
              fill="url(#animTape)"
              filter="url(#animShadow)"
            />
            {/* Crisp Corner Crease Highlight */}
            <line
              x1="124"
              y1="82"
              x2="146"
              y2="71"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>

          {/* 7. Specular Shimmer Sweep Across Box Faces */}
          <g clipPath="url(#boxClip)">
            <rect
              x="0"
              y="0"
              width="200"
              height="200"
              fill="url(#animShimmer)"
              className="shimmer-layer"
            />
          </g>

          <clipPath id="boxClip">
            <polygon points="30,62 98,22 170,58 170,140 100,175 30,140" />
          </clipPath>
        </g>
      </svg>
    </div>
  );
}
