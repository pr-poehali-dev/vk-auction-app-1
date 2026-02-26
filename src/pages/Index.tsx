import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = "catalog" | "lot" | "bids" | "profile" | "admin" | "admin-lot";

interface Bid {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  amount: number;
  createdAt: Date;
}

interface Lot {
  id: string;
  title: string;
  description: string;
  image: string;
  startPrice: number;
  currentPrice: number;
  step: number;
  endsAt: Date;
  status: "active" | "finished" | "upcoming" | "cancelled";
  winnerId?: string;
  winnerName?: string;
  antiSnipe: boolean;
  antiSnipeMinutes: number;
  bids: Bid[];
  paymentStatus?: "pending" | "paid" | "issued" | "cancelled";
}

interface User {
  id: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_USER: User = {
  id: "u1",
  name: "Алексей Смирнов",
  avatar: "АС",
  isAdmin: true,
};

const initialLots: Lot[] = [
  {
    id: "l1",
    title: "Картина «Вечер в Питере»",
    description:
      "Оригинальная картина маслом на холсте, 60×80 см. Автор — Анна Кузнецова. Работа написана в 2023 году, подпись автора на обороте.",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80",
    startPrice: 5000,
    currentPrice: 8500,
    step: 500,
    endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000 + 14 * 60 * 1000),
    status: "active",
    antiSnipe: true,
    antiSnipeMinutes: 2,
    bids: [
      { id: "b3", userId: "u2", userName: "Мария П.", userAvatar: "МП", amount: 8500, createdAt: new Date(Date.now() - 5 * 60 * 1000) },
      { id: "b2", userId: "u3", userName: "Дмитрий К.", userAvatar: "ДК", amount: 7500, createdAt: new Date(Date.now() - 20 * 60 * 1000) },
      { id: "b1", userId: "u1", userName: "Алексей С.", userAvatar: "АС", amount: 6500, createdAt: new Date(Date.now() - 45 * 60 * 1000) },
    ],
  },
  {
    id: "l2",
    title: "Handmade украшение «Рассвет»",
    description:
      "Браслет ручной работы из натуральных камней: горный хрусталь, розовый кварц. Длина 18 см, застёжка серебро 925.",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80",
    startPrice: 1200,
    currentPrice: 2100,
    step: 100,
    endsAt: new Date(Date.now() + 5 * 60 * 1000),
    status: "active",
    antiSnipe: true,
    antiSnipeMinutes: 2,
    bids: [
      { id: "b5", userId: "u1", userName: "Алексей С.", userAvatar: "АС", amount: 2100, createdAt: new Date(Date.now() - 2 * 60 * 1000) },
      { id: "b4", userId: "u2", userName: "Мария П.", userAvatar: "МП", amount: 1800, createdAt: new Date(Date.now() - 10 * 60 * 1000) },
    ],
  },
  {
    id: "l3",
    title: "Коллекционная монета СССР 1961",
    description: "Монета 10 копеек 1961 года, состояние UNC. Оригинал, сертификат подлинности прилагается.",
    image: "https://images.unsplash.com/photo-1561414927-6d86591d0c4f?w=600&q=80",
    startPrice: 3000,
    currentPrice: 12500,
    step: 500,
    endsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: "finished",
    winnerId: "u3",
    winnerName: "Дмитрий К.",
    antiSnipe: false,
    antiSnipeMinutes: 2,
    paymentStatus: "paid",
    bids: [
      { id: "b8", userId: "u3", userName: "Дмитрий К.", userAvatar: "ДК", amount: 12500, createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      { id: "b7", userId: "u1", userName: "Алексей С.", userAvatar: "АС", amount: 11000, createdAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000) },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTimer(ms: number): string {
  if (ms <= 0) return "Завершён";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

function formatPrice(n: number): string {
  return n.toLocaleString("ru-RU") + " ₽";
}

function formatTime(d: Date): string {
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function getStatusLabel(lot: Lot) {
  if (lot.status === "active") return { label: "Идёт", color: "bg-[#4CAF50] text-white" };
  if (lot.status === "finished") return { label: "Завершён", color: "bg-[#E8E8E8] text-[#767676]" };
  if (lot.status === "upcoming") return { label: "Скоро", color: "bg-[#E3F2FD] text-[#2787F5]" };
  return { label: "Отменён", color: "bg-[#FFF3E0] text-[#FF6B35]" };
}

// ─── Timer Hook ────────────────────────────────────────────────────────────────
function useTimer(endsAt: Date): number {
  const [ms, setMs] = useState(() => endsAt.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setMs(endsAt.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return ms;
}

// ─── Timer Badge ──────────────────────────────────────────────────────────────
function TimerBadge({ endsAt }: { endsAt: Date }) {
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
function BidModal({ lot, user, onClose, onBid }: { lot: Lot; user: User; onClose: () => void; onBid: (amount: number) => string }) {
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
                className="bg-[#1C1C1E] text-white rounded-xl px-4 font-semibold text-[15px] disabled:opacity-30 transition-opacity"
              >
                Ставить
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Lot Card ──────────────────────────────────────────────────────────────────
function LotCard({ lot, onClick }: { lot: Lot; onClick: () => void }) {
  const status = getStatusLabel(lot);
  const leader = lot.bids[0];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden border border-[#E8E8E8] cursor-pointer active:opacity-80 transition-opacity"
    >
      <div className="relative">
        <img src={lot.image} alt={lot.title} className="w-full h-44 object-cover" />
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
          {leader && (
            <div className="flex items-center gap-1.5 text-xs text-[#767676]">
              <div className="w-6 h-6 rounded-full bg-[#2787F5]/10 text-[#2787F5] flex items-center justify-center text-[10px] font-bold">
                {leader.userAvatar}
              </div>
              <span className="max-w-[80px] truncate">{leader.userName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Catalog ───────────────────────────────────────────────────────────
function CatalogScreen({ lots, onLot }: { lots: Lot[]; onLot: (id: string) => void }) {
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
function LotScreen({ lot, user, onBack, onBid }: {
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
                    <p className={`font-bold text-[15px] shrink-0 ${i === 0 ? "text-[#2787F5]" : "text-[#1C1C1E]"}`}>{formatPrice(bid.amount)}</p>
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
function BidsScreen({ lots, user, onLot }: { lots: Lot[]; user: User; onLot: (id: string) => void }) {
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
function ProfileScreen({ user, lots }: { user: User; lots: Lot[] }) {
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

// ─── Screen: Admin ─────────────────────────────────────────────────────────────
function AdminScreen({ lots, onEditLot, onNewLot, onUpdateStatus }: {
  lots: Lot[];
  onEditLot: (id: string) => void;
  onNewLot: () => void;
  onUpdateStatus: (id: string, status: Lot["paymentStatus"]) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function downloadCSV() {
    const rows = [["Лот", "Победитель", "Цена", "Статус оплаты"]];
    lots.filter((l) => l.status === "finished").forEach((l) => {
      rows.push([l.title, l.winnerName || "—", String(l.currentPrice), l.paymentStatus || "pending"]);
    });
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "auction_results.csv"; a.click();
  }

  const paymentLabels: Record<string, string> = {
    pending: "Ожидает", paid: "Оплачен", issued: "Выдан", cancelled: "Отменён",
  };
  const paymentColors: Record<string, string> = {
    pending: "bg-[#FFF8E1] text-[#92400E] border-[#F59E0B]",
    paid: "bg-[#E8F5E9] text-[#2E7D32] border-[#4CAF50]",
    issued: "bg-[#E3F2FD] text-[#1565C0] border-[#2787F5]",
    cancelled: "bg-[#FFEBEE] text-[#C62828] border-[#EF5350]",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-[#E8E8E8] flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#1C1C1E]">Панель админа</h1>
          <p className="text-xs text-[#767676]">{lots.length} лотов всего</p>
        </div>
        <button onClick={onNewLot} className="flex items-center gap-1.5 bg-[#2787F5] text-white rounded-xl px-3 py-2 text-sm font-semibold">
          <Icon name="Plus" size={16} />
          Новый лот
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Активных", val: lots.filter((l) => l.status === "active").length, color: "text-[#4CAF50]" },
            { label: "Завершённых", val: lots.filter((l) => l.status === "finished").length, color: "text-[#767676]" },
            { label: "Всего ставок", val: lots.reduce((s, l) => s + l.bids.length, 0), color: "text-[#2787F5]" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#E8E8E8] rounded-xl p-3 text-center">
              <p className={`text-[20px] font-bold ${s.color}`}>{s.val}</p>
              <p className="text-[10px] text-[#767676] leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Export */}
        <button
          onClick={downloadCSV}
          className="w-full flex items-center justify-center gap-2 border border-[#E0E0E0] rounded-xl py-2.5 text-sm text-[#1C1C1E] font-medium bg-white"
        >
          <Icon name="Download" size={16} />
          Скачать результаты (CSV)
        </button>

        {/* Lots */}
        {lots.map((lot) => (
          <div key={lot.id} className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
            <div
              className="flex gap-3 p-3 cursor-pointer"
              onClick={() => setExpandedId(expandedId === lot.id ? null : lot.id)}
            >
              <img src={lot.image} alt={lot.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] text-[#1C1C1E] leading-snug truncate">{lot.title}</p>
                <p className="text-[13px] text-[#2787F5] font-semibold">{formatPrice(lot.currentPrice)}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${getStatusLabel(lot).color}`}>
                    {getStatusLabel(lot).label}
                  </span>
                  <span className="text-[11px] text-[#767676]">{lot.bids.length} ставок</span>
                </div>
              </div>
              <Icon
                name={expandedId === lot.id ? "ChevronUp" : "ChevronDown"}
                size={18}
                className="text-[#767676] self-center shrink-0"
              />
            </div>

            {expandedId === lot.id && (
              <div className="border-t border-[#F0F2F5] p-3 space-y-3">
                {lot.status === "finished" && lot.winnerName && (
                  <div className="bg-[#E8F5E9] rounded-xl p-2.5 flex items-center gap-2 text-sm">
                    <Icon name="Trophy" size={14} className="text-[#4CAF50] shrink-0" />
                    <span className="text-[#2E7D32]">Победитель: <strong>{lot.winnerName}</strong> — {formatPrice(lot.currentPrice)}</span>
                  </div>
                )}

                {lot.status === "finished" && (
                  <div>
                    <p className="text-[11px] text-[#767676] mb-2 font-medium uppercase tracking-wide">Статус оплаты</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(["pending", "paid", "issued", "cancelled"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => onUpdateStatus(lot.id, s)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${lot.paymentStatus === s ? paymentColors[s] : "border-[#E0E0E0] text-[#767676] bg-white"}`}
                        >
                          {paymentLabels[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => onEditLot(lot.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-[#E0E0E0] rounded-xl py-2 text-sm text-[#1C1C1E] font-medium"
                  >
                    <Icon name="Pencil" size={14} />
                    Редактировать
                  </button>
                  {lot.status === "active" && (
                    <button className="flex-1 flex items-center justify-center gap-1.5 bg-[#FFEBEE] rounded-xl py-2 text-sm text-[#C62828] font-medium">
                      <Icon name="Square" size={14} />
                      Остановить
                    </button>
                  )}
                </div>

                {lot.bids.length > 0 && (
                  <div>
                    <p className="text-[11px] text-[#767676] font-medium mb-1.5 uppercase tracking-wide">Последние ставки</p>
                    <div className="space-y-1.5">
                      {lot.bids.slice(0, 5).map((b, i) => (
                        <div key={b.id} className="flex items-center gap-2 text-[12px]">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${i === 0 ? "bg-[#2787F5] text-white" : "bg-[#E0E0E0] text-[#767676]"}`}>
                            {b.userAvatar}
                          </div>
                          <span className="flex-1 text-[#1C1C1E] truncate">{b.userName}</span>
                          <span className="font-semibold text-[#1C1C1E]">{formatPrice(b.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Screen: Admin Lot Form ────────────────────────────────────────────────────
function AdminLotForm({ lot, onBack, onSave }: {
  lot: Partial<Lot> | null;
  onBack: () => void;
  onSave: (data: Partial<Lot>) => void;
}) {
  const isNew = !lot?.id;
  const [form, setForm] = useState({
    title: lot?.title || "",
    description: lot?.description || "",
    image: lot?.image || "",
    startPrice: lot?.startPrice || 1000,
    step: lot?.step || 100,
    endsAt: lot?.endsAt ? new Date(lot.endsAt).toISOString().slice(0, 16) : "",
    antiSnipe: lot?.antiSnipe ?? true,
    antiSnipeMinutes: lot?.antiSnipeMinutes || 2,
  });

  function set(key: string, val: unknown) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSave() {
    if (!form.title || !form.endsAt) return;
    onSave({
      ...form,
      startPrice: Number(form.startPrice),
      step: Number(form.step),
      antiSnipeMinutes: Number(form.antiSnipeMinutes),
      endsAt: new Date(form.endsAt),
    });
    onBack();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-[#E8E8E8] flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 border border-[#E0E0E0] rounded-full flex items-center justify-center shrink-0">
          <Icon name="ChevronLeft" size={20} />
        </button>
        <h1 className="text-[20px] font-bold text-[#1C1C1E]">{isNew ? "Новый лот" : "Редактировать лот"}</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 mt-3">
        {[
          { label: "Название *", key: "title", placeholder: "Например: Картина маслом 60×80" },
          { label: "Ссылка на фото", key: "image", placeholder: "https://example.com/photo.jpg" },
        ].map((f) => (
          <div key={f.key}>
            <label className="text-[12px] font-semibold text-[#767676] mb-1.5 block uppercase tracking-wide">{f.label}</label>
            <input
              value={(form as Record<string, unknown>)[f.key] as string}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] bg-white"
            />
          </div>
        ))}

        <div>
          <label className="text-[12px] font-semibold text-[#767676] mb-1.5 block uppercase tracking-wide">Описание</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Подробное описание лота..."
            className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] resize-none bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Стартовая цена, ₽", key: "startPrice" },
            { label: "Минимальный шаг, ₽", key: "step" },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-[12px] font-semibold text-[#767676] mb-1.5 block uppercase tracking-wide">{f.label}</label>
              <input
                type="number"
                value={(form as Record<string, unknown>)[f.key] as number}
                onChange={(e) => set(f.key, e.target.value)}
                className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] bg-white"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="text-[12px] font-semibold text-[#767676] mb-1.5 block uppercase tracking-wide">Дата и время окончания *</label>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
            className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] bg-white"
          />
        </div>

        {/* Anti-snipe toggle */}
        <div className="bg-[#F0F2F5] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon name="Shield" size={16} className="text-[#2787F5]" />
              <span className="font-semibold text-[14px] text-[#1C1C1E]">Анти-снайпинг</span>
            </div>
            <button
              onClick={() => set("antiSnipe", !form.antiSnipe)}
              className={`w-11 h-6 rounded-full transition-colors relative ${form.antiSnipe ? "bg-[#2787F5]" : "bg-[#C7C7CC]"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${form.antiSnipe ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
          <p className="text-xs text-[#767676] mb-2">Если ставка сделана в последние минуты, аукцион продлится автоматически</p>
          {form.antiSnipe && (
            <div className="flex items-center gap-3 bg-white rounded-xl p-2.5">
              <p className="text-sm text-[#1C1C1E] flex-1">Продлить на</p>
              <input
                type="number"
                value={form.antiSnipeMinutes}
                onChange={(e) => set("antiSnipeMinutes", e.target.value)}
                min={1}
                max={30}
                className="w-14 border border-[#E0E0E0] rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-[#2787F5]"
              />
              <p className="text-sm text-[#767676]">минут</p>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={!form.title || !form.endsAt}
          className="w-full bg-[#2787F5] text-white rounded-xl py-3.5 font-bold text-[16px] disabled:opacity-40 transition-opacity"
        >
          {isNew ? "Создать лот" : "Сохранить изменения"}
        </button>
      </div>
    </div>
  );
}

// ─── Bottom Nav ────────────────────────────────────────────────────────────────
function BottomNav({ screen, onNav, isAdmin }: { screen: Screen; onNav: (s: Screen) => void; isAdmin: boolean }) {
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

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function Index() {
  const [screen, setScreen] = useState<Screen>("catalog");
  const [lots, setLots] = useState<Lot[]>(initialLots);
  const [activeLotId, setActiveLotId] = useState<string | null>(null);
  const [editingLotId, setEditingLotId] = useState<string | null | "new">(null);
  const user = MOCK_USER;

  // Auto-finish lots
  useEffect(() => {
    const id = setInterval(() => {
      setLots((prev) =>
        prev.map((l) => {
          if (l.status === "active" && l.endsAt.getTime() <= Date.now()) {
            const winner = l.bids[0];
            return {
              ...l,
              status: "finished" as const,
              winnerId: winner?.userId,
              winnerName: winner?.userName,
              paymentStatus: "pending" as const,
            };
          }
          return l;
        })
      );
    }, 2000);
    return () => clearInterval(id);
  }, []);

  function handleBid(lotId: string, amount: number): string {
    let result = "ok";
    setLots((prev) =>
      prev.map((l) => {
        if (l.id !== lotId) return l;
        if (l.status !== "active") {
          result = "Аукцион уже завершён";
          return l;
        }
        if (amount < l.currentPrice + l.step) {
          result = `Ставка слишком маленькая. Минимум: ${formatPrice(l.currentPrice + l.step)}`;
          return l;
        }

        const now = new Date();
        const newBid: Bid = {
          id: `b${Date.now()}`,
          userId: user.id,
          userName: "Алексей С.",
          userAvatar: "АС",
          amount,
          createdAt: now,
        };

        // Anti-snipe: extend if bid in last N minutes
        let endsAt = l.endsAt;
        if (l.antiSnipe) {
          const msLeft = l.endsAt.getTime() - now.getTime();
          if (msLeft > 0 && msLeft < l.antiSnipeMinutes * 60 * 1000) {
            endsAt = new Date(l.endsAt.getTime() + l.antiSnipeMinutes * 60 * 1000);
          }
        }

        return { ...l, currentPrice: amount, endsAt, bids: [newBid, ...l.bids] };
      })
    );
    return result;
  }

  function handleSaveLot(data: Partial<Lot>) {
    if (editingLotId === "new") {
      const newLot: Lot = {
        id: `l${Date.now()}`,
        title: data.title || "",
        description: data.description || "",
        image: data.image || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        startPrice: data.startPrice || 1000,
        currentPrice: data.startPrice || 1000,
        step: data.step || 100,
        endsAt: data.endsAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: "active",
        antiSnipe: data.antiSnipe ?? true,
        antiSnipeMinutes: data.antiSnipeMinutes || 2,
        bids: [],
        paymentStatus: "pending",
      };
      setLots((p) => [newLot, ...p]);
    } else if (editingLotId) {
      setLots((p) => p.map((l) => (l.id === editingLotId ? { ...l, ...data } : l)));
    }
  }

  const activeLot = lots.find((l) => l.id === activeLotId) || null;
  const editingLot = editingLotId === "new" ? null : lots.find((l) => l.id === editingLotId) || null;

  function goLot(id: string) {
    setActiveLotId(id);
    setScreen("lot");
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
          {screen === "catalog" && <CatalogScreen lots={lots} onLot={goLot} />}
          {screen === "lot" && activeLot && (
            <LotScreen
              lot={activeLot}
              user={user}
              onBack={() => setScreen("catalog")}
              onBid={handleBid}
            />
          )}
          {screen === "bids" && <BidsScreen lots={lots} user={user} onLot={goLot} />}
          {screen === "profile" && <ProfileScreen user={user} lots={lots} />}
          {screen === "admin" && (
            <AdminScreen
              lots={lots}
              onEditLot={(id) => { setEditingLotId(id); setScreen("admin-lot"); }}
              onNewLot={() => { setEditingLotId("new"); setScreen("admin-lot"); }}
              onUpdateStatus={(id, s) => setLots((p) => p.map((l) => l.id === id ? { ...l, paymentStatus: s } : l))}
            />
          )}
          {screen === "admin-lot" && (
            <AdminLotForm
              lot={editingLot}
              onBack={() => setScreen("admin")}
              onSave={handleSaveLot}
            />
          )}
        </div>

        {/* Bottom nav */}
        <BottomNav screen={screen} onNav={setScreen} isAdmin={user.isAdmin} />
      </div>
    </div>
  );
}
