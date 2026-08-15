// src/app/actions.ts
'use server'

import { creatorSchema, CreatorFormValues } from "@/schemas/creator"

// Helper: Converts "1.4m" -> 1400000, "33k" -> 33000
function parseFollowerCount(val: string | null | undefined): number {
  if (!val) return 0;
  const str = val.toLowerCase().replace(/,/g, '').trim();
  if (!str) return 0;
  
  let multiplier = 1;
  if (str.endsWith('k')) multiplier = 1000;
  if (str.endsWith('m')) multiplier = 1000000;
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num * multiplier);
} 

// Helper: Generates a dummy slug for category IDs since the UI uses names
function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
}

export async function submitCreatorAction(formData: CreatorFormValues) {
  const validated = creatorSchema.safeParse(formData)
  
  if (!validated.success) {
    console.error("❌ Form Validation Failed:", validated.error.format())
    return { success: false, error: "Validation failed on the server." }
  }

  const data = validated.data

  try {
    const tagsArray = data.searchTags 
      ? data.searchTags.split(',').map(tag => tag.trim()).filter(Boolean)
      : []

    const platforms = []
    
    if (data.instagramHandle) {
      const cleanHandle = data.instagramHandle.replace('@', '').trim()
      platforms.push({
        platform: "INSTAGRAM",
        handle: cleanHandle,
        followers: parseFollowerCount(data.instagramFollowers),
        verified: false,
        profileUrl: `https://instagram.com/${cleanHandle}`
      })
    }

    if (data.tiktokHandle) {
      const cleanHandle = data.tiktokHandle.replace('@', '').trim()
      platforms.push({
        platform: "TIKTOK",
        handle: cleanHandle,
        followers: parseFollowerCount(data.tiktokFollowers),
        verified: false,
        profileUrl: `https://tiktok.com/@${cleanHandle}`
      })
    }

    const payload = {
      name: data.name,
      gender: data.gender,
      country: data.country,
      state: data.state,
      primaryNiche: data.primaryNiche,
      secondaryNiches: data.secondaryNiches,
      businessEmail: data.email.toLowerCase().trim(),
      searchTags: tagsArray,
      platforms: platforms
    }

    console.log("🚀 --- OUTGOING PAYLOAD ---")
    console.log(JSON.stringify(payload, null, 2))

    // TODO: Replace this with your actual authentication token logic
    const token = process.env.API_TOKEN || "YOUR_JWT_TOKEN_HERE"

    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/creators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    })

    const responseData = await response.json().catch(() => null)
    
    console.log(`📥 --- BACKEND RESPONSE (Status: ${response.status}) ---`)
    console.log(responseData)

    if (!response.ok) {
      return { success: false, error: responseData?.message || "The backend API rejected the submission." }
    }

    return { success: true }
    
  } catch (err: any) {
    console.error("🔥 Submission Error:", err)
    return { success: false, error: "Failed to communicate with the local API endpoint." }
  }
}