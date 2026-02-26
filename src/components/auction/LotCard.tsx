import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { Lot } from "@/types/auction";
import { formatTimer, formatPrice, getStatusLabel, useTimer } from "@/components/auction/lotUtils";

export function TimerBadge({ endsAt }: { endsAt: Date }) {
  const ms = useTimer(endsAt);
  const isUrgent = ms > 0 && ms < 5 * 60 * 1000;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${isUrgent ? "bg-red-500/15 text-red-500" : "bg-black/25 text-white"}`}>
      <Icon name="Clock" size={10} />
      {formatTimer(ms)}
    </span>
  );
}

export function LotCard({ lot, onClick }: { lot: Lot; onClick: () => void }) {
  const status = getStatusLabel(lot);
  const leaderName = lot.leaderName ?? lot.bids[0]?.userName;
  const leaderAvatar = lot.leaderAvatar ?? lot.bids[0]?.userAvatar;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
      style={{ boxShadow: "0 1px 8px #C9A84C18, 0 0 0 1px #EDE0C8" }}
    >
      <div className="relative">
        <img
          src={lot.image || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"}
          alt={lot.title}
          className="w-full h-44 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
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
        <p className="font-semibold text-[15px] text-[#1C1A16] leading-snug mb-2 line-clamp-1">{lot.title}</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#B8A070] mb-0.5">Текущая ставка</p>
            <p className="text-[18px] font-bold leading-none" style={{ color: "#B8922A" }}>{formatPrice(lot.currentPrice)}</p>
          </div>
          {leaderName && (
            <div className="flex items-center gap-1.5 text-xs text-[#B8A070]">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "#C9A84C" }}>
                {leaderAvatar ?? "?"}
              </div>
              <span className="max-w-[80px] truncate">{leaderName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CatalogScreen({ lots, onLot }: { lots: Lot[]; onLot: (id: string) => void }) {
  const [tab, setTab] = useState<"active" | "finished">("active");
  const filtered = lots.filter((l) =>
    tab === "active" ? l.status === "active" || l.status === "upcoming" : l.status === "finished" || l.status === "cancelled"
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-[#EDE8DF]">
        <h1 className="text-[22px] font-bold text-[#1C1A16] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.02em" }}>
          Лоты
        </h1>
        <div className="flex bg-[#F5F0E8] rounded-xl p-0.5">
          {(["active", "finished"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-1.5 text-sm font-medium rounded-[10px] transition-all"
              style={tab === t ? { background: "white", color: "#1C1A16", boxShadow: "0 1px 4px #C9A84C22" } : { color: "#B8A070" }}
            >
              {t === "active" ? "Активные" : "Завершённые"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 bg-[#F7F4EF]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#C5B89A]">
            <Icon name="Inbox" size={40} className="mb-3 opacity-40" />
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
