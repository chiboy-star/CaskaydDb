// src/schemas/creator.ts
import { z } from "zod";

export const creatorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  instagramHandle: z.string().optional(),
  instagramFollowers: z.string().optional(), // Changed to string to accept "10k"
  tiktokHandle: z.string().optional(),
  tiktokFollowers: z.string().optional(), // Changed to string
  state: z.string().min(1, "State is required"),
  country: z.string().default("Nigeria"),
  gender: z.string().min(1, "Gender is required"),
  primaryNiche: z.string().min(1, "Primary niche is required"),
  secondaryNiches: z.array(z.string())
    .min(1, "Select at least one secondary niche")
    .max(4, "You can select a maximum of 4 secondary niches"),
  email: z.string().email("Invalid email address"),
})
.refine(data => data.instagramHandle || data.tiktokHandle, {
  message: "Either Instagram or TikTok handle must be provided",
  path: ["instagramHandle"] 
})
// Updated refine logic to check string length
.refine(data => !data.instagramHandle || (data.instagramHandle && data.instagramFollowers && data.instagramFollowers.trim() !== ""), {
  message: "Instagram follower count is required",
  path: ["instagramFollowers"]
})
.refine(data => !data.tiktokHandle || (data.tiktokHandle && data.tiktokFollowers && data.tiktokFollowers.trim() !== ""), {
  message: "TikTok follower count is required",
  path: ["tiktokFollowers"]
});

export type CreatorFormValues = z.infer<typeof creatorSchema>;