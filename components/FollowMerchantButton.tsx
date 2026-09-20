"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Confetti } from "@/components/ui/Confetti";

type Props = {
  merchantId: string;
  userId: string | null | undefined;
};

export function FollowMerchantButton({ merchantId, userId }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [followId, setFollowId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feteQuoi, setFeteQuoi] = useState(false);
  const [erreur, setErreur] = useState(false);

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
    setErreur(false);

    if (following) {
      const { error } = await supabase.from("follows").delete().eq("id", followId!);
      if (error) {
        setErreur(true);
      } else {
        setFollowing(false);
        setFollowId(null);
      }
    } else {
      const { data, error } = await supabase
        .from("follows")
        .insert({ follower_id: userId, followed_merchant_id: merchantId })
        .select("id")
        .single();

      if (error) {
        setErreur(true);
      } else {
        setFollowing(true);
        setFollowId(data?.id ?? null);
        setFeteQuoi(true);
      }
    }

    setBusy(false);
  }

  return (
    <div className="relative inline-flex flex-col items-center">
      {feteQuoi && <Confetti onDone={() => setFeteQuoi(false)} />}

      <button
        onClick={toggle}
        disabled={following === null || busy}
        aria-pressed={following === true}
        className={`press inline-flex items-center gap-1.5 rounded-full font-semibold px-4 py-2 text-sm shadow-soft disabled:opacity-50 ${
          following ? "border border-ink/15 bg-surface text-ink" : "bg-teal text-white"
        }`}
      >
        {following ? <Check size={15} /> : <Plus size={15} />}
        {following ? "Suivi" : "Suivre"}
      </button>

      {erreur && (
        <span className="absolute top-full mt-1 text-xs text-tag whitespace-nowrap">
          Action impossible
        </span>
      )}
    </div>
  );
}
