import { useState, useEffect, useCallback, useRef } from "react";
import bridge from "@vkontakte/vk-bridge";
import { useVKUser } from "@/hooks/useVKUser";
import type { Lot, User, Screen } from "@/types/auction";
import { apiGetLots, apiGetLot, apiPlaceBid, apiAdmin, normalizeLot } from "@/api/auction";
import { CatalogScreen, LotScreen, BidsScreen, ProfileScreen, BottomNav } from "@/components/auction/LotScreens";
import { AdminScreen, AdminLotForm } from "@/components/auction/AdminScreens";

export default function Index() {
  const [screen, setScreen] = useState<Screen>("catalog");
  const [lots, setLots] = useState<Lot[]>([]);
  const [activeLot, setActiveLot] = useState<Lot | null>(null);
  const [editingLotId, setEditingLotId] = useState<string | null | "new">(null);
  const [loading, setLoading] = useState(true);
  const notifiedLots = useRef<Set<string>>(new Set());
  const vkUser = useVKUser();
  const vkUserId = vkUser.id;
  const user: User = {
    id: vkUserId,
    name: vkUser.name,
    avatar: vkUser.avatar,
    isAdmin: vkUser.isAdmin,
  };

  // Notify winner via VK Bridge alert
  function notifyWinner(lot: Lot) {
    if (notifiedLots.current.has(lot.id)) return;
    notifiedLots.current.add(lot.id);
    bridge.send("VKWebAppShowMessageBox", {
      title: "🏆 Вы победили!",
      message: `Поздравляем! Вы выиграли лот «${lot.title}» за ${lot.currentPrice.toLocaleString("ru-RU")} ₽. Свяжитесь с организатором для получения приза.`,
      button_text: "Отлично!",
    }).catch(() => null);
  }

  // Load lots list from API
  const loadLots = useCallback(async () => {
    try {
      const data = await apiGetLots();
      if (Array.isArray(data)) {
        const normalized = data.map(normalizeLot);
        setLots(normalized);
        normalized.forEach((lot) => {
          if (lot.status === "finished" && lot.winnerId === vkUserId && vkUserId !== "guest") {
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
    const id = setInterval(loadLots, 15000); // refresh every 15s
    return () => clearInterval(id);
  }, [loadLots]);

  // Load single lot (with bids)
  async function loadLot(id: string) {
    try {
      const data = await apiGetLot(Number(id));
      if (!Array.isArray(data) && data && !data.error) {
        setActiveLot(normalizeLot(data as Record<string, unknown>));
      }
    } catch { /* ignore */ }
  }

  // Poll active lot every 5s for live updates
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

  async function handleSaveLot(data: Partial<Lot>) {
    if (editingLotId === "new") {
      await apiAdmin({
        action: "create",
        title: data.title,
        description: data.description,
        image: data.image,
        video: data.video,
        videoDuration: data.videoDuration,
        startPrice: data.startPrice,
        step: data.step,
        endsAt: data.endsAt?.toISOString(),
        antiSnipe: data.antiSnipe,
        antiSnipeMinutes: data.antiSnipeMinutes,
      });
    } else if (editingLotId) {
      await apiAdmin({
        action: "update",
        lotId: Number(editingLotId),
        title: data.title,
        description: data.description,
        image: data.image,
        video: data.video,
        videoDuration: data.videoDuration,
        step: data.step,
        endsAt: data.endsAt?.toISOString(),
        antiSnipe: data.antiSnipe,
        antiSnipeMinutes: data.antiSnipeMinutes,
      });
    }
    await loadLots();
  }

  async function handleUpdateStatus(id: string, status: Lot["paymentStatus"]) {
    await apiAdmin({ action: "update", lotId: Number(id), paymentStatus: status });
    setLots((p) => p.map((l) => l.id === id ? { ...l, paymentStatus: status } : l));
  }

  async function handleStopLot(id: string) {
    await apiAdmin({ action: "stop", lotId: Number(id) });
    await loadLots();
  }

  const editingLot = editingLotId === "new" ? null : lots.find((l) => l.id === editingLotId) || null;

  function goLot(id: string) {
    const found = lots.find((l) => l.id === id) || null;
    setActiveLot(found);
    loadLot(id);
    setScreen("lot");
  }

  if (vkUser.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4]">
        <div className="text-center flex flex-col items-center gap-5">
          <img
            src="https://cdn.poehali.dev/projects/0a068cc6-e718-493c-b038-60253ef8dd25/bucket/e8607ced-0dd6-499e-ad13-b8e50e125d2f.jpg"
            alt="Joylots"
            className="w-20 h-20 object-contain"
          />
          <div>
            <p className="font-bold text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#B8922A", letterSpacing: "0.18em" }}>JOYLOTS</p>
            <p className="text-xs mt-1 text-[#B8A070]">Аукцион</p>
          </div>
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin border-[#C9A84C]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EDE8DF]">
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Phone shell */}
      <div
        className="relative w-full bg-[#F7F4EF] flex flex-col overflow-hidden"
        style={{
          maxWidth: 390,
          height: "100svh",
          maxHeight: 844,
          borderRadius: 28,
          fontFamily: "'Golos Text', sans-serif",
          boxShadow: "0 20px 60px #00000030, 0 0 0 1px #D4BF8A44",
        }}
      >
        {/* Joylots header */}
        <div className="bg-white px-4 py-2.5 flex items-center justify-between shrink-0 border-b border-[#EDE8DF]">
          <div className="flex items-center gap-2.5">
            <img
              src="https://cdn.poehali.dev/projects/0a068cc6-e718-493c-b038-60253ef8dd25/bucket/e8607ced-0dd6-499e-ad13-b8e50e125d2f.jpg"
              alt="Joylots"
              className="w-7 h-7 object-contain"
            />
            <span
              className="font-bold text-[16px]"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "#B8922A", letterSpacing: "0.15em" }}
            >
              JOYLOTS
            </span>
          </div>

        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-[#F7F4EF]">
          {loading && screen === "catalog" ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#B8A070]">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[#C9A84C]" />
              <p className="text-sm">Загружаем аукционы…</p>
            </div>
          ) : (
            <>
              {screen === "catalog" && <CatalogScreen lots={lots} onLot={goLot} />}
              {screen === "lot" && activeLot && (
                <LotScreen
                  lot={activeLot}
                  user={user}
                  onBack={() => { setScreen("catalog"); loadLots(); }}
                  onBid={handleBid}
                />
              )}
              {screen === "lot" && !activeLot && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#2787F5] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {screen === "bids" && <BidsScreen lots={lots} user={user} onLot={goLot} />}
              {screen === "profile" && <ProfileScreen user={user} lots={lots} />}
              {screen === "admin" && (
                <AdminScreen
                  lots={lots}
                  onEditLot={(id) => { setEditingLotId(id); setScreen("admin-lot"); }}
                  onNewLot={() => { setEditingLotId("new"); setScreen("admin-lot"); }}
                  onUpdateStatus={handleUpdateStatus}
                  onStopLot={handleStopLot}
                />
              )}
              {screen === "admin-lot" && (
                <AdminLotForm
                  lot={editingLot}
                  onBack={() => setScreen("admin")}
                  onSave={handleSaveLot}
                />
              )}
            </>
          )}
        </div>

        {/* Bottom nav */}
        <BottomNav screen={screen} onNav={setScreen} isAdmin={user.isAdmin} />
      </div>
    </div>
  );
}