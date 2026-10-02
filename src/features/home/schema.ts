import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable();

// <input type="date"> value; the end date is inclusive (shown through that whole day)
const optionalDate = (time: string) =>
  z
    .string()
    .transform((v) => (v ? new Date(`${v}T${time}`) : null))
    .nullable();

export const homeBannerSchema = z
  .object({
    id: z.string().optional(),
    titlePl: z.string().trim().min(1, "Podaj tytuł").max(80),
    subtitlePl: optionalText(140),
    ctaLabelPl: optionalText(40),
    // Internal paths only — the whole slide is a link
    href: z
      .string()
      .trim()
      .regex(/^\/(?!\/)\S*$/, "Podaj ścieżkę w sklepie, np. /kategoria/na-odpornosc"),
    imageDesktopUrl: z.string().url("Wgraj zdjęcie na komputer"),
    imageMobileUrl: z.string().url().nullable(),
    altPl: optionalText(160),
    textPosition: z.enum(["LEFT", "RIGHT"]),
    textTone: z.enum(["LIGHT", "DARK"]),
    isActive: z.boolean(),
    startsAt: optionalDate("00:00:00"),
    endsAt: optionalDate("23:59:59"),
    sortOrder: z.coerce.number().int().default(0),
  })
  .refine((b) => !b.startsAt || !b.endsAt || b.startsAt <= b.endsAt, {
    path: ["endsAt"],
    message: "Data końca jest przed datą początku",
  });

export const deleteHomeBannerSchema = z.object({ id: z.string().min(1) });

export type HomeBannerInput = z.input<typeof homeBannerSchema>;
