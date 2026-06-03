"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface MenuRankingItem { item_id: string; name: string; count: number; percentage: number }
interface RankingItem { option: string; count: number }
interface DailyRow { day: string; ordered: number; skipped: number; no_response: number; total: number; spend: number }
interface UserProfile { name: string; total_orders: number; days_participated: number; favorite_item: string; variety_index: number | null; favorite_bread: string | null; favorite_dressing: string | null }
interface Summary { total_days: number; total_orders: number; avg_participation_pct: number; most_popular_item: string | null; most_expensive_day: string | null; most_expensive_day_spend: number }

interface DashboardData {
  menu_ranking: MenuRankingItem[]
  bread_ranking: RankingItem[]
  dressing_ranking: RankingItem[]
  daily_participation: DailyRow[]
  user_profiles: UserProfile[]
  summary: Summary
}

function Bar({ value, max, color = "bg-gray-900" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{value}</span>
    </div>
  )
}

function participationColor(pct: number) {
  if (pct >= 70) return "text-green-600 bg-green-50"
  if (pct >= 40) return "text-yellow-600 bg-yellow-50"
  return "text-red-500 bg-red-50"
}

function varietyLabel(idx: number | null) {
  if (idx === null) return { label: "Pocos datos", color: "text-gray-400" }
  if (idx >= 0.8) return { label: "Explorador 🌈", color: "text-blue-600" }
  if (idx >= 0.5) return { label: "Variado", color: "text-green-600" }
  if (idx >= 0.2) return { label: "Bastante fijo", color: "text-yellow-600" }
  return { label: "Siempre lo mismo 😅", color: "text-red-500" }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">📊 Dashboard</h1>
          <p className="text-sm text-gray-400">Comportamiento histórico del equipo</p>
        </div>
        <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-700">← Admin</Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-300">
            Cargando métricas...
          </div>
        )}

        {!loading && !data?.summary.total_days && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
            Todavía no hay datos históricos suficientes.
          </div>
        )}

        {!loading && data && data.summary.total_days > 0 && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Días registrados", value: data.summary.total_days },
                { label: "Pedidos totales", value: data.summary.total_orders },
                { label: "Participación promedio", value: `${data.summary.avg_participation_pct}%` },
                { label: "Ítem más pedido", value: data.summary.most_popular_item ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* A. Popularidad del menú */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">🥪 Popularidad del menú</h2>
              <div className="space-y-3">
                {data.menu_ranking.map((item, i) => (
                  <div key={item.item_id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="text-gray-300 w-4 text-right text-xs">{i + 1}</span>
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-400">{item.percentage}%</span>
                    </div>
                    <Bar value={item.count} max={data.menu_ranking[0].count} />
                  </div>
                ))}
              </div>

              {data.bread_ranking.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Pan más elegido</h3>
                  <div className="space-y-2">
                    {data.bread_ranking.map((b) => (
                      <div key={b.option} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-44 truncate">{b.option}</span>
                        <Bar value={b.count} max={data.bread_ranking[0].count} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.dressing_ranking.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Aderezos más elegidos</h3>
                  <div className="space-y-2">
                    {data.dressing_ranking.map((d) => (
                      <div key={d.option} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-44 truncate">{d.option}</span>
                        <Bar value={d.count} max={data.dressing_ranking[0].count} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* B. Participación diaria */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">📅 Participación diaria</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Día</th>
                      <th className="text-center pb-2 font-medium">Participación</th>
                      <th className="text-center pb-2 font-medium">Pedidos</th>
                      <th className="text-center pb-2 font-medium">Opt-outs</th>
                      <th className="text-center pb-2 font-medium">Sin resp.</th>
                      <th className="text-right pb-2 font-medium">Gasto est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily_participation.map((row) => {
                      const pct = row.total > 0 ? Math.round((row.ordered / row.total) * 100) : 0
                      const { color } = { color: participationColor(pct) }
                      return (
                        <tr key={row.day} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 text-gray-600 font-mono text-xs">{row.day}</td>
                          <td className="py-2 text-center">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
                              {pct}%
                            </span>
                          </td>
                          <td className="py-2 text-center text-gray-700">{row.ordered}</td>
                          <td className="py-2 text-center text-gray-400">{row.skipped}</td>
                          <td className="py-2 text-center text-gray-400">{row.no_response}</td>
                          <td className="py-2 text-right text-gray-600">${row.spend.toLocaleString("es-AR")}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {data.summary.most_expensive_day && (
                <p className="text-xs text-gray-400 mt-3">
                  Día más caro: <span className="font-medium text-gray-600">{data.summary.most_expensive_day}</span>
                  {" "}— ${data.summary.most_expensive_day_spend.toLocaleString("es-AR")}
                </p>
              )}
            </div>

            {/* C. Perfil por usuario */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">👤 Perfil por usuario</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.user_profiles.map((u) => {
                  const { label, color } = varietyLabel(u.variety_index)
                  return (
                    <div key={u.name} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <span className={`text-xs font-medium ${color}`}>{label}</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-1">
                        Favorito: <span className="text-gray-700 font-medium">{u.favorite_item}</span>
                      </p>
                      <p className="text-sm text-gray-500 mb-2">
                        Participó en <span className="text-gray-700 font-medium">{u.days_participated}</span> días
                        {" "}({u.total_orders} pedidos)
                      </p>
                      {(u.favorite_bread || u.favorite_dressing) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {u.favorite_bread && (
                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                              {u.favorite_bread}
                            </span>
                          )}
                          {u.favorite_dressing && (
                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                              {u.favorite_dressing}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
