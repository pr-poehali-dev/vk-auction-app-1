import Icon from "@/components/ui/icon";
import type { Lot } from "@/types/auction";
import { formatPrice, formatTimer, getStatusLabel, useTimer, maskVKId } from "@/components/auction/lotUtils";

export function DesktopTimerBadge({ endsAt }: { endsAt: Date }) {
  const ms = useTimer(endsAt);
  const isUrgent = ms > 0 && ms < 5 * 60 * 1000;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isUrgent ? "bg-red-500/15 text-red-500" : "bg-black/25 text-white"}`}>
      <Icon name="Clock" size={10} />
      {formatTimer(ms)}
    </span>
  );
}

export function DesktopLotCard({ lot, onClick, isActive: isSelected, isAdmin = false }: { lot: Lot; onClick: () => void; isActive: boolean; isAdmin?: boolean }) {
  const status = getStatusLabel(lot);
  const leaderName = lot.leaderName ?? lot.bids[0]?.userName;
  const dn = (name: string, userId: string) => isAdmin ? name : maskVKId(userId);

  return (
    <div
      onClick={onClick}
      className="flex gap-4 bg-white rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-md"
      style={{
        boxShadow: isSelected
          ? "0 0 0 2px #C9A84C, 0 4px 16px #C9A84C22"
          : "0 1px 6px #C9A84C14, 0 0 0 1px #EDE0C8",
      }}
    >
      {/* Thumbnail */}
      <div className="relative shrink-0 w-28 h-24 lg:w-40 lg:h-28 overflow-hidden rounded-l-2xl">
        {lot.video?.startsWith("https://cdn.poehali.dev") ? (
          <video
            src={lot.video + "#t=0.5"}
            className="w-full h-full object-cover"
            preload="metadata"
            muted
            playsInline
          />
        ) : (
          <img
            src={lot.image || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"}
            alt={lot.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />
        {lot.video && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(201,168,76,0.85)" }}>
              <svg width="12" height="14" viewBox="0 0 18 20" fill="white"><path d="M2 1.5L16 10L2 18.5V1.5Z" /></svg>
            </div>
          </div>
        )}
        <span className={`absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
          {status.label}
        </span>
        {lot.status === "active" && (
          <div className="absolute bottom-2 left-2">
            <DesktopTimerBadge endsAt={lot.endsAt} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 py-3 pr-4 min-w-0 flex flex-col justify-between">
        <div>
          <p className="font-semibold text-[15px] text-[#1C1A16] leading-snug line-clamp-1 mb-1">{lot.title}</p>
          <p className="text-[13px] text-[#B8A070] line-clamp-2 leading-relaxed">{lot.description}</p>
        </div>
        <div className="flex items-center justify-between mt-2 mb-1">
          <div>
            <p className="text-[11px] text-[#B8A070] mb-0.5">Текущая ставка</p>
            <p className="text-[18px] font-bold leading-none" style={{ color: "#B8922A" }}>{formatPrice(lot.currentPrice)}</p>
          </div>
          {leaderName && (
            <div className="flex items-center gap-1.5 text-xs text-[#B8A070]">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: "#C9A84C" }}>
                {lot.leaderAvatar ?? lot.bids[0]?.userAvatar ?? "?"}
              </div>
              <span className="max-w-[100px] truncate">{dn(leaderName ?? "", lot.leaderId ?? lot.bids[0]?.userId ?? "")}</span>
            </div>
          )}
        </div>
        {lot.bids && lot.bids.length > 0 && (
          <div className="space-y-1 pt-2" style={{ borderTop: "1px solid #EDE8DF" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#B8A070] uppercase tracking-wide">Последние ставки</span>
              {lot.bidCount != null && <span className="text-[10px] text-[#B8A070]">{lot.bidCount} {lot.bidCount === 1 ? "ставка" : lot.bidCount < 5 ? "ставки" : "ставок"}</span>}
            </div>
            {lot.bids.slice(0, 3).map((b, i) => (
              <div key={b.id} className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: i === 0 ? "#C9A84C" : "#D5CABC" }}>
                  {b.userAvatar}
                </div>
                {isAdmin ? (
                  <a href={`https://vk.com/id${b.userId}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[12px] flex-1 truncate underline decoration-dotted" style={{ color: "#2787F5" }}>{b.userName}</a>
                ) : (
                  <span className="text-[12px] text-[#767676] flex-1 truncate">{maskVKId(b.userId)}</span>
                )}
                <span className="text-[12px] font-semibold shrink-0" style={{ color: i === 0 ? "#B8922A" : "#9A8E7A" }}>{formatPrice(b.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}