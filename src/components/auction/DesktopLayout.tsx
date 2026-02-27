import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { Lot, User, Screen } from "@/types/auction";
import { formatPrice, formatTimer, formatTime, getStatusLabel, useTimer, maskVKId } from "@/components/auction/lotUtils";
import { parseVKVideoEmbed } from "@/components/auction/LotDetail";
import { BidsScreen, ProfileScreen } from "@/components/auction/UserScreens";
import { AdminScreen, AdminLotForm } from "@/components/auction/AdminScreens";

// ─── Desktop Lot Card ──────────────────────────────────────────────────────────
function DesktopTimerBadge({ endsAt }: { endsAt: Date }) {
  const ms = useTimer(endsAt);
  const isUrgent = ms > 0 && ms < 5 * 60 * 1000;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isUrgent ? "bg-red-500/15 text-red-500" : "bg-black/25 text-white"}`}>
      <Icon name="Clock" size={10} />
      {formatTimer(ms)}
    </span>
  );
}

function DesktopLotCard({ lot, onClick, isActive: isSelected, isAdmin = false }: { lot: Lot; onClick: () => void; isActive: boolean; isAdmin?: boolean }) {
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
      <div className="relative shrink-0 w-40 h-28 overflow-hidden rounded-l-2xl">
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

// ─── Desktop Lot Detail Panel ──────────────────────────────────────────────────
function DesktopLotDetail({
  lot,
  user,
  onBid,
}: {
  lot: Lot;
  user: User;
  onBid: (lotId: string, amount: number) => Promise<string>;
}) {
  const [customAmount, setCustomAmount] = useState("");
  const [bidResult, setBidResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bidLoading, setBidLoading] = useState(false);
  const ms = useTimer(lot.endsAt);
  const isActive = lot.status === "active" && ms > 0;
  const minBid = lot.currentPrice + lot.step;
  const status = getStatusLabel(lot);
  const leader = lot.bids[0];
  const isAdmin = user.isAdmin;
  const dn = (name: string, userId: string) => (isAdmin || userId === user.id) ? name : maskVKId(userId);
  const vkEmbedUrl = lot.video ? parseVKVideoEmbed(lot.video) : null;
  const isS3Video = Boolean(lot.video?.startsWith("https://cdn.poehali.dev"));
  const hasVideo = Boolean(lot.video && (vkEmbedUrl || isS3Video));

  async function handleBid(amount: number) {
    setBidLoading(true);
    setBidResult(null);
    const res = await onBid(lot.id, amount);
    if (res === "ok") {
      setBidResult({ type: "success", text: `Ставка ${formatPrice(amount)} принята!` });
      setCustomAmount("");
    } else {
      setBidResult({ type: "error", text: res });
    }
    setBidLoading(false);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Media */}
      <div className="shrink-0 relative rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: "16/9", background: "#000" }}>
        {hasVideo ? (
          isS3Video ? (
            <video className="w-full h-full object-cover" controls autoPlay playsInline>
              <source src={lot.video!} />
            </video>
          ) : (
            <iframe
              src={vkEmbedUrl! + "&autoplay=1"}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              frameBorder="0"
            />
          )
        ) : (
          <img src={lot.image} alt={lot.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute top-3 right-3 flex gap-1.5 z-10">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
          {isActive && <DesktopTimerBadge endsAt={lot.endsAt} />}
        </div>
      </div>

      {/* Title + desc */}
      <h2 className="text-[22px] font-bold text-[#1C1A16] mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{lot.title}</h2>
      <p className="text-sm text-[#B8A070] leading-relaxed mb-5">{lot.description}</p>

      {/* Price block */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "#FAF7F0", border: "1px solid #EDE0C8" }}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs text-[#B8A070] mb-0.5">Текущая ставка</p>
            <p className="text-[28px] font-bold leading-none" style={{ color: "#B8922A" }}>{formatPrice(lot.currentPrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#B8A070] mb-0.5">Шаг</p>
            <p className="text-[15px] font-semibold text-[#1C1A16]">+{formatPrice(lot.step)}</p>
          </div>
        </div>
        {leader && (
          <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid #EDE0C8" }}>
            <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold" style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}>
              {leader.userAvatar}
            </div>
            <div>
              <p className="text-[11px] text-[#B8A070]">Лидирует</p>
              {isAdmin ? (
                <a href={`https://vk.com/id${leader.userId}`} target="_blank" rel="noreferrer" className="text-[13px] font-semibold underline decoration-dotted" style={{ color: "#2787F5" }}>{leader.userName}</a>
              ) : (
                <p className="text-[13px] font-semibold text-[#1C1A16]">{dn(leader.userName, leader.userId)}</p>
              )}
            </div>
            {leader.userId === user.id && (
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#C9A84C22", color: "#B8922A" }}>Это вы!</span>
            )}
          </div>
        )}
      </div>

      {lot.antiSnipe && isActive && (
        <div className="flex items-start gap-2 bg-[#FFF8E1] rounded-xl p-3 mb-4">
          <Icon name="Shield" size={14} className="text-[#F59E0B] mt-0.5 shrink-0" />
          <p className="text-xs text-[#92400E]">
            Защита от снайпинга: ставка в последние {lot.antiSnipeMinutes} мин. продлит аукцион
          </p>
        </div>
      )}

      {lot.status === "finished" && lot.winnerName && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: "#FDF9F0", border: "1px solid #EDE0C8" }}>
          <div className="w-10 h-10 rounded-full text-white flex items-center justify-center" style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}>
            <Icon name="Trophy" size={18} />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "#B8922A" }}>Победитель</p>
            <p className="font-bold text-[#1C1A16]">{lot.winnerName}</p>
            <p className="text-sm text-[#B8A070]">{formatPrice(lot.currentPrice)}</p>
          </div>
        </div>
      )}

      {/* Bid area */}
      {isActive && (
        <div className="rounded-2xl p-4 mb-4" style={{ border: "1px solid #EDE0C8", background: "#fff" }}>
          <p className="text-sm font-medium text-[#1C1A16] mb-3">Сделать ставку</p>
          {bidResult ? (
            <div className={`rounded-xl p-4 text-center ${bidResult.type === "success" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#FFEBEE] text-[#C62828]"}`}>
              <Icon name={bidResult.type === "success" ? "CheckCircle" : "XCircle"} size={24} className="mx-auto mb-2" />
              <p className="font-semibold text-sm">{bidResult.text}</p>
              <button onClick={() => setBidResult(null)} className="mt-2 text-xs underline opacity-70">Сделать ещё ставку</button>
            </div>
          ) : (
            <>
              <button
                onClick={() => handleBid(minBid)}
                disabled={bidLoading}
                className="w-full text-white rounded-xl py-3 font-semibold text-[15px] mb-3 disabled:opacity-60 transition-opacity"
                style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}
              >
                {bidLoading ? "Отправляем…" : `+ шаг — ${formatPrice(minBid)}`}
              </button>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={`Своя сумма (от ${minBid})`}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="flex-1 rounded-xl px-3 py-2.5 text-[14px] outline-none"
                  style={{ border: "1px solid #EDE0C8", background: "#FAF8F4" }}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={(e) => (e.target.style.borderColor = "#EDE0C8")}
                />
                <button
                  onClick={() => handleBid(Number(customAmount))}
                  disabled={!customAmount || Number(customAmount) < minBid || bidLoading}
                  className="rounded-xl px-4 font-semibold disabled:opacity-40 transition-opacity"
                  style={{ background: "#F5F0E8", color: "#B8922A" }}
                >
                  Ставить
                </button>
              </div>
              <p className="text-[11px] text-[#B8A070] text-center mt-3">
                Вы: <span className="font-medium text-[#1C1A16]">{user.name}</span>
              </p>
            </>
          )}
        </div>
      )}

      {/* Bid history */}
      {lot.bids.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-[#1C1A16] mb-2">История ставок</p>
          <div className="space-y-2">
            {lot.bids.slice(0, 10).map((b, i) => (
              <div key={b.id} className="flex items-center gap-2 py-1.5" style={{ borderBottom: i < lot.bids.slice(0, 10).length - 1 ? "1px solid #EDE8DF" : "none" }}>
                <div className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: i === 0 ? "#C9A84C" : "#D5CABC" }}>
                  {b.userAvatar}
                </div>
                {isAdmin ? (
                  <a href={`https://vk.com/id${b.userId}`} target="_blank" rel="noreferrer" className="text-[13px] flex-1 truncate underline decoration-dotted" style={{ color: "#2787F5" }}>{b.userName}</a>
                ) : (
                  <span className="text-[13px] text-[#1C1A16] flex-1 truncate">{dn(b.userName, b.userId)}</span>
                )}
                <span className="text-[13px] font-semibold" style={{ color: i === 0 ? "#B8922A" : "#767676" }}>{formatPrice(b.amount)}</span>
                <span className="text-[11px] text-[#B8A070] w-16 text-right shrink-0">{formatTime(b.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Desktop Catalog (list + detail side by side) ─────────────────────────────
function DesktopCatalog({ lots, user, onBid }: { lots: Lot[]; user: User; onBid: (lotId: string, amount: number) => Promise<string> }) {
  const [tab, setTab] = useState<"active" | "finished">("active");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first = lots.find((l) => l.status === "active" || l.status === "upcoming");
    return first?.id ?? lots[0]?.id ?? null;
  });

  const filtered = lots.filter((l) =>
    tab === "active" ? l.status === "active" || l.status === "upcoming" : l.status === "finished" || l.status === "cancelled"
  );
  const selectedLot = lots.find((l) => l.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="flex h-full gap-0">
      {/* Left: list */}
      <div className="flex flex-col w-[420px] shrink-0 border-r border-[#EDE8DF] bg-[#F7F4EF]">
        <div className="px-5 pt-5 pb-3 bg-white border-b border-[#EDE8DF]">
          <h1 className="text-[22px] font-bold text-[#1C1A16] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.02em" }}>
            Лоты
          </h1>
          <div className="flex bg-[#F5F0E8] rounded-xl p-0.5">
            {(["active", "finished"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelectedId(null); }}
                className="flex-1 py-1.5 text-sm font-medium rounded-[10px] transition-all"
                style={tab === t ? { background: "white", color: "#1C1A16", boxShadow: "0 1px 4px #C9A84C22" } : { color: "#B8A070" }}
              >
                {t === "active" ? "Активные" : "Завершённые"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#C5B89A]">
              <Icon name="Inbox" size={36} className="mb-3 opacity-40" />
              <p className="text-sm">Лотов пока нет</p>
            </div>
          ) : (
            filtered.map((l) => (
              <DesktopLotCard
                key={l.id}
                lot={l}
                onClick={() => setSelectedId(l.id)}
                isActive={l.id === (selectedId ?? selectedLot?.id)}
                isAdmin={user.isAdmin}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: detail */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#F7F4EF]">
        {selectedLot ? (
          <DesktopLotDetail lot={selectedLot} user={user} onBid={onBid} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#C5B89A]">
            <Icon name="MousePointerClick" size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Выберите лот из списка</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Desktop Root Layout ───────────────────────────────────────────────────────
export type DesktopScreen = "catalog" | "bids" | "profile" | "admin" | "admin-lot";

export function DesktopLayout({
  lots,
  user,
  loading,
  onBid,
  onSaveLot,
  onUpdateStatus,
  onStopLot,
}: {
  lots: Lot[];
  user: User;
  loading: boolean;
  onBid: (lotId: string, amount: number) => Promise<string>;
  onSaveLot: (data: Partial<Lot>) => Promise<void>;
  onUpdateStatus: (id: string, status: Lot["paymentStatus"]) => Promise<void>;
  onStopLot: (id: string) => Promise<void>;
}) {
  const [screen, setScreen] = useState<DesktopScreen>("catalog");
  const [editingLotId, setEditingLotId] = useState<string | null | "new">(null);

  const navItems = [
    { id: "catalog", icon: "Gavel", label: "Аукцион" },
    { id: "bids", icon: "List", label: "Мои ставки" },
    { id: "profile", icon: "User", label: "Профиль" },
    ...(user.isAdmin ? [{ id: "admin", icon: "Settings", label: "Управление" }] : []),
  ] as const;

  const editingLot = editingLotId === "new" ? null : lots.find((l) => l.id === editingLotId) || null;

  return (
    <div className="flex h-screen bg-[#EDE8DF]" style={{ fontFamily: "'Golos Text', sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-white border-r border-[#EDE8DF]" style={{ boxShadow: "1px 0 0 #EDE0C8" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#EDE8DF]">
          <div className="flex items-center gap-2.5">
            <img
              src="https://cdn.poehali.dev/projects/0a068cc6-e718-493c-b038-60253ef8dd25/bucket/e8607ced-0dd6-499e-ad13-b8e50e125d2f.jpg"
              alt="Joylots"
              className="w-8 h-8 object-contain"
            />
            <span className="font-bold text-[17px]" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#B8922A", letterSpacing: "0.15em" }}>
              JOYLOTS
            </span>
          </div>
          <p className="text-xs text-[#B8A070] mt-1 pl-0.5">Аукцион</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = screen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id as DesktopScreen)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                style={
                  isActive
                    ? { background: "#FAF3E0", color: "#B8922A", fontWeight: 600 }
                    : { color: "#767676" }
                }
              >
                <Icon name={item.icon as string} size={18} />
                <span className="text-[14px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-[#EDE8DF]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}>
              {user.avatar ?? user.name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#1C1A16] truncate">{user.name}</p>
              {user.isAdmin && <p className="text-[11px] text-[#B8A070]">Администратор</p>}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {loading && screen === "catalog" ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#B8A070]">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[#C9A84C]" />
            <p className="text-sm">Загружаем аукционы…</p>
          </div>
        ) : (
          <>
            {screen === "catalog" && (
              <DesktopCatalog lots={lots} user={user} onBid={onBid} />
            )}
            {screen === "bids" && (
              <div className="h-full overflow-y-auto bg-[#F7F4EF]">
                <BidsScreen lots={lots} user={user} onLot={(id) => { setScreen("catalog"); }} />
              </div>
            )}
            {screen === "profile" && (
              <div className="h-full overflow-y-auto bg-[#F7F4EF]">
                <ProfileScreen user={user} lots={lots} />
              </div>
            )}
            {screen === "admin" && (
              <div className="h-full overflow-y-auto bg-[#F7F4EF]">
                <AdminScreen
                  lots={lots}
                  onEdit={(id) => { setEditingLotId(id); setScreen("admin-lot"); }}
                  onNew={() => { setEditingLotId("new"); setScreen("admin-lot"); }}
                  onUpdateStatus={onUpdateStatus}
                  onStop={onStopLot}
                />
              </div>
            )}
            {screen === "admin-lot" && (
              <div className="h-full overflow-y-auto bg-[#F7F4EF]">
                <AdminLotForm
                  lot={editingLot}
                  onSave={async (data) => { await onSaveLot(data); setScreen("admin"); }}
                  onCancel={() => setScreen("admin")}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}