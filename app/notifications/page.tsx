"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Store, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  if (n.type === "commentaire") return `${n.actor?.pseudo ?? "Quelqu'un"} a commenté : "${n.message}"`;
  return n.message ?? "";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data } = await supabase
        .from("alerts")
        .select("id, type, message, deal_id, is_read, created_at, actor:actor_id (pseudo)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications((data as unknown as Notification[]) ?? []);
      setLoading(false);

      const unreadIds = (data ?? []).filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase.from("alerts").update({ is_read: true }).in("id", unreadIds);
      }
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink/60">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink mb-6">Notifications</h1>

        {notifications.length === 0 ? (
          <p className="text-ink/50 text-sm">Rien pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const content = (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 rounded border p-3 ${
                    n.is_read ? "border-ink/10 bg-white/40" : "border-teal/30 bg-teal/5"
                  }`}
                >
                  <Icon size={18} className="text-ink/50 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-ink/80">{messageFor(n)}</p>
                    <p className="text-xs text-ink/40 mt-0.5">{formatDate(n.created_at)}</p>
                  </div>
                </li>
              );
              return n.deal_id ? (
                <Link key={n.id} href={`/bons-plans/${n.deal_id}`}>
                  {content}
                </Link>
              ) : (
                content
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
