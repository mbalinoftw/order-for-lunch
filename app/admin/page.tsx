"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MENU_ITEMS } from "@/lib/menu"
import type { OrdersMap, TeamMember } from "@/lib/types"
import Link from "next/link"

export default function AdminPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrdersMap>({})
  const [loading, setLoading] = useState(true)
  const [reminding, setReminding] = useState(false)
  const [reminderResult, setReminderResult] = useState("")
  const [resetting, setResetting] = useState(false)
  const [announcing, setAnnouncing] = useState(false)
  const [announceResult, setAnnounceResult] = useState("")
  const [sendingLinks, setSendingLinks] = useState(false)
  const [linksResult, setLinksResult] = useState("")
  const [showLinksModal, setShowLinksModal] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/orders")
    const data = await res.json()
    setOrders(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  async function sendReminders() {
    setReminding(true)
    setReminderResult("")
    try {
      const res = await fetch("/api/slack/remind", {
        method: "POST",
      })
      const data = await res.json()
      if (data.pending?.length === 0) {
        setReminderResult("✅ Todos ya ordenaron, no hay recordatorios para enviar.")
      } else {
        setReminderResult(`✅ Recordatorios enviados a: ${data.pending?.join(", ") ?? "nadie"}`)
      }
    } catch {
      setReminderResult("❌ Error al enviar recordatorios")
    } finally {
      setReminding(false)
    }
  }

  async function announceInChannel() {
    setAnnouncing(true)
    setAnnounceResult("")
    try {
      const res = await fetch("/api/slack/announce", { method: "POST" })
      if (res.ok) {
        setAnnounceResult("✅ Anuncio publicado en el canal")
      } else {
        setAnnounceResult("❌ Error al publicar el anuncio")
      }
    } catch {
      setAnnounceResult("❌ Error al publicar el anuncio")
    } finally {
      setAnnouncing(false)
    }
  }

  async function openLinksModal() {
    setLinksResult("")
    const res = await fetch("/api/team")
    const members: TeamMember[] = await res.json()
    setTeamMembers(members)
    setSelectedIds(new Set(members.map((m) => m.slack_user_id)))
    setShowLinksModal(true)
  }

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === teamMembers.length
        ? new Set()
        : new Set(teamMembers.map((m) => m.slack_user_id))
    )
  }

  async function sendMagicLinks() {
    setSendingLinks(true)
    setLinksResult("")
    setShowLinksModal(false)
    try {
      const res = await fetch("/api/slack/send-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slack_user_ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      setLinksResult(`✅ Links enviados a ${data.sent} ${data.sent === 1 ? "persona" : "personas"}`)
    } catch {
      setLinksResult("❌ Error al enviar los links")
    } finally {
      setSendingLinks(false)
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
  }

  async function resetOrders() {
    if (!confirm("¿Seguro que querés borrar todos los pedidos de esta semana?")) return
    setResetting(true)
    await fetch("/api/orders", {
      method: "DELETE",
    })
    await fetchOrders()
    setResetting(false)
  }

  const orderedList = Object.values(orders)
  const totalCount = orderedList.length

  const groupedByItem = MENU_ITEMS.map((item) => ({
    item,
    orders: orderedList.filter((o) => o.item_id === item.id),
  })).filter((g) => g.orders.length > 0)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Panel de coordinador</h1>
          <p className="text-sm text-gray-400">Gestión del almuerzo semanal</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-700">
            📊 Dashboard
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">
            Ver menú →
          </Link>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-700">
            Salir
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Estado del pedido</h2>
            <button onClick={fetchOrders} className="text-sm text-gray-400 hover:text-gray-600">
              ↻ Actualizar
            </button>
          </div>
          {loading ? (
            <p className="text-gray-300">Cargando...</p>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900 mb-1">{totalCount}</p>
              <p className="text-gray-400 text-sm">
                {totalCount === 1 ? "persona ordenó" : "personas ordenaron"} esta semana
              </p>
            </>
          )}
        </div>

        {!loading && groupedByItem.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Pedidos por ítem</h2>
            <div className="space-y-4">
              {groupedByItem.map(({ item, orders: itemOrders }) => (
                <div key={item.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">{item.name}</span>
                    <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                      ×{itemOrders.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {itemOrders.map((o) => (
                      <span key={o.name} className="bg-gray-50 text-gray-500 text-sm px-3 py-1 rounded-full border border-gray-100">
                        {o.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 mb-4">Acciones</h2>
          <button
            onClick={announceInChannel}
            disabled={announcing}
            className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold rounded-xl py-3 transition-colors"
          >
            {announcing ? "Publicando..." : "📣 Anunciar en el canal de Slack"}
          </button>
          {announceResult && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">{announceResult}</p>
          )}
          <button
            onClick={openLinksModal}
            disabled={sendingLinks}
            className="w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            {sendingLinks ? "Enviando links..." : "📨 Enviar links personalizados por DM"}
          </button>
          {linksResult && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">{linksResult}</p>
          )}
          <button
            onClick={sendReminders}
            disabled={reminding}
            className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold rounded-xl py-3 transition-colors"
          >
            {reminding ? "Enviando recordatorios..." : "📲 Recordar por DM a quienes faltan"}
          </button>
          {reminderResult && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">{reminderResult}</p>
          )}
          <Link
            href="/summary"
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-3 text-center transition-colors"
          >
            📋 Ver resumen para WhatsApp
          </Link>
          <button
            onClick={resetOrders}
            disabled={resetting || totalCount === 0}
            className="w-full border border-red-200 text-red-400 hover:bg-red-50 disabled:opacity-40 font-semibold rounded-xl py-3 transition-colors"
          >
            {resetting ? "Borrando..." : "🗑️ Resetear pedidos de esta semana"}
          </button>
        </div>
      </div>

      {showLinksModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Enviar links por DM</h3>
            <p className="text-sm text-gray-400 mb-4">Seleccioná a quién enviarle su link personal</p>

            {teamMembers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No hay miembros cargados en <code className="bg-gray-100 px-1 rounded">team:members</code>
              </p>
            ) : (
              <>
                <button
                  onClick={toggleAll}
                  className="text-xs text-gray-400 hover:text-gray-700 mb-3 block"
                >
                  {selectedIds.size === teamMembers.length ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
                <ul className="space-y-2 max-h-64 overflow-y-auto mb-6">
                  {teamMembers.map((m) => (
                    <li key={m.slack_user_id}>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(m.slack_user_id)}
                          onChange={() => toggleMember(m.slack_user_id)}
                          className="w-4 h-4 rounded border-gray-300 accent-gray-900"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">{m.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowLinksModal(false)}
                className="flex-1 border border-gray-200 text-gray-500 font-semibold rounded-xl py-2.5 hover:bg-gray-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={sendMagicLinks}
                disabled={selectedIds.size === 0}
                className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold rounded-xl py-2.5 transition-colors text-sm"
              >
                Enviar a {selectedIds.size}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
