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
  const hasBread = item.bread && item.bread.length > 1
  const hasDressing = item.dressing && item.dressing.length > 0
  const isVeggie = item.veggie === true

  return (
    <button
      onClick={onClick}
      className="relative hover:translate-y-[-2px] duration-300 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left hover:shadow-md hover:ring-2 hover:ring-gray-200 transition-all group w-full cursor-pointer flex flex-col h-full"
    >
      <div className="relative h-48 bg-gray-50 flex items-center justify-center p-3">
        {hasPhoto ? (
          <Image
            src={item.photo_url}
            alt={item.name}
            fill
            className="object-cover p-3"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-6xl opacity-40">🍽️</span>
        )}
        {isVeggie && (
          <div className="absolute top-2 left-2 z-10">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-700/80 text-white backdrop-blur-sm">
              🥦 Veggie
            </span>
          </div>
        )}
        <div className="absolute bottom-0 right-4 translate-y-1/2 z-10">
          <span className="inline-flex items-center text-xs font-semibold px-4 py-2 rounded-full bg-gray-100 text-gray-800 shadow-md">
            ${item.price.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
        <p className="text-gray-400 text-sm mb-3 flex-1">{item.description}</p>
        {(hasBread || hasDressing) && (
          <div className="flex gap-1 flex-wrap">
            {hasBread && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-900/70 text-white">
                🍞 Pan
              </span>
            )}
            {hasDressing && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-900/70 text-white">
                🥗 Aderezo
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
