"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Store,
  Bell,
  ChevronLeft,
  UserPlus,
  UserCheck,
  MessagesSquare,
  PartyPopper,
  AtSign,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClocheAuRepos } from "@/components/ui/Illustrations";
import { ErrorState } from "@/components/ui/ErrorState";

type Notification = {
  id: string;
  type: string;
  message: string | null;
  deal_id: string | null;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: { pseudo: string } | null;
};

const ICONS: Record<string, React.ElementType> = {
  like: Heart,
  commentaire: MessageCircle,
  nouveau_deal_commercant_suivi: Store,
  alerte_declenchee: Bell,
  demande_ami: UserPlus,
  ami_accepte: UserCheck,
  message: MessagesSquare,
  ami_participe: PartyPopper,
  mention: AtSign,
};

function messageFor(n: Notification): string {
  const qui = n.actor?.pseudo ?? "Quelqu'un";

  if (n.type === "like") return `${qui} a aimé ton bon plan.`;
  if (n.type === "commentaire") return `${qui} a commenté : « ${n.message} »`;
  if (n.type === "demande_ami") return `${qui} veut t'ajouter en ami.`;
  if (n.type === "ami_accepte") return `${qui} a accepté ta demande d'ami.`;
  if (n.type === "message") return `${qui} t'a écrit : « ${n.message} »`;
  if (n.type === "ami_participe") return `${qui} y va aussi !`;
  if (n.type === "mention") return `${qui} t'a cité : « ${n.message} »`;

  return n.message ?? "";
}

// Une notification sans destination reste un simple encart : mieux vaut ça
// qu'un lien qui ne mène nulle part.
function lienDe(n: Notification): string | null {
  if (n.type === "demande_ami" || n.type === "ami_accepte") return "/amis";
  if (n.type === "message") return n.actor_id ? `/messages/${n.actor_id}` : "/messages";
  if (n.deal_id) return `/bons-plans/${n.deal_id}`;
  return null;
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
      .select("id, type, message, deal_id, actor_id, is_read, created_at, actor:actor_id (pseudo)")
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
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-surface"
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
            illustration={ClocheAuRepos}
            title="Aucune notification"
            description="Les demandes d'amis, les messages et les réactions à tes bons plans s'afficheront ici."
          />
        )}

        {state === "ready" && notifications.length > 0 && (
          <ul className="space-y-2.5">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const inner = (
                <div
                  className={`flex items-start gap-3 rounded-card border p-3.5 shadow-soft ${
                    n.is_read ? "border-ink/10 bg-surface" : "border-teal/30 bg-teal/5"
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

              const lien = lienDe(n);

              return (
                <li key={n.id}>
                  {lien ? (
                    <Link href={lien} className="press block">
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
