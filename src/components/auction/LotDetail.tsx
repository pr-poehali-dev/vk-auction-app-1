import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import type { Lot, User, Screen } from "@/types/auction";
import { formatPrice, formatTime, formatTimer, getStatusLabel, useTimer, useCountdown, firstName, vkProfileUrl } from "@/components/auction/lotUtils";
import { TimerBadge } from "@/components/auction/LotCard";

// ─── VK Video Player ──────────────────────────────────────────────────────────
export function parseVKVideoEmbed(url: string): string | null {
  if (!url) return null;
  const iframeSrc = url.match(/src=["']([^"']+)["']/);
  if (iframeSrc) return iframeSrc[1];
  if (url.includes("video_ext.php") || url.includes("vkvideo.ru")) return url;
  const matchDirect = url.match(/vk\.com\/video(-?\d+_\d+)/);
  if (matchDirect) {
    return `https://vk.com/video_ext.php?oid=${matchDirect[1].split("_")[0]}&id=${matchDirect[1].split("_")[1]}&hd=2`;
  }
  const matchZ = url.match(/video(-?\d+_\d+)/);
  if (matchZ) {
    return `https://vk.com/video_ext.php?oid=${matchZ[1].split("_")[0]}&id=${matchZ[1].split("_")[1]}&hd=2`;
  }
  return null;
}

// ─── AutoBid Modal ─────────────────────────────────────────────────────────────
export function AutoBidModal({ lot, user, onClose, onSave }: {
  lot: Lot;
  user: User;
  onClose: () => void;
  onSave: (maxAmount: number) => Promise<string>;
}) {
  const [maxAmount, setMaxAmount] = useState(lot.myAutoBid ? String(lot.myAutoBid.maxAmount) : "");
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const minRequired = lot.currentPrice + lot.step;

  async function handleSave() {
    const val = Number(maxAmount);
    if (!val || val < minRequired) {
      setResult({ type: "error", text: `Минимум ${formatPrice(minRequired)}` });
      return;
    }
    setLoading(true);
    try {
      const msg = await onSave(val);
      if (msg === "ok") {
        setResult({ type: "success", text: `Автоставка до ${formatPrice(val)} активна!` });
      } else {
        setResult({ type: "error", text: msg });
      }
    } catch {
      setResult({ type: "error", text: "Ошибка сети. Попробуйте ещё раз." });
    } finally {
      setLoading(false);
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
        <h3 className="font-semibold text-[17px] text-[#1C1A16] mb-1">Автоставка</h3>
        <p className="text-sm text-[#B8A070] mb-4">
          Система автоматически перебьёт ставку на шаг аукциона (<span className="font-semibold text-[#1C1A16]">{formatPrice(lot.step)}</span>), пока не достигнет вашего максимума
        </p>

        {result ? (
          <div className={`rounded-xl p-4 text-center ${result.type === "success" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#FFEBEE] text-[#C62828]"}`}>
            <Icon name={result.type === "success" ? "CheckCircle" : "XCircle"} size={28} className="mx-auto mb-2" />
            <p className="font-semibold">{result.text}</p>
            <button onClick={onClose} className="mt-3 text-sm underline opacity-70">Закрыть</button>
          </div>
        ) : (
          <>
            {lot.myAutoBid && (
              <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ background: "#FDF9F0", border: "1px solid #EDE0C8" }}>
                <Icon name="Bot" size={16} className="text-[#B8922A]" />
                <p className="text-sm text-[#B8922A]">Активна до <span className="font-semibold">{formatPrice(lot.myAutoBid.maxAmount)}</span></p>
              </div>
            )}
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                placeholder={`Максимум (от ${minRequired})`}
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="flex-1 rounded-xl px-3 py-3 text-[15px] outline-none"
                style={{ border: "1px solid #EDE0C8", background: "#FAF8F4" }}
                onFocus={(e) => (e.target.style.borderColor = "#2787F5")}
                onBlur={(e) => (e.target.style.borderColor = "#EDE0C8")}
              />
              <button
                onClick={handleSave}
                disabled={!maxAmount || loading}
                className="rounded-xl px-4 font-semibold text-white disabled:opacity-40 transition-opacity"
                style={{ background: "#2787F5" }}
              >
                {loading ? "…" : "Сохранить"}
              </button>
            </div>
            <p className="text-[11px] text-[#B8A070] text-center">
              Текущая ставка: <span className="font-medium text-[#1C1A16]">{formatPrice(lot.currentPrice)}</span> · Шаг: <span className="font-medium text-[#1C1A16]">{formatPrice(lot.step)}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Bid Modal ─────────────────────────────────────────────────────────────────
export function BidModal({ lot, user, onClose, onBid }: { lot: Lot; user: User; onClose: () => void; onBid: (amount: number) => Promise<string> }) {
  const [customAmount, setCustomAmount] = useState("");
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const minBid = lot.currentPrice + lot.step;

  async function handleBid(amount: number) {
    setLoading(true);
    try {
      const msg = await onBid(amount);
      if (msg === "ok") {
        setResult({ type: "success", text: `Ставка ${formatPrice(amount)} принята!` });
      } else {
        setResult({ type: "error", text: msg });
      }
    } catch {
      setResult({ type: "error", text: "Ошибка сети. Попробуйте ещё раз." });
    } finally {
      setLoading(false);
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
        <h3 className="font-semibold text-[17px] text-[#1C1A16] mb-1">{lot.title}</h3>
        <p className="text-sm text-[#B8A070] mb-4">
          Минимальная ставка: <span className="font-semibold" style={{ color: "#B8922A" }}>{formatPrice(minBid)}</span>
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
              disabled={loading}
              className="w-full text-white rounded-xl py-3.5 font-semibold text-[15px] mb-3 active:opacity-80 transition-opacity disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}
            >
              {loading ? "Отправляем…" : `+${formatPrice(lot.step)} (до ${formatPrice(minBid)})`}
            </button>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={`Своя сумма (от ${minBid})`}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="flex-1 rounded-xl px-3 py-3 text-[15px] outline-none"
                style={{ border: "1px solid #EDE0C8", background: "#FAF8F4" }}
                onFocus={(e) => (e.target.style.borderColor = "#C9A84C")}
                onBlur={(e) => (e.target.style.borderColor = "#EDE0C8")}
              />
              <button
                onClick={() => handleBid(Number(customAmount))}
                disabled={!customAmount || Number(customAmount) < minBid || loading}
                className="rounded-xl px-4 font-semibold disabled:opacity-40 transition-opacity"
                style={{ background: "#F5F0E8", color: "#B8922A" }}
              >
                Ставить
              </button>
            </div>
            <p className="text-[11px] text-[#B8A070] text-center mt-3">
              Шаг аукциона: <span className="font-medium text-[#1C1A16]">{formatPrice(lot.step)}</span> · Вы: <span className="font-medium text-[#1C1A16]">{user.name}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Screen: Lot ───────────────────────────────────────────────────────────────
export function LotScreen({ lot, user, onBack, onBid, onAutoBid }: {
  lot: Lot;
  user: User;
  onBack: () => void;
  onBid: (lotId: string, amount: number) => Promise<string>;
  onAutoBid: (lotId: string, maxAmount: number) => Promise<string>;
}) {
  const isAdmin = user.isAdmin;
  const [showBidModal, setShowBidModal] = useState(false);
  const [showAutoBidModal, setShowAutoBidModal] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ms = useTimer(lot.endsAt);
  const startsInMs = useCountdown(lot.startsAt);
  const isActive = lot.status === "active" && ms > 0;
  const isUpcoming = lot.status === "upcoming";
  const leader = lot.bids[0];
  const status = getStatusLabel(lot);
  const vkEmbedUrl = lot.video ? parseVKVideoEmbed(lot.video) : null;
  const isS3Video = Boolean(lot.video && lot.video.startsWith("https://cdn.poehali.dev"));
  const hasVideo = !isUpcoming && Boolean(lot.video && (vkEmbedUrl || isS3Video));

  function handlePlay() { setVideoPlaying(true); }

  function startRestartTimer() {
    if (!lot.videoDuration || lot.videoDuration <= 0) return;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    const restartAt = (lot.videoDuration - 3) * 1000;
    if (restartAt <= 0) return;
    restartTimerRef.current = setTimeout(() => {
      setVideoKey((k) => k + 1);
      setVideoPlaying(false);
    }, restartAt);
  }

  useEffect(() => {
    return () => { if (restartTimerRef.current) clearTimeout(restartTimerRef.current); };
  }, []);

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
            {isS3Video ? (
              <video
                key={videoKey}
                className="absolute inset-0 w-full h-full bg-black"
                controls
                playsInline
                onEnded={() => setVideoKey((k) => k + 1)}
              >
                <source src={lot.video} />
              </video>
            ) : !videoPlaying ? (
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                style={{ background: "#000" }}
                onClick={handlePlay}
              >
                <img src={lot.image} alt={lot.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-16 h-16 rounded-full animate-ping opacity-20" style={{ background: "#C9A84C" }} />
                  <div className="relative w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(201,168,76,0.9)", backdropFilter: "blur(4px)" }}>
                    <svg width="20" height="24" viewBox="0 0 20 24" fill="white"><path d="M2 1.5L18 12L2 22.5V1.5Z" /></svg>
                  </div>
                </div>
              </div>
            ) : (
              <iframe
                key={videoKey}
                src={vkEmbedUrl! + "&autoplay=1"}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                frameBorder="0"
                onLoad={startRestartTimer}
              />
            )}
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
          {isUpcoming && lot.video && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
              <Icon name="Lock" size={12} className="text-white" />
              <span className="text-white text-[11px] font-medium">Видео откроется при старте</span>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4">
          <h2 className="text-[20px] font-bold text-[#1C1C1E] mb-1">{lot.title}</h2>
          <p className="text-sm text-[#767676] leading-relaxed mb-4">{lot.description}</p>

          {/* Таймер до начала для upcoming */}
          {isUpcoming && lot.startsAt && startsInMs > 0 && (
            <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: "#EEF5FF", border: "1px solid #C5D9F5" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#2787F5" }}>
                <Icon name="Clock" size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#2787F5]">Аукцион начнётся через</p>
                <p className="text-[22px] font-bold text-[#1C1C1E] leading-none">{formatTimer(startsInMs)}</p>
                <p className="text-[11px] text-[#767676] mt-0.5">
                  {lot.startsAt.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          )}

          {/* Price Block */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: "#FAF7F0", border: "1px solid #EDE0C8" }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-[#B8A070] mb-0.5">{isUpcoming ? "Стартовая цена" : "Текущая ставка"}</p>
                <p className="text-[28px] font-bold leading-none" style={{ color: "#B8922A" }}>{formatPrice(lot.currentPrice)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#B8A070] mb-0.5">Шаг</p>
                <p className="text-[15px] font-semibold text-[#1C1A16]">+{formatPrice(lot.step)}</p>
              </div>
            </div>
            {leader && !isUpcoming && (
              <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid #EDE0C8" }}>
                <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold" style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}>
                  {leader.userAvatar}
                </div>
                <div>
                  <p className="text-[11px] text-[#B8A070]">Лидирует</p>
                  {isAdmin ? (
                    <a href={vkProfileUrl(leader.userId)} target="_blank" rel="noreferrer" className="text-[13px] font-semibold underline decoration-dotted" style={{ color: "#2787F5" }}>{leader.userName}</a>
                  ) : (
                    <p className="text-[13px] font-semibold text-[#1C1A16]">{leader.userId === user.id ? leader.userName : firstName(leader.userName)}</p>
                  )}
                </div>
                {leader.userId === user.id && (
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#C9A84C22", color: "#B8922A" }}>Это вы!</span>
                )}
              </div>
            )}
          </div>

          {/* Моя автоставка */}
          {isActive && user.id !== "guest" && lot.myAutoBid && (
            <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ background: "#EEF5FF", border: "1px solid #C5D9F5" }}>
              <Icon name="Bot" size={16} className="text-[#2787F5]" />
              <p className="text-sm text-[#2787F5] flex-1">Автоставка активна до <span className="font-semibold">{formatPrice(lot.myAutoBid.maxAmount)}</span></p>
              <button onClick={() => setShowAutoBidModal(true)} className="text-[11px] text-[#2787F5] underline">Изменить</button>
            </div>
          )}

          {lot.antiSnipe && isActive && (
            <div className="flex items-start gap-2 bg-[#FFF8E1] rounded-xl p-3 mb-4">
              <Icon name="Shield" size={14} className="text-[#F59E0B] mt-0.5 shrink-0" />
              <p className="text-xs text-[#92400E]">
                Защита от снайпинга: ставка в последние {lot.antiSnipeMinutes} мин. автоматически продлит аукцион
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

          {/* Bid History */}
          <div className="mb-4">
            <p className="text-[12px] font-semibold text-[#767676] uppercase tracking-wide mb-2">История ставок</p>
            {lot.bids.length === 0 ? (
              <p className="text-sm text-[#767676] text-center py-4">Ставок ещё нет — будьте первым!</p>
            ) : (
              <div className="space-y-2">
                {lot.bids.slice(0, 3).map((bid, i) => (
                  <div key={bid.id} className="flex items-center gap-3 p-3 rounded-xl" style={i === 0 ? { background: "#FDF9F0", border: "1px solid #EDE0C8" } : { background: "white", border: "1px solid #F0EBE0" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white" style={i === 0 ? { background: "linear-gradient(135deg, #C9A84C, #E8C96B)" } : { background: "#EDE0C8", color: "#B8A070" }}>
                      {bid.userAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isAdmin ? (
                        <a href={vkProfileUrl(bid.userId)} target="_blank" rel="noreferrer" className="text-[13px] font-semibold truncate block underline decoration-dotted" style={{ color: "#2787F5" }}>{bid.userName}</a>
                      ) : (
                        <p className="text-[13px] font-semibold text-[#1C1A16] truncate">{bid.userId === user.id ? bid.userName : firstName(bid.userName)}</p>
                      )}
                      <p className="text-[11px] text-[#B8A070]">{formatTime(bid.createdAt)}</p>
                    </div>
                    <p className="text-[14px] font-bold shrink-0" style={{ color: i === 0 ? "#B8922A" : "#1C1A16" }}>
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
          {user.id === "guest" ? (
            <div className="rounded-xl p-4 text-center bg-[#F5F0E8]">
              <p className="text-sm text-[#B8A070]">Чтобы участвовать в аукционе, откройте приложение через ВКонтакте</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowBidModal(true)}
                className="flex-1 text-white rounded-xl py-3.5 font-bold text-[16px] active:opacity-80 transition-opacity"
                style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)", boxShadow: "0 4px 16px #C9A84C40" }}
              >
                Сделать ставку
              </button>
              <button
                onClick={() => setShowAutoBidModal(true)}
                title="Автоставка"
                className={`w-14 rounded-xl flex items-center justify-center transition-colors active:opacity-80 ${lot.myAutoBid ? "bg-[#2787F5] text-white" : "bg-[#EEF5FF] text-[#2787F5]"}`}
                style={{ border: lot.myAutoBid ? "none" : "1.5px solid #C5D9F5" }}
              >
                <Icon name="Bot" size={20} />
              </button>
            </div>
          )}
        </div>
      )}

      {showBidModal && (
        <BidModal lot={lot} user={user} onClose={() => setShowBidModal(false)} onBid={(amount) => onBid(lot.id, amount)} />
      )}
      {showAutoBidModal && (
        <AutoBidModal
          lot={lot}
          user={user}
          onClose={() => setShowAutoBidModal(false)}
          onSave={(maxAmount) => onAutoBid(lot.id, maxAmount)}
        />
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
    <nav className="bg-white border-t border-[#EDE8DF] flex shrink-0">
      {items.map((item) => {
        const active = screen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all"
            style={{ color: active ? "#B8922A" : "#B8A070" }}
          >
            <Icon name={item.icon} size={22} />
            <span className="text-[10px] font-medium">{item.label}</span>
            {active && (
              <span className="block w-4 h-0.5 rounded-full mt-0.5 bg-[#C9A84C]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
