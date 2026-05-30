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
 * Sinap logo component using the actual brand logo PNG files.
 *
 * Two image files:
 * - /sinap-logo-icon-only.png — square icon (synapse node)
 * - /sinap-logo-full.png — horizontal logo with icon + "Sinap" text
 *
 * Variant "dark": used on dark backgrounds (adds brightness-0 invert filter for white output)
 * Variant "light" / "default": used on white/light backgrounds — logo colors as-is
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
  const filterClass = isDark ? 'brightness-0 invert' : ''

  // When showText or showTagline is true, show the full horizontal logo (icon + text)
  // Otherwise just the square icon
  const useFullLogo = showText || showTagline

  const logoElement = useFullLogo ? (
    <Image
      src="/sinap-logo-full.png"
      alt="Sinap — Inteligencia que conecta"
      width={Math.round(size * 3)}
      height={size}
      className={`shrink-0 ${filterClass} ${className}`}
      priority
      style={{ height: size, width: 'auto' }}
    />
  ) : (
    <Image
      src="/sinap-logo-icon-only.png"
      alt="Sinap"
      width={size}
      height={size}
      className={`shrink-0 ${filterClass} ${className}`}
      priority
    />
  )

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
