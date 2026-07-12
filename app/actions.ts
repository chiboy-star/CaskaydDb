// src/app/actions.ts
'use server'

import { db } from "@/lib/db"
import { creatorSchema, CreatorFormValues } from "@/schemas/creator"

export async function submitCreatorAction(formData: CreatorFormValues) {
  // Validate incoming data via Zod on the server side securely
  const validated = creatorSchema.safeParse(formData)
  
  if (!validated.success) {
    return { success: false, error: "Validation failed on the server." }
  }

  const data = validated.data

  try {
    // Standardizing values to avoid unique bypass tricks
    const emailLower = data.email.toLowerCase().trim()
    const igHandleLower = data.instagramHandle?.toLowerCase().trim() || null
    const ttHandleLower = data.tiktokHandle?.toLowerCase().trim() || null

    const newCreator = await db.creator.create({
      data: {
        name: data.name,
        instagramHandle: igHandleLower,
        instagramFollowers: data.instagramFollowers || null,
        tiktokHandle: ttHandleLower,
        tiktokFollowers: data.tiktokFollowers || null,
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