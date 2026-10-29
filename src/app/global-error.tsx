"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// No app CSS reaches this document — inline styles only
const buttonStyle = {
  display: "inline-block",
  padding: "0.75rem 1.75rem",
  borderRadius: "9999px",
  fontSize: "0.875rem",
  fontWeight: 600,
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
} as const;

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pl">
      <body>
        <main
          style={{
            display: "flex",
            minHeight: "100dvh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Coś poszło nie tak</h1>
          <p style={{ marginTop: "0.5rem", color: "#6b7280" }}>
            Wystąpił krytyczny błąd. Odśwież stronę lub spróbuj ponownie później.
          </p>
          <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{ ...buttonStyle, background: "#0b7a5f", color: "#fff" }}
            >
              Spróbuj ponownie
            </button>
            {/* Full reload: the root layout itself failed, client navigation can't recover */}
            <a href="/" style={{ ...buttonStyle, background: "#e6f4ee", color: "#1a2b26" }}>
              Strona główna
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
