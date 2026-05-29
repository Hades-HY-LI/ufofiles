import { z } from "zod";

export const mediaTypes = ["document", "image", "video", "audio", "unknown"] as const;
export type MediaType = (typeof mediaTypes)[number];

export const CaseRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  agency: z.string(),
  releaseDate: z.string().nullable(),
  incidentDate: z.string().nullable(),
  locationName: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  type: z.enum(mediaTypes),
  sourceUrl: z.string().url(),
  mediaUrl: z.string().url().nullable(),
  summary: z.string(),
  tags: z.array(z.string()),
  confidence: z.string()
});

export const ReleaseRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  releaseDate: z.string().nullable(),
  sourceUrl: z.string().url(),
  fileCount: z.number().int().nonnegative(),
  notes: z.string().optional()
});

export const SyncMetadataSchema = z.object({
  lastSyncedAt: z.string(),
  sourceUrl: z.string().url(),
  totalRecords: z.number().int().nonnegative(),
  newRecordCount: z.number().int().nonnegative(),
  changedRecordCount: z.number().int().nonnegative(),
  latestNewCaseIds: z.array(z.string()),
  latestChangedCaseIds: z.array(z.string()),
  status: z.string()
});

export type CaseRecord = z.infer<typeof CaseRecordSchema>;
export type ReleaseRecord = z.infer<typeof ReleaseRecordSchema>;
export type SyncMetadata = z.infer<typeof SyncMetadataSchema>;
