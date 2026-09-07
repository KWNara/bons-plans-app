"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Store, Bell, ChevronLeft, BellOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

type Notification = {
  id: string;
  type: string;
  message: string | null;
  deal_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: { pseudo: string } | null;
};

const ICONS: Record<string, React.ElementType> = {
  like: Heart,
  commentaire: MessageCircle,
  nouveau_deal_commercant_suivi: Store,
  alerte_declenchee: Bell,
};

function messageFor(n: Notification): string {
  if (n.type === "like") return `${n.actor?.pseudo ?? "Quelqu'un"} a aimé ton bon plan.`;
  if (n.type === "commentaire")
    return `${n.actor?.pseudo ?? "Quelqu'un"} a commenté : « ${n.message} »`;
  return n.message ?? "";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/connexion");
      return;
    }

    const { data, error } = await supabase
      .from("alerts")
      .select("id, type, message, deal_id, is_read, created_at, actor:actor_id (pseudo)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setState("error");
      return;
    }

    setNotifications((data as unknown as Notification[]) ?? []);
    setState("ready");

    // On marque tout comme lu, pas seulement les 50 affichées : sinon le badge
    // du fil reste bloqué à vie pour qui dépasse 50 notifications non lues.
    await supabase.from("alerts").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
      <div className="max-w-md mx-auto">
        <Link
          href="/"
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-white"
          aria-label="Retour au fil"
        >
          <ChevronLeft size={20} className="text-ink" />
        </Link>

        <h1 className="text-2xl font-extrabold text-ink mb-5">Notifications</h1>

        {state === "loading" && (
          <div className="space-y-2.5">
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-16 w-full rounded-card" />
          </div>
        )}

        {state === "error" && (
          <ErrorState
            title="Chargement impossible"
            description="Tes notifications n'ont pas pu être récupérées."
            onRetry={() => {
              setState("loading");
              load();
            }}
          />
        )}

        {state === "ready" && notifications.length === 0 && (
          <EmptyState
            icon={BellOff}
            title="Aucune notification"
            description="Les réactions à tes bons plans et tes alertes s'afficheront ici."
          />
        )}

        {state === "ready" && notifications.length > 0 && (
          <ul className="space-y-2.5">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const inner = (
                <div
                  className={`flex items-start gap-3 rounded-card border p-3.5 shadow-soft ${
                    n.is_read ? "border-ink/10 bg-white" : "border-teal/30 bg-teal/5"
                  }`}
                >
                  <span className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-teal" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-ink break-words">{messageFor(n)}</p>
                    <p className="text-xs text-ink/60 mt-1">{formatDate(n.created_at)}</p>
                  </div>
                </div>
              );

              return (
                <li key={n.id}>
                  {n.deal_id ? (
                    <Link href={`/bons-plans/${n.deal_id}`} className="press block">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
