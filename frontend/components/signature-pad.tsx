"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Check } from "lucide-react"

interface SignaturePadProps {
  onSave?: (signature: string) => void
  onClear?: () => void
  onSignatureChange?: (signature: string) => void
  disabled?: boolean
}

export function SignaturePad({ onSave, onClear, onSignatureChange, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    // Set drawing style
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    setHasSignature(true)

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onClear?.()
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) return

    const dataUrl = canvas.toDataURL("image/png")
    onSave?.(dataUrl)
    onSignatureChange?.(dataUrl)
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={disabled ? undefined : startDrawing}
          onMouseMove={disabled ? undefined : draw}
          onMouseUp={disabled ? undefined : stopDrawing}
          onMouseLeave={disabled ? undefined : stopDrawing}
          onTouchStart={disabled ? undefined : startDrawing}
          onTouchMove={disabled ? undefined : draw}
          onTouchEnd={disabled ? undefined : stopDrawing}
          className={`w-full h-48 touch-none ${disabled ? "cursor-not-allowed opacity-50" : "cursor-crosshair"}`}
        />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-slate-400 pointer-events-none">
          חתום כאן
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          onClick={clearSignature}
          variant="outline"
          className="flex-1 border-slate-300 hover:bg-slate-100 bg-transparent"
          disabled={!hasSignature || disabled}
        >
          <X className="w-4 h-4 ml-2" />
          נקה
        </Button>
        <Button
          type="button"
          onClick={saveSignature}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!hasSignature || disabled}
        >
          <Check className="w-4 h-4 ml-2" />
          אשר חתימה
        </Button>
      </div>
    </div>
  )
}

export default SignaturePad
