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
 * Sinap logo component matching the official brand design:
 * - Central purple circle (core intelligence)
 * - Light purple ring around center
 * - Green circular outline (ecosystem boundary)
 * - Two green dots connected via horizontal line (channels connecting)
 * 
 * New tagline: "Inteligencia que conecta"
 */
export function SinapLogo({
  size = 36,
  className = '',
  animate = false,
  showText = false,
  showTagline = false,
  variant = 'default',
}: SinapLogoProps) {
  const scale = size / 36
  const textColor = variant === 'dark' ? 'text-white' : variant === 'light' ? 'text-[#0F2D26]' : 'text-[#0F2D26]'
  const taglineColor = variant === 'dark' ? 'text-white/50' : variant === 'light' ? 'text-[#888780]' : 'text-[#888780]'

  const LogoSvg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className={`shrink-0 ${className}`}
    >
      {/* Green circular outline (ecosystem) */}
      <circle cx="18" cy="18" r="16" stroke="#1D9E75" strokeWidth="1.2" fill="none" opacity="0.4" />

      {/* Light purple ring (connection layer) */}
      <circle cx="18" cy="18" r="9" fill="#534AB7" opacity="0.12" />

      {/* Central purple circle (core intelligence) */}
      <circle cx="18" cy="18" r="5" fill="#534AB7" />

      {/* Horizontal connection line (left to right) */}
      <line x1="4" y1="18" x2="13" y2="18" stroke="#1D9E75" strokeWidth="1.2" opacity="0.6" />
      <line x1="23" y1="18" x2="32" y2="18" stroke="#1D9E75" strokeWidth="1.2" opacity="0.6" />

      {/* Left green dot (channel node) */}
      <circle cx="4" cy="18" r="2.5" fill="#1D9E75" />

      {/* Right green dot (channel node) */}
      <circle cx="32" cy="18" r="2.5" fill="#1D9E75" />

      {/* Subtle connection lines to top and bottom (optional visual depth) */}
      <line x1="18" y1="2" x2="18" y2="9" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.3" />
      <line x1="18" y1="27" x2="18" y2="34" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.3" />
      <circle cx="18" cy="2" r="1.2" fill="#5DCAA5" opacity="0.4" />
      <circle cx="18" cy="34" r="1.2" fill="#5DCAA5" opacity="0.4" />
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
