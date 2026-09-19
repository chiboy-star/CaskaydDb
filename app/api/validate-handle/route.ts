import { NextResponse } from "next/server";
import { NICHE_CATEGORIES } from "@/lib/data";

interface BioAnalysis {
  primaryNiche: string;
  secondaryNiches: string[];
  searchTags: string[];
}

// Strictly extract 1-to-1 matching bio words without adding arbitrary synonyms
function analyzeBioText(text: string): BioAnalysis {
  if (!text || text.trim() === "") {
    return { primaryNiche: "", secondaryNiches: [], searchTags: [] };
  }

  const lower = text.toLowerCase();
  const matchedSecondaries = new Set<string>();
  const exactTags = new Set<string>();
  const categoryScores = new Map<string, number>();

  for (const [primary, subCategories] of Object.entries(NICHE_CATEGORIES)) {
    // Check if primary name is mentioned (e.g. "Beauty", "Lifestyle", "Fashion")
    const cleanPrimary = primary.replace(/&/g, "and");
    const primaryWords = cleanPrimary.toLowerCase().split(/[\s,]+/);
    for (const pw of primaryWords) {
      if (pw.length >= 4 && new RegExp(`\\b${pw}\\b`, "i").test(lower)) {
        categoryScores.set(primary, (categoryScores.get(primary) || 0) + 2);
        exactTags.add(pw);
      }
    }

    // Check sub-categories
    for (const sub of subCategories) {
      const escaped = sub.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(lower)) {
        matchedSecondaries.add(sub);
        exactTags.add(sub.toLowerCase());
        categoryScores.set(primary, (categoryScores.get(primary) || 0) + 1);
      }
    }
  }

  // Pick highest scoring primary niche
  let bestPrimary = "";
  let highestScore = 0;
  for (const [cat, score] of categoryScores.entries()) {
    if (score > highestScore) {
      highestScore = score;
      bestPrimary = cat;
    }
  }

  return {
    primaryNiche: bestPrimary,
    secondaryNiches: Array.from(matchedSecondaries).slice(0, 4),
    searchTags: Array.from(exactTags),
  };
}

function extractEmail(text: string): string | null {
  if (!text) return null;
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform"); // "instagram" | "tiktok"
  const rawValue = searchParams.get("value");

  if (!platform || !rawValue) {
    return NextResponse.json({ error: "Missing platform or value" }, { status: 400 });
  }

  const handle = rawValue.replace(/^@/, "").trim();
  if (!handle) {
    return NextResponse.json({ exists: false, handle: "" });
  }

  try {
    if (platform === "instagram") {
      const res = await fetch(`https://www.instagram.com/${handle}/`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        cache: "no-store",
      });

      const html = await res.text();

      // Check og:description: "680M Followers, 649 Following..."
      const descMatch = html.match(/property=["']og:description["']\s+content=["']([^"']+)["']/i);
      if (!descMatch) {
        return NextResponse.json({ exists: false, platform: "instagram", handle });
      }

      const desc = descMatch[1];
      let followers = "";
      const folMatch = desc.match(/([\d\.,KMkm]+)\s+Followers/i);
      if (folMatch) {
        followers = folMatch[1];
      }

      // Extract display name from title
      let displayName = handle;
      const titleMatch = html.match(/<title>(.*?)\s+\(&#064;/i) || html.match(/<title>(.*?)\s+\(@/i);
      if (titleMatch && titleMatch[1]) {
        displayName = titleMatch[1].trim();
      }

      let bio = "";
      let email = extractEmail(html);

      // If IG_SESSION_ID is configured in environment, fetch full authenticated profile
      const sessionId = process.env.IG_SESSION_ID;
      const idMatch = html.match(/"id":"(\d+)"/);
      if (sessionId && idMatch) {
        try {
          const infoRes = await fetch(`https://i.instagram.com/api/v1/users/${idMatch[1]}/info/`, {
            headers: {
              "Cookie": `sessionid=${sessionId}`,
              "User-Agent": "Instagram 278.0.0.19.115 (iPhone14,2; iOS 16_5; en_US; scale=3.00; 1170x2532)",
            },
            cache: "no-store",
          });
          const infoData = await infoRes.json();
          if (infoData && infoData.user) {
            bio = infoData.user.biography || "";
            if (infoData.user.full_name) {
              displayName = infoData.user.full_name;
            }
            if (infoData.user.public_email) {
              email = infoData.user.public_email;
            } else if (!email) {
              email = extractEmail(bio);
            }
          }
        } catch (sessionErr) {
          console.warn("Instagram session info fetch failed, falling back to public data:", sessionErr);
        }
      }

      const { primaryNiche, secondaryNiches, searchTags } = analyzeBioText(bio);

      return NextResponse.json({
        exists: true,
        platform: "instagram",
        handle,
        displayName,
        followers,
        email,
        bio,
        searchTags,
        primaryNiche,
        secondaryNiches,
      });
    }

    if (platform === "tiktok") {
      const res = await fetch(`https://www.tiktok.com/@${handle}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        cache: "no-store",
      });

      const html = await res.text();

      // Check if avatarLarger or followerCount exists in page HTML
      const avatarMatch = html.match(/"avatarLarger":"([^"]+)"/);
      if (!avatarMatch) {
        return NextResponse.json({ exists: false, platform: "tiktok", handle });
      }

      let followers = "";
      const folMatch = html.match(/"followerCount":(\d+)/);
      if (folMatch) {
        const rawCount = parseInt(folMatch[1], 10);
        if (rawCount >= 1000000) {
          followers = (rawCount / 1000000).toFixed(1).replace(/\.0$/, "") + "m";
        } else if (rawCount >= 1000) {
          followers = (rawCount / 1000).toFixed(1).replace(/\.0$/, "") + "k";
        } else {
          followers = String(rawCount);
        }
      }

      const verMatch = html.match(/"verified":(true|false)/);
      const verified = verMatch ? verMatch[1] === "true" : false;

      let displayName = handle;
      const nickMatch = html.match(/"nickname":"([^"]+)"/);
      if (nickMatch) {
        displayName = nickMatch[1];
      }

      let bio = "";
      const sigMatch = html.match(/"signature":"([^"]*)"/);
      if (sigMatch) {
        try {
          bio = JSON.parse(`"${sigMatch[1]}"`);
        } catch {
          bio = sigMatch[1];
        }
      }

      const email = extractEmail(bio || html);
      const { primaryNiche, secondaryNiches, searchTags } = analyzeBioText(bio);

      return NextResponse.json({
        exists: true,
        platform: "tiktok",
        handle,
        displayName,
        followers,
        verified,
        email,
        bio,
        searchTags,
        primaryNiche,
        secondaryNiches,
      });
    }

    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  } catch (error: any) {
    console.error(`Validation error for ${platform} @${handle}:`, error);
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}
