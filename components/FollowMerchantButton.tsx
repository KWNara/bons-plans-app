"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Props = {
  merchantId: string;
  userId: string | null | undefined;
};

export function FollowMerchantButton({ merchantId, userId }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [followId, setFollowId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) {
      setFollowing(false);
      return;
    }
    supabase
      .from("follows")
      .select("id")
      .eq("follower_id", userId)
      .eq("followed_merchant_id", merchantId)
      .maybeSingle()
      .then(({ data }) => {
        setFollowing(!!data);
        setFollowId(data?.id ?? null);
      });
  }, [userId, merchantId]);

  async function toggle() {
    if (!userId) {
      router.push("/connexion");
      return;
    }
    if (busy || following === null) return;
    setBusy(true);

    if (following) {
      await supabase.from("follows").delete().eq("id", followId!);
      setFollowing(false);
      setFollowId(null);
    } else {
      const { data } = await supabase
        .from("follows")
        .insert({ follower_id: userId, followed_merchant_id: merchantId })
        .select("id")
        .single();
      setFollowing(true);
      setFollowId(data?.id ?? null);
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={following === null || busy}
      className={
        following
          ? "rounded-full border border-ink/20 text-ink px-4 py-1.5 text-sm font-medium"
          : "rounded-full bg-teal text-white px-4 py-1.5 text-sm font-medium"
      }
    >
      {following ? "Suivi ✓" : "Suivre"}
    </button>
  );
}
