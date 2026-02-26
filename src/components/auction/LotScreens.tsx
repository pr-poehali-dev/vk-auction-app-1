import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import type { Lot, User, Screen } from "@/types/auction";

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

export function getStatusLabel(lot: Lot) {
  if (lot.status === "active") return { label: "Идёт", color: "bg-[#4CAF50] text-white" };
  if (lot.status === "finished") return { label: "Завершён", color: "bg-[#E8E8E8] text-[#767676]" };
  if (lot.status === "upcoming") return { label: "Скоро", color: "bg-[#E3F2FD] text-[#2787F5]" };
  return { label: "Отменён", color: "bg-[#FFF3E0] text-[#FF6B35]" };
}

// ─── Timer Hook ────────────────────────────────────────────────────────────────
export function useTimer(endsAt: Date): number {
  const [ms, setMs] = useState(() => endsAt.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setMs(endsAt.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return ms;
}

// ─── Timer Badge ──────────────────────────────────────────────────────────────
export function TimerBadge({ endsAt }: { endsAt: Date }) {
  const ms = useTimer(endsAt);
  const isUrgent = ms > 0 && ms < 5 * 60 * 1000;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${isUrgent ? "bg-[#FF6B35]/15 text-[#FF6B35]" : "bg-black/20 text-white"}`}>
      <Icon name="Clock" size={10} />
      {formatTimer(ms)}
    </span>
  );
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

// ─── Lot Card ──────────────────────────────────────────────────────────────────
export function LotCard({ lot, onClick }: { lot: Lot; onClick: () => void }) {
  const status = getStatusLabel(lot);
  const leaderName = lot.leaderName ?? lot.bids[0]?.userName;
  const leaderAvatar = lot.leaderAvatar ?? lot.bids[0]?.userAvatar;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden border border-[#E8E8E8] cursor-pointer active:opacity-80 transition-opacity"
    >
      <div className="relative">
        <img src={lot.image || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"} alt={lot.title} className="w-full h-44 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
          {status.label}
        </span>
        {lot.status === "active" && (
          <div className="absolute top-2 right-2">
            <TimerBadge endsAt={lot.endsAt} />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-[15px] text-[#1C1C1E] leading-snug mb-1 line-clamp-1">{lot.title}</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#767676] mb-0.5">Текущая ставка</p>
            <p className="text-[18px] font-bold text-[#2787F5] leading-none">{formatPrice(lot.currentPrice)}</p>
          </div>
          {leaderName && (
            <div className="flex items-center gap-1.5 text-xs text-[#767676]">
              <div className="w-6 h-6 rounded-full bg-[#2787F5]/10 text-[#2787F5] flex items-center justify-center text-[10px] font-bold">
                {leaderAvatar ?? "??"}
              </div>
              <span className="max-w-[80px] truncate">{leaderName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Catalog ───────────────────────────────────────────────────────────
export function CatalogScreen({ lots, onLot }: { lots: Lot[]; onLot: (id: string) => void }) {
  const [tab, setTab] = useState<"active" | "finished">("active");
  const filtered = lots.filter((l) =>
    tab === "active" ? l.status === "active" || l.status === "upcoming" : l.status === "finished" || l.status === "cancelled"
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 bg-white border-b border-[#E8E8E8]">
        <h1 className="text-[22px] font-bold text-[#1C1C1E] mb-3">Аукционы</h1>
        <div className="flex bg-[#F0F2F5] rounded-xl p-0.5">
          {(["active", "finished"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-[10px] transition-all ${tab === t ? "bg-white text-[#1C1C1E] shadow-sm" : "text-[#767676]"}`}
            >
              {t === "active" ? "Активные" : "Завершённые"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#767676]">
            <Icon name="Inbox" size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Лотов пока нет</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 mt-3">
            {filtered.map((l) => (
              <LotCard key={l.id} lot={l} onClick={() => onLot(l.id)} />
            ))}
          </div>
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

  return (
    <div className="flex flex-col h-full">
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

// ─── Screen: My Bids ───────────────────────────────────────────────────────────
export function BidsScreen({ lots, user, onLot }: { lots: Lot[]; user: User; onLot: (id: string) => void }) {
  const myBids = lots
    .flatMap((l) => l.bids.filter((b) => b.userId === user.id).map((b) => ({ bid: b, lot: l })))
    .sort((a, b) => b.bid.createdAt.getTime() - a.bid.createdAt.getTime());

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-[#E8E8E8]">
        <h1 className="text-[22px] font-bold text-[#1C1C1E]">Мои ставки</h1>
        <p className="text-sm text-[#767676] mt-0.5">Всего: {myBids.length}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {myBids.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#767676]">
            <Icon name="Gavel" size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Вы ещё не делали ставок</p>
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {myBids.map(({ bid, lot }) => {
              const isLeading = lot.bids[0]?.id === bid.id;
              const isWinner = lot.status === "finished" && lot.winnerId === user.id;
              return (
                <div
                  key={bid.id}
                  onClick={() => onLot(lot.id)}
                  className="bg-white border border-[#E8E8E8] rounded-2xl p-4 cursor-pointer active:opacity-80 transition-opacity"
                >
                  <div className="flex gap-3">
                    <img src={lot.image} alt={lot.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[14px] text-[#1C1C1E] leading-snug truncate">{lot.title}</p>
                      <p className="text-[12px] text-[#767676] mt-0.5">{formatTime(bid.createdAt)}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="font-bold text-[#2787F5]">{formatPrice(bid.amount)}</span>
                        {isWinner && <span className="text-[11px] bg-[#4CAF50]/15 text-[#2E7D32] font-semibold px-2 py-0.5 rounded-full">🏆 Победитель</span>}
                        {!isWinner && isLeading && lot.status === "active" && <span className="text-[11px] bg-[#E3F2FD] text-[#2787F5] font-semibold px-2 py-0.5 rounded-full">Лидирую</span>}
                        {!isLeading && lot.status === "active" && <span className="text-[11px] bg-[#FFF3E0] text-[#FF6B35] font-semibold px-2 py-0.5 rounded-full">Перебита</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Screen: Profile ───────────────────────────────────────────────────────────
export function ProfileScreen({ user, lots }: { user: User; lots: Lot[] }) {
  const totalBids = lots.flatMap((l) => l.bids).filter((b) => b.userId === user.id).length;
  const wins = lots.filter((l) => l.status === "finished" && l.winnerId === user.id).length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-[#E8E8E8]">
        <h1 className="text-[22px] font-bold text-[#1C1C1E]">Профиль</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5 mt-3 mb-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#2787F5] text-white flex items-center justify-center text-xl font-bold shrink-0">
            {user.avatar}
          </div>
          <div>
            <p className="font-bold text-[18px] text-[#1C1C1E]">{user.name}</p>
            {user.isAdmin && (
              <span className="text-xs bg-[#E3F2FD] text-[#2787F5] font-semibold px-2 py-0.5 rounded-full">Администратор</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Ставок сделано", value: totalBids, icon: "Gavel" as const },
            { label: "Побед в аукционах", value: wins, icon: "Trophy" as const },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#E8E8E8] rounded-2xl p-4 text-center">
              <Icon name={s.icon} size={20} className="text-[#2787F5] mx-auto mb-1" />
              <p className="text-[26px] font-bold text-[#1C1C1E]">{s.value}</p>
              <p className="text-xs text-[#767676]">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#F0F2F5] rounded-2xl p-4 text-sm text-[#767676]">
          <p className="font-semibold text-[#1C1C1E] mb-1">О приложении</p>
          <p>VK Аукцион — сервис для проведения честных онлайн-торгов внутри сообщества ВКонтакте. Все ставки сохраняются, победитель определяется автоматически.</p>
        </div>
      </div>
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
    <nav className="border-t border-[#E8E8E8] bg-white flex shrink-0">
      {items.map((item) => {
        const active = screen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${active ? "text-[#2787F5]" : "text-[#767676]"}`}
          >
            <Icon name={item.icon} size={22} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
