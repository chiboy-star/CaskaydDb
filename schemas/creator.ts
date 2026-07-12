// src/schemas/creator.ts
import { z } from "zod";

export const creatorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  instagramHandle: z.string().optional(),
  instagramFollowers: z.coerce.number().optional(), // Coerce string inputs to numbers
  tiktokHandle: z.string().optional(),
  tiktokFollowers: z.coerce.number().optional(),
  state: z.string().min(1, "State is required"),
  country: z.string().default("Nigeria"),
  gender: z.string().min(1, "Gender is required"),
  primaryNiche: z.string().min(1, "Primary niche is required"),
  secondaryNiches: z.array(z.string()).min(1, "Select at least one secondary niche"),
  email: z.string().email("Invalid email address"),
})
// Rule 1: At least ONE handle must be provided
.refine(data => data.instagramHandle || data.tiktokHandle, {
  message: "Either Instagram or TikTok handle must be provided",
  path: ["instagramHandle"] 
})
// Rule 2: If IG Handle exists, IG Followers are required
.refine(data => !data.instagramHandle || (data.instagramHandle && data.instagramFollowers !== undefined && data.instagramFollowers > 0), {
  message: "Instagram follower count is required",
  path: ["instagramFollowers"]
})
// Rule 3: If TikTok Handle exists, TikTok Followers are required
.refine(data => !data.tiktokHandle || (data.tiktokHandle && data.tiktokFollowers !== undefined && data.tiktokFollowers > 0), {
  message: "TikTok follower count is required",
  path: ["tiktokFollowers"]
});

export type CreatorFormValues = z.infer<typeof creatorSchema>;