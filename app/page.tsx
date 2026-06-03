"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { MENU_ITEMS } from "@/lib/menu";
import type { MenuItem } from "@/lib/types";
import { MenuCard } from "./components/MenuCard";
import { getOrderPhrase } from "@/lib/order";
import {
  trackItemClicked,
  trackOrderConfirmed,
  trackStepChanged,
  trackSortChanged,
  trackMagicLinkUsed,
  trackOrderError,
  trackBreadSelected,
  trackDressingToggled,
} from "@/lib/analytics";

type Step = "name" | "menu" | "confirm" | "done";

export default function OrderPage() {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedBread, setSelectedBread] = useState("");
  const [selectedDressing, setSelectedDressing] = useState<string[]>([]);
  const [orderPhrase, setOrderPhrase] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "price" | "name">("default");
  const [slackUserId, setSlackUserId] = useState<string | null>(null);
  const tokenChecked = useRef(false);
  const confirmHistoryPushed = useRef(false);

  useEffect(() => {
    if (tokenChecked.current) return;
    tokenChecked.current = true;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) return;
    fetch(`/api/auth/token?token=${t}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { name: string; slack_user_id?: string }) => {
        setToken(t);
        setName(data.name);
        setSlackUserId(data.slack_user_id ?? null);
        setTokenVerified(true);
        trackMagicLinkUsed(data.name, data.slack_user_id ?? "anonymous");
        trackStepChanged("name", "menu", data.name);
        setStep("menu");
      })
      .catch(() => {
        setTokenError(
          "Tu link expiró o no es válido. Escribí tu nombre para continuar.",
        );
      });
  }, []);

  useEffect(() => {
    if (step !== "confirm") {
      confirmHistoryPushed.current = false;
      return;
    }

    function handlePopState() {
      trackStepChanged("confirm", "menu", name);
      setStep("menu");
      confirmHistoryPushed.current = false;
    }

    window.addEventListener("popstate", handlePopState);

    if (!confirmHistoryPushed.current) {
      window.history.pushState({ step: "confirm" }, "");
      confirmHistoryPushed.current = true;
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [step, name]);

  function goToStep(next: Step) {
    trackStepChanged(step, next, name);
    setStep(next);
  }

  function handleSelectItem(item: MenuItem) {
    trackItemClicked(item, name, slackUserId);
    setSelected(item);
    setSelectedBread(item.bread?.[0] ?? "");
    setSelectedDressing([]);
    goToStep("confirm");
  }

  function handleBreadSelect(option: string) {
    trackBreadSelected(selected?.id ?? "", option, name);
    setSelectedBread(option);
  }

  function handleSortChange(key: "price" | "name") {
    const next = sortBy === key ? "default" : key;
    trackSortChanged(next, sortBy, name);
    setSortBy(next);
  }

  function toggleDressing(option: string) {
    const isSelected = selectedDressing.includes(option);
    if (isSelected) {
      trackDressingToggled(selected?.id ?? "", option, "remove", name, slackUserId);
      setSelectedDressing((prev) => prev.filter((d) => d !== option));
    } else if (selectedDressing.length < 2) {
      trackDressingToggled(selected?.id ?? "", option, "add", name, slackUserId);
      setSelectedDressing((prev) => [...prev, option]);
    }
  }

  function handleCancelConfirm() {
    if (confirmHistoryPushed.current) {
      window.history.back();
    } else {
      goToStep("menu");
    }
  }

  async function submitOrder() {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          item_id: selected.id,
          selected_bread: selectedBread || undefined,
          selected_dressing:
            selectedDressing.length > 0 ? selectedDressing : undefined,
          ...(token && { token }),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        const errorMsg = data.error ?? "Ocurrió un error";
        trackOrderError(errorMsg, selected.id, name.trim());
        setError(errorMsg);
        return;
      }
      trackOrderConfirmed(selected, selectedBread || null, selectedDressing, name.trim(), slackUserId, tokenVerified);
      setOrderPhrase(getOrderPhrase());
      goToStep("done");
    } catch {
      setError("No se pudo conectar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">
          🥖 Pedido Sangucheto
        </h1>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {step === "name" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              ¿Quién anda ahí?
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
              Para identificar tu pedido
            </p>
            {tokenError && (
              <p className="text-amber-600 text-sm bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
                {tokenError}
              </p>
            )}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && name.trim().length >= 2 && goToStep("menu")
              }
              placeholder="Nombre"
              disabled={tokenVerified}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 mb-4 disabled:bg-gray-50 disabled:text-gray-400"
              autoFocus={!tokenVerified}
            />
            <button
              disabled={name.trim().length < 2}
              onClick={() => goToStep("menu")}
              className="w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold rounded-xl py-3 transition-colors"
            >
              Ver menú →
            </button>
          </div>
        )}

        {step === "menu" && (
          <>
            <div className="mb-6 flex items-center justify-between gap-3">
              <p className="text-3xl text-gray-500">
                Hola <strong className="text-gray-900">{name}</strong>, ¿cuál te
                vas a pedir hoy? 🤤
              </p>
              <div className="flex gap-2 shrink-0">
                {(["price", "name"] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => handleSortChange(key)}
                    className={`text-sm font-medium px-3 py-1.5 rounded-xl border transition-colors ${
                      sortBy === key
                        ? "bg-gray-900 border-gray-900 text-white"
                        : "border-gray-200 text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    {key === "price" ? "Precio" : "Nombre"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[...MENU_ITEMS]
                .sort((a, b) =>
                  sortBy === "price" ? a.price - b.price :
                  sortBy === "name"  ? a.name.localeCompare(b.name) : 0
                )
                .map((item) => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    onClick={() => handleSelectItem(item)}
                  />
                ))}
            </div>
          </>
        )}

        {step === "confirm" && selected && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-w-md mx-auto">
            <div className="relative h-52 bg-gray-50">
              <Image
                src={selected.photo_url}
                alt={selected.name}
                fill
                className="object-contain p-4"
              />
            </div>
            <div className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Confirmá tu pedido
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Revisá antes de confirmar
              </p>
              <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  Pedido para
                </p>
                <p className="font-semibold text-gray-900 text-lg">{name}</p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                        Ítem
                      </p>
                      <p className="font-semibold text-gray-900">
                        {selected.name}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {selected.description}
                      </p>
                      <p className="text-gray-500 text-sm shrink-0">
                        ${selected.price.toLocaleString()} aprox
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selected.bread && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Tipo de pan <span className="text-red-400">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selected.bread.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleBreadSelect(option)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                          selectedBread === option
                            ? "bg-gray-900 border-gray-900 text-white"
                            : "border-gray-200 text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selected.dressing && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Aderezo{" "}
                    <span className="text-gray-400 font-normal">
                      (opcional, hasta 2
                      {selectedDressing.length > 0 &&
                        ` — ${selectedDressing.length}/2 elegidos`}
                      )
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selected.dressing.map((option) => {
                      const isSelected = selectedDressing.includes(option);
                      const isDisabled =
                        !isSelected && selectedDressing.length >= 2;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleDressing(option)}
                          disabled={isDisabled}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                            isSelected
                              ? "bg-gray-900 border-gray-900 text-white"
                              : isDisabled
                                ? "border-gray-100 text-gray-300 cursor-not-allowed"
                                : "border-gray-200 text-gray-600 hover:border-gray-400"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCancelConfirm}
                  className="flex-1 border border-gray-200 text-gray-500 font-semibold rounded-xl py-3 hover:bg-gray-50 transition-colors"
                >
                  Cambiar
                </button>
                <button
                  onClick={submitOrder}
                  disabled={loading || (!!selected.bread && !selectedBread)}
                  className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold rounded-xl py-3 transition-colors"
                >
                  {loading ? "Enviando..." : "Confirmar ✓"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "done" && selected && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-w-md mx-auto">
            <div className="relative h-52 bg-gray-50">
              <Image
                src={selected.photo_url}
                alt={selected.name}
                fill
                className="object-contain p-4"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
            </div>
            <div className="px-8 pb-8 text-center">
              <div className="text-4xl mb-3">🥪</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                ¡Listo, {name}!
              </h2>
              <p className="text-gray-500 font-medium text-lg mb-6">
                {selected.name}
              </p>
              <blockquote className="border-l-4 border-gray-200 bg-gray-50 rounded-r-xl px-5 py-4 text-left">
                <p className="text-gray-400 italic text-sm leading-relaxed">
                  "{orderPhrase}"
                </p>
              </blockquote>
              <p className="text-gray-400 text-xs mt-6">
                Tu pedido fue recibido. Podés cerrar esta ventana.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
