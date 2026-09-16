'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Check,
  X,
  Move,
  Loader2,
  Sparkles
} from 'lucide-react'

interface AvatarCropModalProps {
  isOpen: boolean
  imageSrc: string | null
  fileName?: string
  onClose: () => void
  onCrop: (croppedFile: File, previewUrl: string) => Promise<void> | void
}

const VIEWPORT_SIZE = 320
const CIRCLE_RADIUS = 125
const OUTPUT_SIZE = 512

export function AvatarCropModal({
  isOpen,
  imageSrc,
  fileName = 'avatar.jpg',
  onClose,
  onCrop
}: AvatarCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [touchDistance, setTouchDistance] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!isOpen || !imageSrc) {
      setImageObj(null)
      setScale(1)
      setOffset({ x: 0, y: 0 })
      setRotation(0)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImageObj(img)
      setScale(1)
      setOffset({ x: 0, y: 0 })
      setRotation(0)
    }
    img.src = imageSrc
  }, [isOpen, imageSrc])

  const drawViewport = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageObj) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = VIEWPORT_SIZE
    const H = VIEWPORT_SIZE
    const cx = W / 2
    const cy = H / 2
    const R = CIRCLE_RADIUS

    ctx.clearRect(0, 0, W, H)

    const isFlipped = rotation === 90 || rotation === 270
    const effectiveWidth = isFlipped ? imageObj.naturalHeight : imageObj.naturalWidth
    const effectiveHeight = isFlipped ? imageObj.naturalWidth : imageObj.naturalHeight

    const baseScale = Math.max((R * 2) / effectiveWidth, (R * 2) / effectiveHeight)
    const currentScale = baseScale * scale

    ctx.save()
    ctx.translate(cx + offset.x, cy + offset.y)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.drawImage(
      imageObj,
      (-imageObj.naturalWidth * currentScale) / 2,
      (-imageObj.naturalHeight * currentScale) / 2,
      imageObj.naturalWidth * currentScale,
      imageObj.naturalHeight * currentScale
    )
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, W, H)
    ctx.arc(cx, cy, R, 0, Math.PI * 2, true)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.strokeStyle = '#38BDF8'
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx - R * 0.35, cy)
    ctx.lineTo(cx + R * 0.35, cy)
    ctx.moveTo(cx, cy - R * 0.35)
    ctx.lineTo(cx, cy + R * 0.35)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.restore()

    const previewCanvas = previewCanvasRef.current
    if (previewCanvas) {
      const pCtx = previewCanvas.getContext('2d')
      if (pCtx) {
        const pSize = previewCanvas.width
        pCtx.clearRect(0, 0, pSize, pSize)
        pCtx.save()
        pCtx.beginPath()
        pCtx.arc(pSize / 2, pSize / 2, pSize / 2, 0, Math.PI * 2)
        pCtx.clip()

        const ratio = pSize / (2 * R)
        pCtx.translate(pSize / 2 + offset.x * ratio, pSize / 2 + offset.y * ratio)
        pCtx.rotate((rotation * Math.PI) / 180)
        pCtx.drawImage(
          imageObj,
          (-imageObj.naturalWidth * currentScale * ratio) / 2,
          (-imageObj.naturalHeight * currentScale * ratio) / 2,
          imageObj.naturalWidth * currentScale * ratio,
          imageObj.naturalHeight * currentScale * ratio
        )
        pCtx.restore()
      }
    }
  }, [imageObj, scale, offset, rotation])

  useEffect(() => {
    drawViewport()
  }, [drawViewport])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return
    const nextX = e.clientX - dragStart.x
    const nextY = e.clientY - dragStart.y
    const maxBound = CIRCLE_RADIUS * 1.6
    setOffset({
      x: Math.max(-maxBound, Math.min(maxBound, nextX)),
      y: Math.max(-maxBound, Math.min(maxBound, nextY))
    })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setIsDragging(false)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.0015
    setScale((prev) => Math.min(3.5, Math.max(1, Number((prev + delta).toFixed(3)))))
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      setTouchDistance(dist)
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && touchDistance !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = dist / touchDistance
      setScale((prev) => Math.min(3.5, Math.max(1, Number((prev * factor).toFixed(3)))))
      setTouchDistance(dist)
    }
  }

  const handleTouchEnd = () => {
    setTouchDistance(null)
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleReset = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
    setRotation(0)
  }

  const handleConfirmCrop = async () => {
    if (!imageObj) return
    setIsProcessing(true)

    try {
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = OUTPUT_SIZE
      exportCanvas.height = OUTPUT_SIZE
      const eCtx = exportCanvas.getContext('2d')
      if (!eCtx) throw new Error('ไม่สามารถประมวลผลรูปภาพได้')

      const R = CIRCLE_RADIUS
      const isFlipped = rotation === 90 || rotation === 270
      const effectiveWidth = isFlipped ? imageObj.naturalHeight : imageObj.naturalWidth
      const effectiveHeight = isFlipped ? imageObj.naturalWidth : imageObj.naturalHeight
      const baseScale = Math.max((R * 2) / effectiveWidth, (R * 2) / effectiveHeight)
      const currentScale = baseScale * scale

      const ratio = OUTPUT_SIZE / (2 * R)

      eCtx.save()
      eCtx.translate(OUTPUT_SIZE / 2 + offset.x * ratio, OUTPUT_SIZE / 2 + offset.y * ratio)
      eCtx.rotate((rotation * Math.PI) / 180)
      eCtx.drawImage(
        imageObj,
        (-imageObj.naturalWidth * currentScale * ratio) / 2,
        (-imageObj.naturalHeight * currentScale * ratio) / 2,
        imageObj.naturalWidth * currentScale * ratio,
        imageObj.naturalHeight * currentScale * ratio
      )
      eCtx.restore()

      const blob = await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
      })

      if (!blob) throw new Error('ไม่สามารถสร้างไฟล์รูปภาพได้')

      const safeBaseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
      const finalFileName = `${safeBaseName || 'avatar'}-cropped.jpg`
      const croppedFile = new File([blob], finalFileName, { type: 'image/jpeg' })
      const previewUrl = exportCanvas.toDataURL('image/jpeg', 0.92)

      await onCrop(croppedFile, previewUrl)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 relative my-4 mobile-modal-sheet animate-slide-up max-h-[95dvh] overflow-hidden flex flex-col"
      >
        <div className="bg-gradient-to-r from-[#00264D] via-[#003B71] to-[#005B94] p-5 sm:p-6 text-white relative flex-shrink-0">
          <button
            onClick={onClose}
            type="button"
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors cursor-pointer"
            aria-label="ปิด"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-sky-200 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-sky-200 uppercase tracking-wider block">
                Profile Photo Framing
              </span>
              <h3 className="text-lg sm:text-xl font-black">
                ปรับตำแหน่งและตัดขอบรูปโปรไฟล์
              </h3>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex flex-col items-center gap-4">
            <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-950 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={VIEWPORT_SIZE}
                height={VIEWPORT_SIZE}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`touch-none select-none block ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              />

              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-white/90 font-semibold pointer-events-none flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                <Move className="w-3 h-3 text-sky-400" />
                <span>แตะหรือลากเพื่อเลื่อนตำแหน่งภาพ</span>
              </div>
            </div>

            <div className="w-full max-w-sm flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-left">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  ตัวอย่างการแสดงผล
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  วงหน้าโปรไฟล์ในระบบ
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <canvas
                    ref={previewCanvasRef}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-full border-2 border-white shadow-md block bg-slate-200"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div className="text-left text-[11px] text-slate-400 font-medium leading-tight">
                  <span className="block font-bold text-slate-700">กลมสมส่วน</span>
                  <span>พอดีกรอบรูป</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <ZoomIn className="w-4 h-4 text-[#003B71]" />
                <span>ปรับขนาด / ซูมเข้า - ออก (Zoom)</span>
              </span>
              <span className="font-mono text-[#003B71] bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                {Math.round(scale * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScale((prev) => Math.max(1, Number((prev - 0.1).toFixed(2))))}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-all cursor-pointer active:scale-95"
                title="ย่อขนาด"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min={1}
                max={3.5}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="flex-1 accent-[#003B71] h-2 bg-slate-200 rounded-lg cursor-pointer"
              />

              <button
                type="button"
                onClick={() => setScale((prev) => Math.min(3.5, Number((prev + 0.1).toFixed(2))))}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-all cursor-pointer active:scale-95"
                title="ขยายขนาด"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#003B71]" />
                <span>หมุนรูป 90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>รีเซ็ตตำแหน่งเดิม</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer transition-all disabled:opacity-50"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleConfirmCrop}
            disabled={isProcessing || !imageObj}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#003B71] to-[#005B94] hover:from-[#00264D] hover:to-[#003B71] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#003B71]/20 cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังประมวลผล...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>ตัดขอบและใช้รูปนี้</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
