import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { Lot } from "@/types/auction";
import { AdminLotCard } from "@/components/auction/AdminLotCard";
export { AdminLotForm } from "@/components/auction/AdminLotForm";

export function AdminScreen({ lots, onEditLot, onNewLot, onUpdateStatus, onStopLot }: {
  lots: Lot[];
  onEditLot: (id: string) => void;
  onNewLot: () => void;
  onUpdateStatus: (id: string, status: Lot["paymentStatus"]) => void;
  onStopLot: (id: string) => void;
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
            { label: "Всего ставок", val: lots.reduce((s, l) => s + (l.bidCount ?? l.bids.length), 0), color: "text-[#2787F5]" },
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
          className="w-full flex items-center justify-center gap-2 border border-[#E0E0E0] bg-white rounded-xl py-2.5 text-sm font-medium text-[#1C1C1E]"
        >
          <Icon name="Download" size={15} />
          Экспорт результатов CSV
        </button>

        {/* Lot list */}
        {lots.map((lot) => (
          <AdminLotCard
            key={lot.id}
            lot={lot}
            expanded={expandedId === lot.id}
            onToggle={() => setExpandedId(expandedId === lot.id ? null : lot.id)}
            onEditLot={onEditLot}
            onUpdateStatus={onUpdateStatus}
            onStopLot={onStopLot}
          />
        ))}
      </div>
    </div>
  );
}
