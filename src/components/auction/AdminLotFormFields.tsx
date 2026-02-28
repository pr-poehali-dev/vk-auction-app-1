import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const UPLOAD_URL = "https://functions.poehali.dev/c53d103f-d602-4252-9f2f-8368eccdee4e";

export type LotFormState = {
  title: string;
  description: string;
  image: string;
  video: string;
  startPrice: number;
  step: number;
  startsAt: string;
  endsAt: string;
  antiSnipe: boolean;
  antiSnipeMinutes: number;
};

function toLocalISO(d: Date) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function applyDuration(startsAt: string, hours: number, set: (k: string, v: unknown) => void) {
  const base = startsAt ? new Date(startsAt) : new Date();
  const end = new Date(base.getTime() + hours * 3600000);
  set("endsAt", toLocalISO(end));
}

export function AdminLotFormFields({ form, set, isNew, videoUploading, uploadProgress, videoName, setVideoUploading, setUploadProgress, setVideoName, videoUrlRef, imageUploading, setImageUploading, imageInputRef, fileInputRef }: {
  form: LotFormState;
  set: (key: string, val: unknown) => void;
  isNew: boolean;
  videoUploading: boolean;
  uploadProgress: number;
  videoName: string;
  setVideoUploading: (v: boolean) => void;
  setUploadProgress: (v: number) => void;
  setVideoName: (v: string) => void;
  videoUrlRef: React.MutableRefObject<string>;
  imageUploading: boolean;
  setImageUploading: (v: boolean) => void;
  imageInputRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const hasDelayedStart = Boolean(form.startsAt);
  const [thumbLoading, setThumbLoading] = useState(false);

  async function handleExtractThumb() {
    const videoUrl = form.video || videoUrlRef.current;
    if (!videoUrl?.startsWith("https://cdn.poehali.dev")) return;
    setThumbLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        video.src = videoUrl;
        video.currentTime = 1;
        video.addEventListener("seeked", async () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("no ctx")); return; }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(async (blob) => {
            if (!blob) { reject(new Error("no blob")); return; }
            const toBase64 = (b: Blob): Promise<string> =>
              new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = () => res((r.result as string).split(",")[1]);
                r.onerror = rej;
                r.readAsDataURL(b);
              });
            const data = await toBase64(blob);
            const thumbName = videoUrl.split("/").pop()?.replace(/\.[^.]+$/, "") + "_thumb.jpg";
            const resp = await fetch(UPLOAD_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "upload_image", filename: thumbName, contentType: "image/jpeg", data }),
            });
            const { url: thumbUrl } = await resp.json();
            if (thumbUrl) set("image", thumbUrl);
            resolve();
          }, "image/jpeg", 0.85);
        }, { once: true });
        video.addEventListener("error", () => reject(new Error("video error")), { once: true });
      });
    } catch (e) {
      alert("Не удалось извлечь кадр: " + String(e));
    }
    setThumbLoading(false);
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const toBase64 = (blob: Blob): Promise<string> =>
        new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res((r.result as string).split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(blob);
        });
      const data = await toBase64(file);
      const resp = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upload_image", filename: file.name, contentType: file.type, data }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { url } = await resp.json();
      if (url) {
        set("image", url);
      } else {
        alert("Ошибка загрузки фото");
      }
    } catch (err) {
      alert("Ошибка загрузки фото: " + String(err));
    }
    setImageUploading(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoUploading(true);
    setUploadProgress(0);
    setVideoName(file.name);

    const CHUNK_SIZE = 256 * 1024;

    const api = async (body: object, retries = 3): Promise<Record<string, unknown>> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const r = await fetch(UPLOAD_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        } catch (e) {
          if (attempt === retries) throw e;
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
      throw new Error("max retries");
    };

    try {
      const { uploadId, key } = await api({ action: "init", filename: file.name, contentType: file.type });
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

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
        await api({ action: "chunk", key, uploadId, partNumber: i + 1, data });
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 95));
      }

      const { url } = await api({ action: "complete", key, uploadId, totalParts: totalChunks, contentType: file.type });
      if (url) {
        videoUrlRef.current = url as string;
        set("video", url);
        setUploadProgress(100);
        extractVideoThumbnail(file, url, set);
      } else {
        await api({ action: "abort", key, uploadId });
        alert("Ошибка завершения загрузки");
      }
    } catch (err) {
      alert("Ошибка загрузки: " + String(err));
    }
    setVideoUploading(false);
  }

  function extractVideoThumbnail(file: File, videoUrl: string, setField: (k: string, v: unknown) => void) {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.currentTime = 1;
    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(objectUrl); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) return;
        try {
          const toBase64 = (b: Blob): Promise<string> =>
            new Promise((res, rej) => {
              const r = new FileReader();
              r.onload = () => res((r.result as string).split(",")[1]);
              r.onerror = rej;
              r.readAsDataURL(b);
            });
          const data = await toBase64(blob);
          const thumbName = videoUrl.split("/").pop()?.replace(/\.[^.]+$/, "") + "_thumb.jpg";
          const resp = await fetch(UPLOAD_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "upload_image", filename: thumbName, contentType: "image/jpeg", data }),
          });
          if (!resp.ok) return;
          const { url: thumbUrl } = await resp.json();
          if (thumbUrl) setField("image", thumbUrl);
        } catch (e) { void e; }
      }, "image/jpeg", 0.85);
    }, { once: true });
    video.addEventListener("error", () => URL.revokeObjectURL(objectUrl), { once: true });
  }

  return (
    <>
      {/* Название */}
      <div>
        <label className="text-[12px] font-semibold text-[#767676] mb-1.5 block uppercase tracking-wide">Название *</label>
        <input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Например: Картина маслом 60×80"
          className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] bg-white"
        />
      </div>

      {/* Фото */}
      <div>
        <label className="text-[12px] font-semibold text-[#767676] mb-1.5 block uppercase tracking-wide">Фото</label>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
        <div className="flex gap-2">
          <input
            value={form.image}
            onChange={(e) => set("image", e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="flex-1 border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] bg-white min-w-0"
          />
          {(form.video || videoUrlRef.current)?.startsWith("https://cdn.poehali.dev") && (
            <button
              onClick={handleExtractThumb}
              disabled={thumbLoading}
              title="Взять кадр из видео"
              className="shrink-0 w-11 h-11 rounded-xl border border-[#E0E0E0] bg-white flex items-center justify-center text-[#C9A84C] active:opacity-70 disabled:opacity-40"
            >
              <Icon name={thumbLoading ? "Loader" : "Clapperboard"} size={18} className={thumbLoading ? "animate-spin" : ""} />
            </button>
          )}
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={imageUploading}
            title="Загрузить фото с устройства"
            className="shrink-0 w-11 h-11 rounded-xl border border-[#E0E0E0] bg-white flex items-center justify-center text-[#2787F5] active:opacity-70 disabled:opacity-40"
          >
            <Icon name={imageUploading ? "Loader" : "ImagePlus"} size={18} className={imageUploading ? "animate-spin" : ""} />
          </button>
        </div>
        {form.image && form.image.startsWith("http") && (
          <img src={form.image} alt="preview" className="mt-2 w-full h-32 object-cover rounded-xl border border-[#E0E0E0]" />
        )}
      </div>

      {/* Видео */}
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

      {/* Описание */}
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

      {/* Цена и шаг */}
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

      {/* Отложенный старт */}
      <div className="bg-[#F0F2F5] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Icon name="CalendarClock" size={16} className="text-[#2787F5]" />
            <span className="font-semibold text-[14px] text-[#1C1C1E]">Отложенный старт</span>
          </div>
          <button
            onClick={() => {
              if (hasDelayedStart) {
                set("startsAt", "");
              } else {
                const now = new Date();
                now.setMinutes(now.getMinutes() + 30);
                set("startsAt", toLocalISO(now));
              }
            }}
            className={`w-11 h-6 rounded-full transition-colors relative ${hasDelayedStart ? "bg-[#2787F5]" : "bg-[#C7C7CC]"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${hasDelayedStart ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
        <p className="text-xs text-[#767676] mb-3">Аукцион будет виден заранее, но ставки откроются позже</p>
        {hasDelayedStart && (
          <div className="bg-white rounded-xl p-3 space-y-2">
            <label className="text-[11px] font-semibold text-[#767676] uppercase tracking-wide">Дата и время начала</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={form.startsAt ? form.startsAt.slice(0, 10) : ""}
                onChange={(e) => {
                  const timePart = form.startsAt ? form.startsAt.slice(11, 16) : "12:00";
                  set("startsAt", e.target.value ? `${e.target.value}T${timePart}` : "");
                }}
                className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#2787F5] bg-white"
              />
              <input
                type="time"
                value={form.startsAt ? form.startsAt.slice(11, 16) : ""}
                onChange={(e) => {
                  const datePart = form.startsAt ? form.startsAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
                  set("startsAt", e.target.value ? `${datePart}T${e.target.value}` : "");
                }}
                className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#2787F5] bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Дата и время окончания */}
      <div>
        <label className="text-[12px] font-semibold text-[#767676] mb-2 block uppercase tracking-wide">Длительность аукциона *</label>

        {/* Быстрые кнопки */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {[
            { label: "6 ч", hours: 6 },
            { label: "12 ч", hours: 12 },
            { label: "24 ч", hours: 24 },
            { label: "2 дня", hours: 48 },
            { label: "3 дня", hours: 72 },
            { label: "7 дней", hours: 168 },
          ].map(({ label, hours }) => {
            const base = form.startsAt ? new Date(form.startsAt) : new Date();
            const expected = toLocalISO(new Date(base.getTime() + hours * 3600000));
            const isActive = form.endsAt === expected;
            return (
              <button
                key={hours}
                type="button"
                onClick={() => applyDuration(form.startsAt, hours, set)}
                className={`px-3 py-1.5 rounded-xl text-[13px] font-semibold border transition-all ${
                  isActive
                    ? "bg-[#2787F5] border-[#2787F5] text-white"
                    : "bg-white border-[#E0E0E0] text-[#1C1C1E]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Точная дата/время окончания */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={form.endsAt ? form.endsAt.slice(0, 10) : ""}
            onChange={(e) => {
              const timePart = form.endsAt ? form.endsAt.slice(11, 16) : "12:00";
              set("endsAt", e.target.value ? `${e.target.value}T${timePart || "12:00"}` : "");
            }}
            className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] bg-white"
          />
          <input
            type="time"
            value={form.endsAt ? form.endsAt.slice(11, 16) : ""}
            onChange={(e) => {
              const datePart = form.endsAt ? form.endsAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
              set("endsAt", e.target.value ? `${datePart}T${e.target.value}` : "");
            }}
            className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] bg-white"
          />
        </div>
        {form.endsAt && (
          <p className="text-[11px] text-[#767676] mt-1.5 flex items-center gap-1">
            <Icon name="Clock" size={11} />
            Завершится: {new Date(form.endsAt).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {/* Анти-снайпинг */}
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
    </>
  );
}