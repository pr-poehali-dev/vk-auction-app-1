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
      try {
        bridge.send("VKWebAppInit");

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