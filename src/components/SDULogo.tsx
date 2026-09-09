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
    sm: { icon: 'w-8 h-8', textTitle: 'text-xs font-bold', textSub: 'text-[9px]' },
    md: { icon: 'w-10 h-10', textTitle: 'text-sm font-bold', textSub: 'text-[10px]' },
    lg: { icon: 'w-12 h-12', textTitle: 'text-base font-bold', textSub: 'text-xs' },
    xl: { icon: 'w-16 h-16', textTitle: 'text-xl font-bold', textSub: 'text-xs' }
  }

  const currentSize = sizeMap[size]

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official SDU Symbol from IMG folder */}
      <div className={`${currentSize.icon} relative flex-shrink-0 flex items-center justify-center`}>
        <img
          src="/IMG/sdu-logo.png"
          alt="มหาวิทยาลัยสวนดุสิต"
          className="w-full h-full object-contain filter drop-shadow-sm transition-transform hover:scale-105 duration-200"
        />
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

