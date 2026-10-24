import { z } from "zod";

export const recordConsentSchema = z.object({
  consentId: z.string().min(8).max(64),
  analytics: z.boolean(),
  marketing: z.boolean(),
  version: z.number().int().min(1).max(1000),
});
