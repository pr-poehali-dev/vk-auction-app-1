import Icon from "@/components/ui/icon";
import type { Lot } from "@/types/auction";
import { formatPrice } from "@/components/auction/LotScreens";

const paymentLabels: Record<string, string> = {
  pending: "Ожидает", paid: "Оплачен", issued: "Выдан", cancelled: "Отменён",
};
const paymentColors: Record<string, string> = {
  pending: "bg-[#FFF8E1] text-[#92400E] border-[#F59E0B]",
  paid: "bg-[#E8F5E9] text-[#2E7D32] border-[#4CAF50]",
  issued: "bg-[#E3F2FD] text-[#1565C0] border-[#2787F5]",
  cancelled: "bg-[#FFEBEE] text-[#C62828] border-[#EF5350]",
};

export function AdminLotCard({ lot, expanded, onToggle, onEditLot, onUpdateStatus, onStopLot }: {
  lot: Lot;
  expanded: boolean;
  onToggle: () => void;
  onEditLot: (id: string) => void;
  onUpdateStatus: (id: string, status: Lot["paymentStatus"]) => void;
  onStopLot: (id: string) => void;
}) {
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onToggle}>
        <img
          src={lot.image || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"}
          alt={lot.title}
          className="w-12 h-12 rounded-xl object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-[#1C1C1E] truncate">{lot.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              lot.status === "active" ? "bg-[#E8F5E9] text-[#2E7D32]" :
              lot.status === "finished" ? "bg-[#E8E8E8] text-[#767676]" : "bg-[#FFF3E0] text-[#FF6B35]"
            }`}>
              {lot.status === "active" ? "Активен" : lot.status === "finished" ? "Завершён" : "Отменён"}
            </span>
            <span className="text-[11px] text-[#767676]">{formatPrice(lot.currentPrice)}</span>
            <span className="text-[11px] text-[#767676]">· {lot.bidCount ?? lot.bids.length} ставок</span>
          </div>
        </div>
        <Icon
          name={expanded ? "ChevronUp" : "ChevronDown"}
          size={18}
          className="text-[#767676] self-center shrink-0"
        />
      </div>

      {expanded && (
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
              <button
                onClick={() => onStopLot(lot.id)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#FFEBEE] rounded-xl py-2 text-sm text-[#C62828] font-medium"
              >
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
  );
}
