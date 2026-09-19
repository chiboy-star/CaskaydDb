# Caskayd Creator Registry & Populator (`CaskaydDb`)

The internal creator administration portal and ingestion suite for Caskayd. Designed for high-speed creator discovery, instant social handle verification, automated bio metadata extraction, and streamlined database ingestion.

---

## Key Features

### 1. Dual Workflow System
- **⚡ Quick Ingest Queue**:
  - Automatically loads discovery candidates from the crawler (`CreatorSuggestion` table with status `PENDING`).
  - Interactive horizontal suggestion cards deck displaying the handle, display name, follower count, and verification status.
  - Clicking any candidate instantly loads their profile, performs live Instagram & TikTok validation, auto-extracts bio keywords, and prepares the creator record.
  - One-click approval button (`✓ Approve & Ingest @username (Auto-advances queue)`) saves the creator to the database, automatically removes the candidate from the pending suggestion queue, and auto-loads the next suggestion in sequence.
  - Individual suggestions can also be dismissed with a single click (`✕`).
- **✍️ Manual Blank Entry**:
  - A clean, unpopulated form designed for manually onboarding specific creators.
  - Allows full manual control over every field with real-time verification and auto-population still active.

### 2. Handle-First Verification Flow
- Inputs are ordered with `@handle` fields prominently placed at the top of the form.
- **Instagram Verification**:
  - Live asynchronous handle validation against Instagram.
  - Displays a green animated checkmark badge (`✓ Verified Profile`) or a red indicator if invalid.
  - Automatically fetches and populates:
    - Creator's full display name.
    - Verified badge status.
    - True follower count.
    - Biography text and embedded contact email (regex-scanned).
- **TikTok Verification**:
  - Live asynchronous handle validation against TikTok public web profiles.
  - Displays real-time confirmation badge and auto-populates TikTok follower count.

### 3. Intelligent Bio-to-Tag & Niche Auto-Fill
- Analyzes bio text and extracts exact 1-to-1 keyword matches against Caskayd's recognized search tags (avoiding duplicate or synthetic synonym stuffing).
- Automatically assigns primary and secondary niches from `lib/data.ts` based on direct bio keyword context.
- Maintains administrative oversight: tags and niches can be fine-tuned or customized prior to final submission.

### 4. Resilient Multi-Path Ingestion
- Ingests creators with full relational integrity (`Creator` record + nested `CreatorPlatform` records for Instagram & TikTok).
- **Dual-Path Strategy**: Attempts primary submission via `CaskaydBackend-Live` API (`POST /api/creators`). If the backend server is offline or unreachable, seamlessly falls back to direct Supabase PostgreSQL insertion with atomic client transactions.

---

## Environment Variables (`.env.local`)

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Instagram Session (Used for server-side bio & suggested user discovery)
IG_SESSION_ID=your-instagram-session-cookie

# Backend API URL (Optional, defaults to http://localhost:3000/api)
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev -p 3001
   ```

3. Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## Scripts

- `npm run dev`: Runs Next.js development server.
- `npm run build`: Compiles production build.
- `npm run start`: Starts production server.
- `npm run lint`: Runs ESLint checks.
