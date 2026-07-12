// src/app/actions.ts
'use server'

import { db } from "@/lib/db"
import { creatorSchema, CreatorFormValues } from "@/schemas/creator"

// Helper: Converts "1.4m" -> 1400000, "33k" -> 33000
function parseFollowerCount(val: string | null | undefined): number | null {
  if (!val) return null;
  const str = val.toLowerCase().replace(/,/g, '').trim();
  if (!str) return null;
  
  let multiplier = 1;
  if (str.endsWith('k')) multiplier = 1000;
  if (str.endsWith('m')) multiplier = 1000000;
  
  const num = parseFloat(str);
  return isNaN(num) ? null : Math.round(num * multiplier);
}

// Helper: Assigns a tier based on the raw integer
function getFollowerTier(count: number | null): string | null {
  if (count === null) return null;
  if (count >= 1000000) return "1M+";
  if (count >= 500000) return "500k - 1M";
  if (count >= 100000) return "100k - 500k";
  if (count >= 50000) return "50k - 100k";
  if (count >= 10000) return "10k - 50k";
  return "0 - 10k";
}

export async function submitCreatorAction(formData: CreatorFormValues) {
  const validated = creatorSchema.safeParse(formData)
  
  if (!validated.success) {
    return { success: false, error: "Validation failed on the server." }
  }

  const data = validated.data

  try {
    const emailLower = data.email.toLowerCase().trim()
    const igHandleLower = data.instagramHandle?.toLowerCase().trim() || null
    const ttHandleLower = data.tiktokHandle?.toLowerCase().trim() || null

    // 1. Translate the shorthand strings into raw integers
    const igFollowersInt = parseFollowerCount(data.instagramFollowers)
    const ttFollowersInt = parseFollowerCount(data.tiktokFollowers)

    // 2. Automatically calculate the tiers
    const igTier = getFollowerTier(igFollowersInt)
    const ttTier = getFollowerTier(ttFollowersInt)

    const newCreator = await db.creator.create({
      data: {
        name: data.name,
        instagramHandle: igHandleLower,
        instagramFollowers: igFollowersInt, // e.g., 333000
        instagramTier: igTier,              // e.g., "100k - 500k"
        tiktokHandle: ttHandleLower,
        tiktokFollowers: ttFollowersInt,
        tiktokTier: ttTier,
        country: "Nigeria",
        state: data.state,
        gender: data.gender,
        primaryNiche: data.primaryNiche,
        secondaryNiches: data.secondaryNiches,
        email: emailLower,
      }
    })

    return { success: true, creatorId: newCreator.id }
  } catch (err: any) {
    console.error("Submission DB Error:", err)
    if (err.code === 'P2002') {
      return { success: false, error: "A creator with this identifier already exists in our database." }
    }
    return { success: false, error: "Something went wrong saving the creator." }
  }
}