import { useEffect, useState } from "react";
import bridge from "@vkontakte/vk-bridge";

export interface VKUser {
  id: string;
  name: string;
  avatar: string;
  photoUrl?: string;
  isAdmin: boolean;
  isLoading: boolean;
}

const FALLBACK_USER: VKUser = {
  id: "guest",
  name: "Гость",
  avatar: "Г",
  isAdmin: false,
  isLoading: false,
};

const DEV_USER: VKUser = {
  id: "dev",
  name: "Разработчик",
  avatar: "Р",
  isAdmin: true,
  isLoading: false,
};

function isDevEnvironment(): boolean {
  const params = new URLSearchParams(window.location.search);
  const hasVKParams = params.has("vk_user_id") || params.has("vk_app_id") || params.has("vk_group_id");
  if (hasVKParams) return false;
  return import.meta.env.DEV;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export function useVKUser(): VKUser {
  const [user, setUser] = useState<VKUser>({ ...FALLBACK_USER, isLoading: true });

  useEffect(() => {
    async function init() {
      if (isDevEnvironment()) {
        setUser(DEV_USER);
        return;
      }

      try {
        bridge.send("VKWebAppInit", { app_id: 54464410 });

        const userInfo = await withTimeout(bridge.send("VKWebAppGetUserInfo"), 3000);
        const name = [userInfo.first_name, userInfo.last_name].filter(Boolean).join(" ");
        const initials = [userInfo.first_name?.[0], userInfo.last_name?.[0]].filter(Boolean).join("");

        let isAdmin = false;
        try {
          const params = new URLSearchParams(window.location.search);
          const viewerType = params.get("vk_viewer_host_type");
          const role = params.get("vk_group_role");
          isAdmin = role === "admin" || role === "editor" || viewerType === "app_widget";
        } catch (_e) { isAdmin = false; }

        setUser({
          id: String(userInfo.id),
          name,
          avatar: initials || "В",
          photoUrl: userInfo.photo_200,
          isAdmin,
          isLoading: false,
        });
      } catch {
        setUser({ ...FALLBACK_USER, isLoading: false });
      }
    }

    init();
  }, []);

  return user;
}