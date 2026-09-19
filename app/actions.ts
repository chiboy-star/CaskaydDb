'use server'

import { creatorSchema, CreatorFormValues } from "@/schemas/creator"

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ykrjylzazcnfcexdvfaq.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

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

export async function submitCreatorAction(formData: CreatorFormValues, suggestionId?: string) {
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

    let submitted = false;
    const token = process.env.API_TOKEN || "YOUR_JWT_TOKEN_HERE";
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${baseUrl}/api/creators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        submitted = true;
      }
    } catch {
      // Backend not running locally; fallback directly to database
    }

    if (!submitted) {
      // Direct Supabase Ingestion
      const creatorId = crypto.randomUUID();
      const creatorRes = await fetch(`${SUPABASE_URL}/rest/v1/Creator`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          id: creatorId,
          name: data.name,
          country: data.country,
          state: data.state,
          gender: data.gender,
          businessEmail: data.email.toLowerCase().trim(),
        }),
      });

      if (!creatorRes.ok) {
        const errText = await creatorRes.text();
        console.error("Supabase Creator insert error:", errText);
        return { success: false, error: "Failed to persist creator to database." };
      }

      // Insert platforms
      for (const p of platforms) {
        await fetch(`${SUPABASE_URL}/rest/v1/CreatorPlatform`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            creatorId: creatorId,
            platform: p.platform,
            handle: p.handle,
            followers: p.followers,
            verified: p.verified,
            profileUrl: p.profileUrl,
          }),
        });
      }
    }

    // Delete suggestion if this was ingested from the suggestion queue
    if (suggestionId) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/CreatorSuggestion?id=eq.${suggestionId}`, {
          method: "DELETE",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
          },
        });
        console.log(`Deleted suggestion ${suggestionId} after successful approval.`);
      } catch (delErr) {
        console.warn(`Failed to delete suggestion ${suggestionId}:`, delErr);
      }
    }

    return { success: true };
    
  } catch (err: any) {
    console.error("🔥 Submission Error:", err);
    return { success: false, error: err.message || "Failed to submit creator." };
  }
}
