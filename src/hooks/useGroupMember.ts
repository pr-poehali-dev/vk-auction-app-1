import { useState, useCallback } from "react";
import bridge from "@vkontakte/vk-bridge";

const GROUP_SCREEN_NAME = "joywood_store";
// Числовой ID получаем один раз через groups.getById
let cachedGroupId: number | null = null;

async function getGroupId(): Promise<number> {
  if (cachedGroupId) return cachedGroupId;
  const res = await bridge.send("VKWebAppCallAPIMethod", {
    method: "groups.getById",
    params: { group_id: GROUP_SCREEN_NAME, v: "5.131" },
  }) as Record<string, unknown>;
  const groups = (res.response as Array<Record<string, unknown>>);
  cachedGroupId = Number(groups?.[0]?.id ?? groups?.[0]?.group_id ?? 0);
  return cachedGroupId;
}

export function useGroupMember(userId: string) {
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async (): Promise<boolean> => {
    if (userId === "guest" || userId === "dev") return true;
    if (isMember === true) return true;
    setLoading(true);
    try {
      const res = await bridge.send("VKWebAppCallAPIMethod", {
        method: "groups.isMember",
        params: {
          group_id: GROUP_SCREEN_NAME,
          user_id: userId,
          v: "5.131",
        },
      }) as Record<string, unknown>;
      const member = Boolean(res.response);
      setIsMember(member);
      return member;
    } catch {
      return true;
    } finally {
      setLoading(false);
    }
  }, [userId, isMember]);

  const join = useCallback(async (): Promise<boolean> => {
    try {
      const groupId = await getGroupId();
      if (!groupId) return false;
      await bridge.send("VKWebAppJoinGroup", { group_id: groupId });
      setIsMember(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { isMember, loading, check, join, setIsMember };
}
