import { useState, useEffect } from "react";
import type { Lot } from "@/types/auction";

export function formatTimer(ms: number): string {
  if (ms <= 0) return "Завершён";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

export function formatPrice(n: number): string {
  return n.toLocaleString("ru-RU") + " ₽";
}

export function formatTime(d: Date): string {
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function maskVKId(userId: string): string {
  if (!userId) return "***";
  const slug = /^\d+$/.test(userId) ? `id${userId}` : userId;
  return slug.slice(0, 3) + "*";
}

export function getStatusLabel(lot: Lot) {
  if (lot.status === "active") return { label: "Идёт", color: "bg-[#4CAF50] text-white" };
  if (lot.status === "finished") return { label: "Завершён", color: "bg-[#E8E8E8] text-[#767676]" };
  if (lot.status === "upcoming") return { label: "Скоро", color: "bg-[#E3F2FD] text-[#2787F5]" };
  return { label: "Отменён", color: "bg-[#FFF3E0] text-[#FF6B35]" };
}

export function useTimer(endsAt: Date): number {
  const [ms, setMs] = useState(() => endsAt.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setMs(endsAt.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return ms;
}