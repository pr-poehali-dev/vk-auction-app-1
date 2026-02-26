import { useState, useEffect, useCallback } from "react";
import { useVKUser } from "@/hooks/useVKUser";
import type { Lot, User, Screen } from "@/types/auction";
import { apiGetLots, apiGetLot, apiPlaceBid, apiAdmin, normalizeLot } from "@/api/auction";
import { CatalogScreen, LotScreen, BidsScreen, ProfileScreen, BottomNav } from "@/components/auction/LotScreens";
import { AdminScreen, AdminLotForm } from "@/components/auction/AdminScreens";
import Icon from "@/components/ui/icon";

export default function Index() {
  const [screen, setScreen] = useState<Screen>("catalog");
  const [lots, setLots] = useState<Lot[]>([]);
  const [activeLot, setActiveLot] = useState<Lot | null>(null);
  const [editingLotId, setEditingLotId] = useState<string | null | "new">(null);
  const [loading, setLoading] = useState(true);
  const vkUser = useVKUser();
  const user: User = {
    id: vkUser.id,
    name: vkUser.name,
    avatar: vkUser.avatar,
    isAdmin: vkUser.isAdmin,
  };

  // Load lots list from API
  const loadLots = useCallback(async () => {
    try {
      const data = await apiGetLots();
      if (Array.isArray(data)) {
        setLots(data.map(normalizeLot));
      }
    } catch {
      // keep previous state on error
    } finally {
      setLoading(false);
    }
  }, []);

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
      <div className="min-h-screen bg-[#D9DBE0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2787F5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#8E8E93] text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D9DBE0] flex items-center justify-center p-4">
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Phone shell */}
      <div
        className="relative w-full bg-[#F0F2F5] flex flex-col overflow-hidden shadow-2xl"
        style={{
          maxWidth: 390,
          height: "100svh",
          maxHeight: 844,
          borderRadius: 28,
          fontFamily: "'Golos Text', sans-serif",
        }}
      >
        {/* VK status bar */}
        <div className="bg-white px-5 py-2 flex items-center justify-between shrink-0 border-b border-[#E8E8E8]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#2787F5] flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">ВК</span>
            </div>
            <span className="text-[12px] font-semibold text-[#1C1C1E]">Аукционы сообщества</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="Signal" size={13} className="text-[#1C1C1E]" />
            <Icon name="Battery" size={13} className="text-[#1C1C1E]" />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {loading && screen === "catalog" ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#767676]">
              <div className="w-8 h-8 border-2 border-[#2787F5] border-t-transparent rounded-full animate-spin" />
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
