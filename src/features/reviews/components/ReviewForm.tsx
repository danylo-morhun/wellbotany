"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { submitReviews } from "../actions";
import { REVIEW_MIN_LENGTH } from "../schema";

type Product = { id: string; namePl: string; image: string | null };
type Existing = { productId: string; rating: number; content: string; status: string };

type Props = {
  token: string;
  suggestedName: string;
  products: Product[];
  existing: Existing[];
};

type Draft = { rating: number; content: string };

export function ReviewForm({ token, suggestedName, products, existing }: Props) {
  const locked = new Set(existing.filter((r) => r.status !== "PENDING").map((r) => r.productId));
  const [authorName, setAuthorName] = useState(suggestedName);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      existing.map((r) => [r.productId, { rating: r.rating, content: r.content }]),
    ),
  );
  const { execute, isPending, result, hasSucceeded } = useAction(submitReviews);

  const setDraft = (productId: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({
      ...d,
      [productId]: { ...(d[productId] ?? { rating: 0, content: "" }), ...patch },
    }));

  const ready = Object.entries(drafts).filter(
    ([id, d]) => !locked.has(id) && d.rating > 0 && d.content.trim().length >= REVIEW_MIN_LENGTH,
  );

  if (hasSucceeded) {
    return (
      <div className="rounded-2xl bg-card p-6 shadow-card">
        <h2 className="font-heading text-xl text-foreground">Dziękujemy za opinię!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Opublikujemy ją po krótkiej weryfikacji. Możesz wrócić do tego linku i poprawić opinię,
          dopóki nie zostanie opublikowana.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        execute({
          token,
          authorName,
          reviews: ready.map(([productId, d]) => ({
            productId,
            rating: d.rating,
            content: d.content,
          })),
        });
      }}
    >
      <div>
        <label htmlFor="authorName" className="block text-sm font-medium text-foreground">
          Podpis pod opinią
        </label>
        <input
          id="authorName"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={40}
          required
          className="mt-1 w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">Np. imię i pierwsza litera nazwiska.</p>
      </div>

      {products.map((product) => {
        const draft = drafts[product.id] ?? { rating: 0, content: "" };
        const isLocked = locked.has(product.id);
        return (
          <fieldset key={product.id} className="rounded-2xl bg-card p-5 shadow-card">
            <legend className="sr-only">{product.namePl}</legend>
            <div className="flex items-center gap-4">
              {product.image && (
                <div className="relative size-16 shrink-0">
                  <Image src={product.image} alt="" fill sizes="64px" className="object-contain" />
                </div>
              )}
              <p className="font-medium text-foreground">{product.namePl}</p>
            </div>
            {isLocked ? (
              <p className="mt-3 text-sm text-muted-foreground">Ten produkt został już oceniony.</p>
            ) : (
              <>
                <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Ocena">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={draft.rating === value}
                      aria-label={`${value} na 5`}
                      onClick={() => setDraft(product.id, { rating: value })}
                      className="rounded p-1 focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <Star
                        aria-hidden
                        className={`size-7 ${value <= draft.rating ? "fill-accent text-accent" : "text-border"}`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={draft.content}
                  onChange={(e) => setDraft(product.id, { content: e.target.value })}
                  rows={3}
                  maxLength={2000}
                  placeholder="Jak sprawdza się produkt? Smak, forma, wygoda stosowania…"
                  aria-label={`Opinia o produkcie ${product.namePl}`}
                  className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </>
            )}
          </fieldset>
        );
      })}

      {result.serverError && <p className="text-sm text-destructive">{result.serverError}</p>}
      {result.validationErrors && (
        <p className="text-sm text-destructive">
          Sprawdź formularz – każda opinia musi mieć ocenę i co najmniej {REVIEW_MIN_LENGTH} znaków.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || ready.length === 0 || authorName.trim().length < 2}
        className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-50"
      >
        {isPending ? "Wysyłanie…" : `Wyślij opinie (${ready.length})`}
      </button>
      <p className="text-xs text-muted-foreground">
        Opinie publikujemy po weryfikacji. Pod opinią pokażemy wyłącznie podany podpis.
      </p>
    </form>
  );
}
