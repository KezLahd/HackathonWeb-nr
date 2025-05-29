"use client"

import type { ReactNode } from "react"

interface MobileOptimizedLayoutProps {
  children: ReactNode
}

export function MobileOptimizedLayout({ children }: MobileOptimizedLayoutProps) {
  return <div className="w-full">{children}</div>
}
