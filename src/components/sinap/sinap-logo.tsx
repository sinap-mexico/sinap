'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

interface SinapLogoProps {
  size?: number
  className?: string
  animate?: boolean
  showText?: boolean
  showTagline?: boolean
  variant?: 'default' | 'light' | 'dark'
}

/**
 * Sinap logo component using the actual brand logo PNG.
 *
 * The logo is a synapse-inspired icon: central purple node (AI core),
 * light purple ring (connection layer), green outer arcs + green dots
 * on horizontal axis (channels connecting).
 *
 * Variant "dark": used on dark backgrounds
 * Variant "light" / "default": used on white/light backgrounds
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
  const textColor = isDark ? 'text-white' : 'text-[#0F2D26]'
  const taglineColor = isDark ? 'text-[#1D9E75]' : 'text-[#888780]'

  const logoElement = (
    <Image
      src="/sinap-logo-icon.png"
      alt="Sinap"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      priority
    />
  )

  if (!showText && !showTagline) {
    if (animate) {
      return (
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {logoElement}
        </motion.div>
      )
    }
    return logoElement
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {animate ? (
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {logoElement}
        </motion.div>
      ) : (
        logoElement
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
