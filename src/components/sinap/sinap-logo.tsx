'use client'

import { motion } from 'framer-motion'

interface SinapLogoProps {
  size?: number
  className?: string
  animate?: boolean
  showText?: boolean
  showTagline?: boolean
  variant?: 'default' | 'light' | 'dark'
}

/**
 * Sinap logo component matching the official brand design.
 *
 * On dark backgrounds (variant="dark"):
 *   All elements are white with varying opacity — center dot, middle ring,
 *   outer ring, side dots, and connecting lines.
 *
 * On light backgrounds (variant="default" | "light"):
 *   Standard brand colors — purple center, green dots/rings.
 *
 * Tagline: "Inteligencia que conecta"
 */
export function SinapLogo({
  size = 36,
  className = '',
  animate = false,
  showText = false,
  showTagline = false,
  variant = 'default',
}: SinapLogoProps) {
  const isDark = variant === 'dark'
  const scale = size / 36
  const textColor = isDark ? 'text-white' : 'text-[#0F2D26]'
  const taglineColor = isDark ? 'text-[#1D9E75]' : 'text-[#888780]'

  const LogoSvg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className={`shrink-0 ${className}`}
    >
      {isDark ? (
        /* ── White-on-dark version ── */
        <>
          {/* Outer ring (ecosystem) — white, low opacity */}
          <circle cx="18" cy="18" r="16" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" />

          {/* Middle ring (connection layer) — white, medium opacity */}
          <circle cx="18" cy="18" r="9" fill="white" opacity="0.1" />
          <circle cx="18" cy="18" r="9" stroke="white" strokeWidth="0.6" fill="none" opacity="0.5" />

          {/* Central circle (core intelligence) — white, full */}
          <circle cx="18" cy="18" r="5" fill="white" opacity="0.95" />

          {/* Horizontal connection lines — white */}
          <line x1="4" y1="18" x2="13" y2="18" stroke="white" strokeWidth="0.8" opacity="0.45" />
          <line x1="23" y1="18" x2="32" y2="18" stroke="white" strokeWidth="0.8" opacity="0.45" />

          {/* Left dot (channel node) — white */}
          <circle cx="4" cy="18" r="2.2" fill="white" opacity="0.8" />

          {/* Right dot (channel node) — white */}
          <circle cx="32" cy="18" r="2.2" fill="white" opacity="0.8" />

          {/* Subtle vertical connections */}
          <line x1="18" y1="2" x2="18" y2="9" stroke="white" strokeWidth="0.5" opacity="0.2" />
          <line x1="18" y1="27" x2="18" y2="34" stroke="white" strokeWidth="0.5" opacity="0.2" />
          <circle cx="18" cy="2" r="1" fill="white" opacity="0.3" />
          <circle cx="18" cy="34" r="1" fill="white" opacity="0.3" />
        </>
      ) : (
        /* ── Colored-on-light version ── */
        <>
          {/* Green circular outline (ecosystem) */}
          <circle cx="18" cy="18" r="16" stroke="#1D9E75" strokeWidth="1.2" fill="none" opacity="0.4" />

          {/* Light purple ring (connection layer) */}
          <circle cx="18" cy="18" r="9" fill="#534AB7" opacity="0.12" />

          {/* Central purple circle (core intelligence) */}
          <circle cx="18" cy="18" r="5" fill="#534AB7" />

          {/* Horizontal connection line */}
          <line x1="4" y1="18" x2="13" y2="18" stroke="#1D9E75" strokeWidth="1.2" opacity="0.6" />
          <line x1="23" y1="18" x2="32" y2="18" stroke="#1D9E75" strokeWidth="1.2" opacity="0.6" />

          {/* Left green dot */}
          <circle cx="4" cy="18" r="2.5" fill="#1D9E75" />

          {/* Right green dot */}
          <circle cx="32" cy="18" r="2.5" fill="#1D9E75" />

          {/* Vertical connections */}
          <line x1="18" y1="2" x2="18" y2="9" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.3" />
          <line x1="18" y1="27" x2="18" y2="34" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.3" />
          <circle cx="18" cy="2" r="1.2" fill="#5DCAA5" opacity="0.4" />
          <circle cx="18" cy="34" r="1.2" fill="#5DCAA5" opacity="0.4" />
        </>
      )}
    </svg>
  )

  if (!showText && !showTagline) {
    if (animate) {
      return (
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {LogoSvg}
        </motion.div>
      )
    }
    return LogoSvg
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {animate ? (
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {LogoSvg}
        </motion.div>
      ) : (
        LogoSvg
      )}
      <div>
        <p className={`text-lg font-medium tracking-[-0.03em] ${textColor} leading-tight`}>
          Sinap
        </p>
        {showTagline && (
          <p className={`text-[10px] ${taglineColor} tracking-wide`}>
            Inteligencia que conecta
          </p>
        )}
      </div>
    </div>
  )
}
