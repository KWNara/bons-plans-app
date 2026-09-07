"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "24px",
            background: "#EFF0E4",
            color: "#20263B",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>
            Une erreur inattendue est survenue
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(32,38,59,0.6)", margin: 0, maxWidth: "360px" }}>
            L&apos;équipe a été notifiée automatiquement. Tu peux réessayer.
          </p>
          <button
            onClick={reset}
            style={{
              fontWeight: 600,
              fontSize: "14px",
              color: "white",
              background: "#2F6E64",
              border: "none",
              borderRadius: "0.85rem",
              padding: "12px 24px",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
