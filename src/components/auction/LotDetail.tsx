import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { Lot, User, Screen } from "@/types/auction";
import { formatPrice, formatTime, getStatusLabel, useTimer } from "@/components/auction/lotUtils";
import { TimerBadge } from "@/components/auction/LotCard";

// ─── VK Video Player ──────────────────────────────────────────────────────────
export function parseVKVideoEmbed(url: string): string | null {
  if (!url) return null;
  const matchDirect = url.match(/vk\.com\/video(-?\d+_\d+)/);
  if (matchDirect) {
    return `https://vk.com/video_ext.php?oid=${matchDirect[1].split("_")[0]}&id=${matchDirect[1].split("_")[1]}&hd=2`;
  }
  const matchZ = url.match(/video(-?\d+_\d+)/);
  if (matchZ) {
    return `https://vk.com/video_ext.php?oid=${matchZ[1].split("_")[0]}&id=${matchZ[1].split("_")[1]}&hd=2`;
  }
  if (url.includes("video_ext.php")) return url;
  return null;
}

// ─── Bid Modal ─────────────────────────────────────────────────────────────────
export function BidModal({ lot, user, onClose, onBid }: { lot: Lot; user: User; onClose: () => void; onBid: (amount: number) => string }) {
  const [customAmount, setCustomAmount] = useState("");
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const minBid = lot.currentPrice + lot.step;

  function handleBid(amount: number) {
    const msg = onBid(amount);
    if (msg === "ok") {
      setResult({ type: "success", text: `Ставка ${formatPrice(amount)} принята!` });
    } else {
      setResult({ type: "error", text: msg });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-[390px] bg-white rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-4" />
        <h3 className="font-semibold text-[17px] text-[#1C1C1E] mb-1">{lot.title}</h3>
        <p className="text-sm text-[#767676] mb-4">
          Минимальная ставка: <span className="text-[#2787F5] font-semibold">{formatPrice(minBid)}</span>
        </p>

        {result ? (
          <div className={`rounded-xl p-4 text-center ${result.type === "success" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#FFEBEE] text-[#C62828]"}`}>
            <Icon name={result.type === "success" ? "CheckCircle" : "XCircle"} size={28} className="mx-auto mb-2" />
            <p className="font-semibold">{result.text}</p>
            <button onClick={onClose} className="mt-3 text-sm underline opacity-70">Закрыть</button>
          </div>
        ) : (
          <>
            <button
              onClick={() => handleBid(minBid)}
              className="w-full bg-[#2787F5] text-white rounded-xl py-3.5 font-semibold text-[15px] mb-3 active:opacity-80 transition-opacity"
            >
              + шаг — {formatPrice(minBid)}
            </button>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={`Своя сумма (от ${minBid})`}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="flex-1 border border-[#E0E0E0] rounded-xl px-3 py-3 text-[15px] outline-none focus:border-[#2787F5]"
              />
              <button
                onClick={() => handleBid(Number(customAmount))}
                disabled={!customAmount || Number(customAmount) < minBid}
                className="bg-[#F0F2F5] rounded-xl px-4 font-semibold text-[#1C1C1E] disabled:opacity-40 transition-opacity"
              >
                Ставить
              </button>
            </div>
            <p className="text-[11px] text-[#767676] text-center mt-3">
              Вы: <span className="font-medium text-[#1C1C1E]">{user.name}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Screen: Lot ───────────────────────────────────────────────────────────────
export function LotScreen({ lot, user, onBack, onBid }: {
  lot: Lot;
  user: User;
  onBack: () => void;
  onBid: (lotId: string, amount: number) => string;
}) {
  const [showBidModal, setShowBidModal] = useState(false);
  const ms = useTimer(lot.endsAt);
  const isActive = lot.status === "active" && ms > 0;
  const leader = lot.bids[0];
  const status = getStatusLabel(lot);

  const hasVideo = Boolean(lot.video && parseVKVideoEmbed(lot.video));

  return (
    <div className="flex flex-col h-full">
      {/* Шапка: видео или фото */}
      {hasVideo ? (
        <div className="relative shrink-0 bg-black">
          <button onClick={onBack} className="absolute top-3 left-3 z-10 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
            <Icon name="ChevronLeft" size={20} />
          </button>
          <div className="absolute top-3 right-3 z-10 flex gap-1.5">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
            {isActive && <TimerBadge endsAt={lot.endsAt} />}
          </div>
          <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
            <iframe
              src={parseVKVideoEmbed(lot.video!)!}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              frameBorder="0"
            />
          </div>
        </div>
      ) : (
        <div className="relative shrink-0">
          <img src={lot.image} alt={lot.title} className="w-full h-64 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <button onClick={onBack} className="absolute top-3 left-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
            <Icon name="ChevronLeft" size={20} />
          </button>
          <div className="absolute top-3 right-3 flex gap-1.5">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
            {isActive && <TimerBadge endsAt={lot.endsAt} />}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4">
          <h2 className="text-[20px] font-bold text-[#1C1C1E] mb-1">{lot.title}</h2>
          <p className="text-sm text-[#767676] leading-relaxed mb-4">{lot.description}</p>

          {/* Price Block */}
          <div className="bg-[#F0F2F5] rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-[#767676] mb-0.5">Текущая ставка</p>
                <p className="text-[28px] font-bold text-[#2787F5] leading-none">{formatPrice(lot.currentPrice)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#767676] mb-0.5">Шаг</p>
                <p className="text-[15px] font-semibold text-[#1C1C1E]">+{formatPrice(lot.step)}</p>
              </div>
            </div>
            {leader && (
              <div className="flex items-center gap-2 border-t border-[#E0E0E0] pt-3">
                <div className="w-8 h-8 rounded-full bg-[#2787F5] text-white flex items-center justify-center text-xs font-bold">
                  {leader.userAvatar}
                </div>
                <div>
                  <p className="text-[11px] text-[#767676]">Лидирует</p>
                  <p className="text-[13px] font-semibold text-[#1C1C1E]">{leader.userName}</p>
                </div>
                {leader.userId === user.id && (
                  <span className="ml-auto text-xs bg-[#4CAF50]/15 text-[#2E7D32] font-medium px-2 py-0.5 rounded-full">Это вы!</span>
                )}
              </div>
            )}
          </div>

          {lot.antiSnipe && isActive && (
            <div className="flex items-start gap-2 bg-[#FFF8E1] rounded-xl p-3 mb-4">
              <Icon name="Shield" size={14} className="text-[#F59E0B] mt-0.5 shrink-0" />
              <p className="text-xs text-[#92400E]">
                Защита от снайпинга: ставка в последние {lot.antiSnipeMinutes} мин. автоматически продлит аукцион
              </p>
            </div>
          )}

          {lot.status === "finished" && lot.winnerName && (
            <div className="bg-[#E8F5E9] rounded-2xl p-4 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#4CAF50] text-white flex items-center justify-center">
                <Icon name="Trophy" size={18} />
              </div>
              <div>
                <p className="text-xs text-[#4CAF50] font-medium">Победитель</p>
                <p className="font-bold text-[#1C1C1E]">{lot.winnerName}</p>
                <p className="text-sm text-[#767676]">{formatPrice(lot.currentPrice)}</p>
              </div>
            </div>
          )}

          {/* Bid History */}
          <div className="mb-4">
            <p className="text-[12px] font-semibold text-[#767676] uppercase tracking-wide mb-2">История ставок</p>
            {lot.bids.length === 0 ? (
              <p className="text-sm text-[#767676] text-center py-4">Ставок ещё нет — будьте первым!</p>
            ) : (
              <div className="space-y-2">
                {lot.bids.slice(0, 10).map((bid, i) => (
                  <div key={bid.id} className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? "bg-[#E3F2FD]" : "bg-white border border-[#F0F0F0]"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-[#2787F5] text-white" : "bg-[#E8E8E8] text-[#767676]"}`}>
                      {bid.userAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1C1C1E] truncate">{bid.userName}</p>
                      <p className="text-[11px] text-[#767676]">{formatTime(bid.createdAt)}</p>
                    </div>
                    <p className={`text-[14px] font-bold shrink-0 ${i === 0 ? "text-[#2787F5]" : "text-[#1C1C1E]"}`}>
                      {formatPrice(bid.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isActive && (
        <div className="px-4 pb-6 pt-3 border-t border-[#E8E8E8] bg-white shrink-0">
          <button
            onClick={() => setShowBidModal(true)}
            className="w-full bg-[#2787F5] text-white rounded-xl py-3.5 font-bold text-[16px] shadow-lg shadow-[#2787F5]/20 active:opacity-80 transition-opacity"
          >
            Сделать ставку
          </button>
        </div>
      )}

      {showBidModal && (
        <BidModal lot={lot} user={user} onClose={() => setShowBidModal(false)} onBid={(amount) => onBid(lot.id, amount)} />
      )}
    </div>
  );
}

// ─── Bottom Nav ────────────────────────────────────────────────────────────────
export function BottomNav({ screen, onNav, isAdmin }: { screen: Screen; onNav: (s: Screen) => void; isAdmin: boolean }) {
  const items = [
    { id: "catalog" as Screen, icon: "LayoutGrid" as const, label: "Лоты" },
    { id: "bids" as Screen, icon: "Gavel" as const, label: "Ставки" },
    { id: "profile" as Screen, icon: "User" as const, label: "Профиль" },
    ...(isAdmin ? [{ id: "admin" as Screen, icon: "Settings" as const, label: "Админ" }] : []),
  ];

  if (screen === "lot" || screen === "admin-lot") return null;

  return (
    <nav className="flex shrink-0" style={{ background: "#0F0D0A", borderTop: "1px solid #2E2920" }}>
      {items.map((item) => {
        const active = screen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all"
            style={{ color: active ? "#C9A84C" : "#4A3F28" }}
          >
            <Icon name={item.icon} size={22} />
            <span className="text-[10px] font-medium">{item.label}</span>
            {active && (
              <span className="block w-4 h-0.5 rounded-full mt-0.5" style={{ background: "#C9A84C" }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}