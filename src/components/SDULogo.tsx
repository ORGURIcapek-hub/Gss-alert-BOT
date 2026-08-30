'use client'

import React from 'react'

interface SDULogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  textColor?: 'dark' | 'light'
}

export function SDULogo({
  className = '',
  size = 'md',
  showText = true,
  textColor = 'dark'
}: SDULogoProps) {
  const sizeMap = {
    sm: { icon: 'w-8 h-8', textTitle: 'text-xs', textSub: 'text-[9px]' },
    md: { icon: 'w-10 h-10', textTitle: 'text-sm font-bold', textSub: 'text-[10px]' },
    lg: { icon: 'w-12 h-12', textTitle: 'text-base font-bold', textSub: 'text-xs' },
    xl: { icon: 'w-16 h-16', textTitle: 'text-xl font-bold', textSub: 'text-xs' }
  }

  const currentSize = sizeMap[size]

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official SDU Symbol with Turquoise & Royal Blue Crest */}
      <div className={`${currentSize.icon} relative flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-tr from-[#003B71] via-[#005B94] to-[#00A8B5] p-2 shadow-md border border-[#00A8B5]/30`}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Suan Dusit University Crown / Lotus Crest Inspired Vector */}
          <circle cx="50" cy="50" r="46" stroke="#F6C343" strokeWidth="3" fill="none" opacity="0.9" />
          <circle cx="50" cy="50" r="41" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.6" />
          
          {/* Center Royal Seal Motif */}
          <path
            d="M50 18 L55 33 L70 33 L58 43 L62 58 L50 49 L38 58 L42 43 L30 33 L45 33 Z"
            fill="#F6C343"
          />
          {/* Lotus Petal Base */}
          <path
            d="M26 62 C34 56, 42 66, 50 60 C58 66, 66 56, 74 62 C70 76, 58 84, 50 84 C42 84, 30 76, 26 62 Z"
            fill="#FFFFFF"
          />
          <path
            d="M36 65 C41 62, 45 68, 50 65 C55 68, 59 62, 64 65 C60 74, 55 79, 50 79 C45 79, 40 74, 36 65 Z"
            fill="#003B71"
          />
          {/* Central Flame of Wisdom */}
          <circle cx="50" cy="45" r="4.5" fill="#F6C343" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <span className={`${currentSize.textTitle} ${textColor === 'dark' ? 'text-slate-900' : 'text-white'} leading-tight tracking-tight font-bold`}>
            มหาวิทยาลัยสวนดุสิต
          </span>
          <span className={`${currentSize.textSub} ${textColor === 'dark' ? 'text-[#005B94]' : 'text-sky-300'} font-medium tracking-wide leading-none mt-0.5`}>
            SUAN DUSIT UNIVERSITY
          </span>
        </div>
      )}
    </div>
  )
}
