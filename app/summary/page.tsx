"use client"

import { useEffect, useState, useCallback } from "react"
import { getMenuItem, MENU_ITEMS } from "@/lib/menu"
import type { OrdersMap } from "@/lib/types"
import Link from "next/link"

export default function SummaryPage() {
  const [orders, setOrders] = useState<OrdersMap>({})
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/orders")
    const data = await res.json()
    setOrders(data.orders ?? data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const orderedList = Object.values(orders).sort((a, b) => a.name.localeCompare(b.name))

  const formattedText = [...orderedList]
    .sort((a, b) => a.item_id.localeCompare(b.item_id))
    .map((o) => {
      const item = getMenuItem(o.item_id) ?? MENU_ITEMS.find((m) => m.id === o.item_id)
      const extras = [
        o.selected_bread,
        ...(o.selected_dressing ?? []),
      ].filter(Boolean).join(", ")
      return `${o.name}: ${item?.name ?? o.item_id}${extras ? ` (${extras})` : ""}`
    })
    .join("\n")

  async function copyToClipboard() {
    await navigator.clipboard.writeText(formattedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const groupedByItem = MENU_ITEMS.map((item) => ({
    item,
    people: orderedList.filter((o) => o.item_id === item.id).map((o) => o.name),
  })).filter((g) => g.people.length > 0)

  function content() {
    if (loading) {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-300">
          Cargando pedidos...
        </div>
      )
    }

    if (orderedList.length === 0) {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-300">
          Todavía no hay pedidos hoy.
        </div>
      )
    }

    return (
      <>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Texto para WhatsApp</h2>
            <button
              onClick={copyToClipboard}
              className="text-sm bg-gray-900 hover:bg-gray-700 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              {copied ? "¡Copiado! ✓" : "Copiar"}
            </button>
          </div>
          <pre className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 font-mono whitespace-pre-wrap border border-gray-100">
            {formattedText}
          </pre>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Agrupado por ítem</h2>
          <div className="space-y-4">
            {groupedByItem.map(({ item, people }) => (
              <div key={item.id} className="flex items-start gap-4">
                <span className="bg-gray-100 text-gray-600 text-sm font-semibold px-2 py-0.5 rounded-full shrink-0">
                  ×{people.length}
                </span>
                <div>
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-gray-400 text-sm">{people.join(", ")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-gray-400">
          {orderedList.length} {orderedList.length === 1 ? "pedido" : "pedidos"} en total
        </p>
      </>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Resumen del pedido</h1>
          <p className="text-sm text-gray-400">Listo para enviar por WhatsApp</p>
        </div>
        <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-700">
          ← Admin
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {content()}
      </div>
    </main>
  )
}
