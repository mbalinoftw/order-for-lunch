"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MENU_ITEMS } from "@/lib/menu"
import type { OrdersMap, TeamMember, OutreachStats } from "@/lib/types"
import Link from "next/link"

type ConfirmAction = "remind" | "reset"

const CONFIRM_CONFIG: Record<ConfirmAction, { title: string; body: string; confirmLabel: string; destructive: boolean }> = {
  remind: {
    title: "Enviar recordatorios",
    body: "Se enviará un DM por Slack a quienes del equipo aún no pidieron ni se dieron de baja.",
    confirmLabel: "Enviar recordatorios",
    destructive: false,
  },
  reset: {
    title: "Resetear pedidos del día",
    body: "Se borrarán todos los pedidos, opt-outs y el progreso de links enviados de hoy. Esta acción no se puede deshacer.",
    confirmLabel: "Resetear",
    destructive: true,
  },
}

export default function AdminPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrdersMap>({})
  const [outreach, setOutreach] = useState<OutreachStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [reminding, setReminding] = useState(false)
  const [reminderResult, setReminderResult] = useState("")
  const [resetting, setResetting] = useState(false)
  const [sendingLinks, setSendingLinks] = useState(false)
  const [linksResult, setLinksResult] = useState("")
  const [showLinksModal, setShowLinksModal] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/orders", { credentials: "include" })
    const data = await res.json()
    if (data.orders) {
      setOrders(data.orders)
      setOutreach(data.outreach)
    } else {
      setOrders(data)
      setOutreach(null)
    }
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
      await fetchOrders()
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
    setResetting(true)
    await fetch("/api/orders", {
      method: "DELETE",
    })
    await fetchOrders()
    setResetting(false)
  }

  async function handleConfirmAction() {
    if (!confirmAction) return
    const action = confirmAction
    setConfirmAction(null)
    if (action === "remind") await sendReminders()
    else if (action === "reset") await resetOrders()
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
          <p className="text-sm text-gray-400">Gestión del almuerzo diario</p>
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
              <p className="text-gray-400 text-sm mb-4">
                {totalCount === 1 ? "persona ordenó" : "personas ordenaron"} hoy
              </p>
              {outreach && outreach.sent > 0 ? (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">
                        {outreach.confirmed}/{outreach.sent}
                      </span>{" "}
                      respondieron
                    </p>
                    <p className="text-sm font-medium text-gray-500">{outreach.percent}%</p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full transition-all duration-300"
                      style={{ width: `${outreach.percent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-300 pt-4 border-t border-gray-100">
                  Enviá links por DM para ver el progreso de respuesta
                </p>
              )}
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
            onClick={() => setConfirmAction("remind")}
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
            onClick={() => setConfirmAction("reset")}
            disabled={resetting || totalCount === 0}
            className="w-full border border-red-200 text-red-400 hover:bg-red-50 disabled:opacity-40 font-semibold rounded-xl py-3 transition-colors"
          >
            {resetting ? "Borrando..." : "🗑️ Resetear pedidos del día"}
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

      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-1">{CONFIRM_CONFIG[confirmAction].title}</h3>
            <p className="text-sm text-gray-400 mb-6">{CONFIRM_CONFIG[confirmAction].body}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={reminding || resetting}
                className="flex-1 border border-gray-200 text-gray-500 font-semibold rounded-xl py-2.5 hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={reminding || resetting}
                className={`flex-1 font-semibold rounded-xl py-2.5 disabled:opacity-50 transition-colors text-sm ${
                  CONFIRM_CONFIG[confirmAction].destructive
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-gray-900 hover:bg-gray-700 text-white"
                }`}
              >
                {CONFIRM_CONFIG[confirmAction].confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
