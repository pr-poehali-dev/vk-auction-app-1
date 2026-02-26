import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { Lot } from "@/types/auction";
import { formatTimer, formatPrice, getStatusLabel, useTimer } from "@/components/auction/lotUtils";

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
