import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import type { Lot } from "@/types/auction";
import { formatPrice } from "@/components/auction/LotScreens";

// ─── Screen: Admin ─────────────────────────────────────────────────────────────
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
          <div key={lot.id} className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
            <div
              className="flex items-center gap-3 p-3 cursor-pointer"
              onClick={() => setExpandedId(expandedId === lot.id ? null : lot.id)}
            >
              <img src={lot.image || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"} alt={lot.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
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
        ))}
      </div>
    </div>
  );
}

// ─── Screen: Admin Lot Form ────────────────────────────────────────────────────
export function AdminLotForm({ lot, onBack, onSave }: {
  lot: Partial<Lot> | null;
  onBack: () => void;
  onSave: (data: Partial<Lot>) => void;
}) {
  const isNew = !lot?.id;
  const [form, setForm] = useState({
    title: lot?.title || "",
    description: lot?.description || "",
    image: lot?.image || "",
    video: lot?.video || "",
    startPrice: lot?.startPrice || 1000,
    step: lot?.step || 100,
    endsAt: lot?.endsAt ? (() => { const d = new Date(lot.endsAt); d.setMinutes(d.getMinutes() + 180); return d.toISOString().slice(0, 16); })() : "",
    antiSnipe: lot?.antiSnipe ?? true,
    antiSnipeMinutes: lot?.antiSnipeMinutes || 2,
  });
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const isS3Video = lot?.video?.startsWith("https://cdn.poehali.dev");
  const [videoName, setVideoName] = useState(isS3Video ? "Видео загружено (CDN)" : lot?.video ? "ВК-видео" : "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoUrlRef = useRef<string>(lot?.video || "");

  function set(key: string, val: unknown) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoUploading(true);
    setUploadProgress(0);
    setVideoName(file.name);

    const UPLOAD_URL = "https://functions.poehali.dev/c53d103f-d602-4252-9f2f-8368eccdee4e";
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 МБ

    const api = (body: object) =>
      fetch(UPLOAD_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());

    // 1. Инициализируем multipart upload
    const { uploadId, key } = await api({ action: "init", filename: file.name, contentType: file.type });

    // 2. Грузим чанками
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const parts: { PartNumber: number; ETag: string }[] = [];

    const toBase64 = (blob: Blob): Promise<string> =>
      new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(blob);
      });

    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const data = await toBase64(chunk);
      const { etag } = await api({ action: "chunk", key, uploadId, partNumber: i + 1, data });
      parts.push({ PartNumber: i + 1, ETag: etag });
      setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
    }

    // 3. Завершаем загрузку
    const { url } = await api({ action: "complete", key, uploadId, parts });
    if (url) {
      videoUrlRef.current = url;
      set("video", url);
      setUploadProgress(100);
    } else {
      await api({ action: "abort", key, uploadId });
      alert("Ошибка завершения загрузки");
    }
    setVideoUploading(false);
  }

  function handleSave() {
    if (!form.title || !form.endsAt) return;
    onSave({
      ...form,
      video: videoUrlRef.current,
      startPrice: Number(form.startPrice),
      step: Number(form.step),
      antiSnipeMinutes: Number(form.antiSnipeMinutes),
      endsAt: new Date(form.endsAt + ":00+03:00"),
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
          <label className="text-[12px] font-semibold text-[#767676] mb-1.5 block uppercase tracking-wide">Видео</label>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFile} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={videoUploading}
            className="w-full rounded-xl py-3 text-[14px] font-medium flex items-center justify-center gap-2 transition-opacity active:opacity-70 disabled:opacity-50"
            style={{ border: "1.5px dashed #C9A84C", background: "#FDF9F0", color: "#B8922A" }}
          >
            <Icon name={videoUploading ? "Loader" : "Upload"} size={16} className={videoUploading ? "animate-spin" : ""} />
            {videoUploading ? "Загружаем видео…" : videoName ? "Заменить видео" : "Загрузить видео с телефона"}
          </button>
          {videoUploading && (
            <div className="mt-2">
              <div className="flex justify-between text-[11px] text-[#B8A070] mb-1">
                <span>{videoName}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#EDE0C8] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%`, background: "linear-gradient(90deg, #C9A84C, #E8C96B)" }}
                />
              </div>
              <p className="text-[11px] text-[#B8A070] mt-1">
                {uploadProgress < 40 ? "Подготовка файла…" : uploadProgress < 95 ? "Загрузка на сервер…" : "Завершаем…"}
              </p>
            </div>
          )}
          {videoName && !videoUploading && (
            <p className="text-[11px] text-[#B8A070] mt-1.5 flex items-center gap-1">
              <Icon name="CheckCircle" size={11} className="text-green-500" />
              {videoName}
            </p>
          )}
          {form.video && !videoUploading && (
            <button onClick={() => { set("video", ""); setVideoName(""); }} className="text-[11px] text-red-400 mt-1">
              Удалить видео
            </button>
          )}
        </div>

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