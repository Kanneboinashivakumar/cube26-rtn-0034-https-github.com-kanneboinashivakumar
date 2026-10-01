"use client";

import React, { useEffect, useState } from "react";

export default function IntroAnimation() {
  const [stage, setStage] = useState<"enter" | "active" | "exit" | "done">("enter");

  useEffect(() => {
    // Stage 1: Active animation start
    const t1 = setTimeout(() => setStage("active"), 50);

    // Stage 2: Begin smooth dissolution after ~2.4s
    const t2 = setTimeout(() => setStage("exit"), 2400);

    // Stage 3: Complete removal from DOM at 2.9s
    const t3 = setTimeout(() => {
      setStage("done");
    }, 2900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  function handleDismiss() {
    setStage("exit");
    setTimeout(() => {
      setStage("done");
    }, 400);
  }

  if (stage === "done") return null;

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-500 ease-out ${
        stage === "exit"
          ? "opacity-0 scale-105 pointer-events-none"
          : "opacity-100 scale-100"
      }`}
      style={{
        background: "radial-gradient(ellipse at center, #0f1c3f 0%, #080f24 50%, #030611 100%)",
      }}
    >
      {/* ── Ambient Radial Glow Behind Logo ─────────────────────────── */}
      <div className="absolute w-[420px] h-[420px] rounded-full bg-blue-500/15 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[240px] h-[240px] rounded-full bg-cyan-400/20 blur-2xl pointer-events-none" />



      {/* ── Main Animation Container ─────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Animated Box SVG */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
          <svg
            viewBox="0 0 200 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-2xl overflow-visible"
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="introLeft" x1="28" y1="62" x2="98" y2="176" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="60%" stopColor="#1D4ED8" />
                <stop offset="100%" stopColor="#1E3A8A" />
              </linearGradient>

              <linearGradient id="introRight" x1="102" y1="62" x2="172" y2="176" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="50%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#080D1A" />
              </linearGradient>

              <linearGradient id="introTopLeft" x1="30" y1="58" x2="124" y2="82" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>

              <linearGradient id="introTopRight" x1="76" y1="22" x2="170" y2="58" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>

              <linearGradient id="introTape" x1="56" y1="34" x2="146" y2="126" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="30%" stopColor="#38BDF8" />
                <stop offset="70%" stopColor="#00E5FF" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>

              <linearGradient id="introShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="45%" stopColor="rgba(255,255,255,0.1)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.9)" />
                <stop offset="55%" stopColor="rgba(255,255,255,0.1)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>

              <filter id="introShadow" x="116" y="68" width="40" height="70" filterUnits="userSpaceOnUse">
                <feDropShadow dx="-2" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.6" />
              </filter>

              <filter id="introGroundBlur" x="10" y="175" width="180" height="45" filterUnits="userSpaceOnUse">
                <feGaussianBlur stdDeviation="7" />
              </filter>

              <clipPath id="introBoxClip">
                <polygon points="30,62 98,22 170,58 170,140 100,175 30,140" />
              </clipPath>
            </defs>

            <style>{`
              /* Box Pop-in with Elastic Spring Overshoot */
              @keyframes introBoxAssemble {
                0% {
                  transform: translateY(40px) scale(0.6) rotate(-8deg);
                  opacity: 0;
                }
                60% {
                  transform: translateY(-8px) scale(1.06) rotate(1deg);
                  opacity: 1;
                }
                85% {
                  transform: translateY(2px) scale(0.98) rotate(-0.5deg);
                }
                100% {
                  transform: translateY(0px) scale(1) rotate(0deg);
                  opacity: 1;
                }
              }

              /* Tape Glide & Snap Down */
              @keyframes introTapeSnap {
                0%, 30% {
                  opacity: 0;
                  transform: translateY(-20px) scaleY(0.4);
                }
                65% {
                  opacity: 1;
                  transform: translateY(3px) scaleY(1.08);
                }
                80% {
                  transform: translateY(-1px) scaleY(0.97);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0px) scaleY(1);
                }
              }

              /* Specular Gleam Sweep */
              @keyframes introShimmerGleam {
                0%, 50% {
                  transform: translateX(-140px) translateY(-90px);
                  opacity: 0;
                }
                60% {
                  opacity: 1;
                }
                85%, 100% {
                  transform: translateX(180px) translateY(130px);
                  opacity: 0;
                }
              }

              /* Ground Shadow Scaling */
              @keyframes introShadowGrow {
                0% {
                  transform: scale(0.3);
                  opacity: 0;
                }
                65% {
                  transform: scale(1.1);
                  opacity: 0.6;
                }
                100% {
                  transform: scale(1);
                  opacity: 0.45;
                }
              }

              .intro-box-group {
                animation: introBoxAssemble 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                transform-origin: 100px 100px;
              }

              .intro-tape-anim {
                animation: introTapeSnap 1.3s cubic-bezier(0.34, 1.4, 0.64, 1) forwards;
                transform-origin: 135px 71px;
              }

              .intro-shimmer-anim {
                animation: introShimmerGleam 2.2s ease-in-out forwards;
              }

              .intro-shadow-anim {
                animation: introShadowGrow 1.1s ease-out forwards;
                transform-origin: 100px 198px;
              }
            `}</style>

            {/* Ground Shadow */}
            <ellipse
              cx="100"
              cy="198"
              rx="55"
              ry="12"
              fill="#0284c7"
              className="intro-shadow-anim"
              filter="url(#introGroundBlur)"
            />

            {/* Assembling Box Group */}
            <g className="intro-box-group">
              {/* Left Face */}
              <polygon points="30,62 97,97 97,175 30,140" fill="url(#introLeft)" />

              {/* Right Face with Cutout */}
              <polygon points="103,97 124,86 124,124 135,113 146,124 146,75 170,62 170,140 103,175" fill="url(#introRight)" />

              {/* Top-Left Flap */}
              <polygon points="32,58 56,46 123,82 99,94" fill="url(#introTopLeft)" />

              {/* Top-Right Flap */}
              <polygon points="76,34 98,22 168,58 146,69" fill="url(#introTopRight)" />

              {/* Central Tape Ribbon Top */}
              <polygon points="56,46 76,34 146,71 124,82" fill="url(#introTape)" />

              {/* Hanging Tape Tail with Swallowtail Cut */}
              <g className="intro-tape-anim">
                <polygon
                  points="124,82 146,71 146,124 135,113 124,124"
                  fill="url(#introTape)"
                  filter="url(#introShadow)"
                />
                <line
                  x1="124"
                  y1="82"
                  x2="146"
                  y2="71"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>

              {/* Shimmer Light Beam */}
              <g clipPath="url(#introBoxClip)">
                <rect
                  x="0"
                  y="0"
                  width="200"
                  height="200"
                  fill="url(#introShimmer)"
                  className="intro-shimmer-anim"
                />
              </g>
            </g>
          </svg>
        </div>

        {/* ── Brand Title Typing / Tracking Animation ──────────────── */}
        <div className="mt-6 space-y-2">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-200 to-blue-400 tracking-tight"
            style={{
              animation: "titleFadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both",
            }}
          >
            ReturnOps AI
          </h1>

          <p
            className="text-xs sm:text-sm text-cyan-400 font-medium tracking-widest uppercase flex items-center justify-center gap-2"
            style={{
              animation: "sloganFadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) 1s both",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            Inspect · Verify · Explain · Recover
          </p>
        </div>

      </div>

      <style>{`
        @keyframes titleFadeIn {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
            letter-spacing: 0.15em;
          }
          100% {
            opacity: 1;
            transform: translateY(0px) scale(1);
            letter-spacing: -0.02em;
          }
        }

        @keyframes sloganFadeIn {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0px);
          }
        }
      `}</style>
    </div>
  );
}
