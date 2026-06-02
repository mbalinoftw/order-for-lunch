"use client"

import { useState } from "react"
import Image from "next/image"
import type { MenuItem } from "@/lib/types"

interface MenuCardProps {
  item: MenuItem
  onClick: () => void
}

export function MenuCard({ item, onClick }: MenuCardProps) {
  const [imgError, setImgError] = useState(false)
  const hasPhoto = item.photo_url && item.photo_url !== "/placeholder-food.jpg" && !imgError

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left hover:shadow-md hover:ring-2 hover:ring-gray-200 transition-all group w-full cursor-pointer flex flex-col h-full"
    >
      <div className="relative h-48 bg-gray-50 flex items-center justify-center p-3">
        {hasPhoto ? (
          <Image
            src={item.photo_url}
            alt={item.name}
            fill
            className="object-contain group-hover:scale-105 transition-transform duration-300 p-3"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-6xl opacity-40">🍽️</span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
        <p className="text-gray-400 text-sm mb-3 flex-1">{item.description}</p>
        <p className="text-gray-400 text-sm font-medium">${item.price.toLocaleString()} aprox</p>
      </div>
    </button>
  )
}
