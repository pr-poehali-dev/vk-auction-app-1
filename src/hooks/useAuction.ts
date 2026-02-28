import { useState, useEffect, useCallback, useRef } from "react";
import bridge from "@vkontakte/vk-bridge";
import { useVKUser } from "@/hooks/useVKUser";
import type { Lot, User, Screen } from "@/types/auction";
import { apiGetLots, apiGetLot, apiPlaceBid, apiSetAutoBid, apiAdmin, normalizeLot } from "@/api/auction";

export function useAuction() {
  const [screen, setScreen] = useState<Screen>("catalog");
  const [lots, setLots] = useState<Lot[]>([]);
  const [activeLot, setActiveLot] = useState<Lot | null>(null);
  const [editingLotId, setEditingLotId] = useState<string | null | "new">(null);
  const [loading, setLoading] = useState(true);
  const notifiedLots = useRef<Set<string>>(new Set());
  const vkUser = useVKUser();
  const vkUserId = vkUser.id;

  const user: User = {
    id: vkUser.screenName,
    numericId: vkUser.id,
    name: vkUser.name,
    avatar: vkUser.avatar,
    photoUrl: vkUser.photoUrl,
    isAdmin: vkUser.isAdmin,
  };

  function notifyWinner(lot: Lot) {
    if (notifiedLots.current.has(lot.id)) return;
    notifiedLots.current.add(lot.id);
    bridge.send("VKWebAppShowMessageBox", {
      title: "🏆 Вы победили!",
      message: `Поздравляем! Вы выиграли лот «${lot.title}» за ${lot.currentPrice.toLocaleString("ru-RU")} ₽. Свяжитесь с организатором для получения приза.`,
      button_text: "Отлично!",
    }).catch(() => null);
  }

  const loadLots = useCallback(async () => {
    try {
      const data = await apiGetLots();
      if (Array.isArray(data)) {
        const normalized = data.map(normalizeLot);
        setLots(normalized);
        normalized.forEach((lot) => {
          if (lot.status === "finished" && lot.winnerId === vkUser.screenName && vkUser.screenName !== "guest") {
            notifyWinner(lot);
          }
        });
      }
    } catch {
      // keep previous state on error
    } finally {
      setLoading(false);
    }
  }, [vkUserId]);

  useEffect(() => {
    loadLots();
    const id = setInterval(loadLots, 15000);
    return () => clearInterval(id);
  }, [loadLots]);

  async function loadLot(id: string) {
    try {
      const data = await apiGetLot(Number(id), user.id !== "guest" ? user.id : undefined);
      if (!Array.isArray(data) && data && !data.error) {
        setActiveLot(normalizeLot(data as Record<string, unknown>));
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (screen !== "lot" || !activeLot) return;
    const id = setInterval(() => loadLot(activeLot.id), 5000);
    return () => clearInterval(id);
  }, [screen, activeLot?.id]);

  async function handleBid(lotId: string, amount: number): Promise<string> {
    try {
      const res = await apiPlaceBid(Number(lotId), amount, user) as Record<string, unknown>;
      if (res.error) return String(res.error);
      await Promise.all([loadLot(lotId), loadLots()]);
      return "ok";
    } catch {
      return "Ошибка сети. Попробуйте ещё раз.";
    }
  }

  async function handleSaveLot(data: Partial<Lot>, lotId?: string | null) {
    // lotId: "new" = создать, число/строка = обновить, undefined = брать из editingLotId
    const targetId = lotId !== undefined ? lotId : editingLotId;
    let res: Record<string, unknown>;
    const isNew = !data.id || data.id === "new" || targetId === "new";
    if (isNew) {
      res = await apiAdmin({
        action: "create",
        title: data.title,
        description: data.description,
        image: data.image,
        video: data.video,
        videoDuration: data.videoDuration,
        startPrice: data.startPrice,
        step: data.step,
        startsAt: data.startsAt?.toISOString() ?? null,
        endsAt: data.endsAt?.toISOString(),
        antiSnipe: data.antiSnipe,
        antiSnipeMinutes: data.antiSnipeMinutes,
      }) as Record<string, unknown>;
    } else {
      const id = data.id || targetId;
      res = await apiAdmin({
        action: "update",
        lotId: Number(id),
        title: data.title,
        description: data.description,
        image: data.image,
        video: data.video,
        videoDuration: data.videoDuration,
        step: data.step,
        startsAt: data.startsAt?.toISOString() ?? null,
        endsAt: data.endsAt?.toISOString(),
        antiSnipe: data.antiSnipe,
        antiSnipeMinutes: data.antiSnipeMinutes,
      }) as Record<string, unknown>;
    }
    if (res?.error) throw new Error(String(res.error));
    await loadLots();
  }

  async function handleAutoBid(lotId: string, maxAmount: number): Promise<string> {
    try {
      const res = await apiSetAutoBid(Number(lotId), maxAmount, user) as Record<string, unknown>;
      if (res.error) return String(res.error);
      await loadLot(lotId);
      return "ok";
    } catch {
      return "Ошибка сети. Попробуйте ещё раз.";
    }
  }

  async function handleUpdateStatus(id: string, status: Lot["paymentStatus"]) {
    await apiAdmin({ action: "update", lotId: Number(id), paymentStatus: status });
    setLots((p) => p.map((l) => l.id === id ? { ...l, paymentStatus: status } : l));
  }

  async function handleStopLot(id: string) {
    await apiAdmin({ action: "stop", lotId: Number(id) });
    await loadLots();
  }

  function goLot(id: string) {
    const found = lots.find((l) => l.id === id) || null;
    setActiveLot(found);
    loadLot(id);
    setScreen("lot");
  }

  const editingLot = editingLotId === "new" ? null : lots.find((l) => l.id === editingLotId) || null;

  return {
    screen, setScreen,
    lots,
    activeLot,
    editingLot,
    editingLotId, setEditingLotId,
    loading,
    user,
    vkUser,
    goLot,
    handleBid,
    handleAutoBid,
    handleSaveLot,
    handleUpdateStatus,
    handleStopLot,
    loadLots,
  };
}