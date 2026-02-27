import Icon from "@/components/ui/icon";
import type { Lot, User } from "@/types/auction";
import { formatPrice, formatTime } from "@/components/auction/lotUtils";

export function BidsScreen({ lots, user, onLot }: { lots: Lot[]; user: User; onLot: (id: string) => void }) {
  const myBids = lots
    .flatMap((l) => l.bids.filter((b) => b.userId === user.id || (user.numericId != null && (b.userId === user.numericId || b.userId === `id${user.numericId}`))).map((b) => ({ bid: b, lot: l })))
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

export function ProfileScreen({ user, lots }: { user: User; lots: Lot[] }) {
  const isMe = (id: string) =>
    id === user.id ||
    (user.numericId != null && (id === user.numericId || id === `id${user.numericId}`));
  const totalBids = lots.flatMap((l) => l.bids).filter((b) => isMe(b.userId)).length;
  const wins = lots.filter((l) => l.status === "finished" && l.winnerId != null && isMe(l.winnerId)).length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-[#E8E8E8]">
        <h1 className="text-[22px] font-bold text-[#1C1C1E]">Профиль</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5 mt-3 mb-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#2787F5] text-white flex items-center justify-center text-xl font-bold shrink-0 overflow-hidden">
            {user.photoUrl
              ? <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              : user.avatar}
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