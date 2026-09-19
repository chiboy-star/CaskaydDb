// components/creator-form.tsx
"use client"

import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { creatorSchema, CreatorFormValues } from "@/schemas/creator"
import { NIGERIAN_STATES, NICHE_CATEGORIES } from "@/lib/data"
import { SearchableSelect } from "@/components/searchable-select"
import { SearchableMultiSelect } from "@/components/searchable-multi-select"
import { submitCreatorAction } from "@/app/actions"

interface HandleStatus {
  checked: boolean;
  valid: boolean;
  followers?: string;
  name?: string;
  message?: string;
}

interface SuggestionItem {
  id: string;
  name?: string;
  username: string;
  platform: string;
  link?: string;
  status: string;
  createdAt: string;
}

export function CreatorForm() {
  const [mode, setMode] = React.useState<"queue" | "manual">("queue")
  const [suggestions, setSuggestions] = React.useState<SuggestionItem[]>([])
  const [activeSuggestionIndex, setActiveSuggestionIndex] = React.useState<number>(0)
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(true)

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [validatingHandles, setValidatingHandles] = React.useState({ instagram: false, tiktok: false })
  const [duplicateStatus, setDuplicateStatus] = React.useState({ instagram: false, tiktok: false })
  const [handleValidation, setHandleValidation] = React.useState<{
    instagram: HandleStatus;
    tiktok: HandleStatus;
  }>({
    instagram: { checked: false, valid: false },
    tiktok: { checked: false, valid: false },
  })

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
    reset,
    getValues
  } = useForm<CreatorFormValues>({
    resolver: zodResolver(creatorSchema) as any,
    defaultValues: {
      name: "",
      instagramHandle: "",
      instagramFollowers: "",
      tiktokHandle: "",
      tiktokFollowers: "",
      country: "Nigeria",
      state: "",
      gender: "",
      primaryNiche: "",
      secondaryNiches: [],
      email: "",
      searchTags: "",
    },
  })

  // Watch fields
  const igHandle = useWatch({ control, name: "instagramHandle" })
  const ttHandle = useWatch({ control, name: "tiktokHandle" })
  const selectedPrimaryNiche = useWatch({ control, name: "primaryNiche" })
  const selectedState = useWatch({ control, name: "state" })
  const selectedSecondaryNiches = useWatch({ control, name: "secondaryNiches" })
  const allAvailableNiches = React.useMemo(() => {
    return Array.from(new Set(Object.values(NICHE_CATEGORIES).flat())).sort()
  }, [])

  // Lock logic
  const hasValidHandle = 
    (igHandle && igHandle.trim().length > 0 && !duplicateStatus.instagram && (!handleValidation.instagram.checked || handleValidation.instagram.valid)) || 
    (ttHandle && ttHandle.trim().length > 0 && !duplicateStatus.tiktok && (!handleValidation.tiktok.checked || handleValidation.tiktok.valid))

  // Fetch suggestions on mount
  const fetchSuggestions = React.useCallback(async () => {
    setLoadingSuggestions(true)
    try {
      const res = await fetch("/api/suggestions")
      const data = await res.json()
      if (data.suggestions) {
        setSuggestions(data.suggestions)
      }
    } catch (e) {
      console.error("Failed to load suggestions:", e)
    } finally {
      setLoadingSuggestions(false)
    }
  }, [])

  React.useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  // Real-time verification and auto-population
  const verifyAndValidateHandle = React.useCallback(async (platform: "instagram" | "tiktok", rawHandle: string) => {
    if (!rawHandle || rawHandle.trim() === "") {
      setDuplicateStatus(prev => ({ ...prev, [platform]: false }))
      setHandleValidation(prev => ({ ...prev, [platform]: { checked: false, valid: false } }))
      return
    }

    const cleanHandle = rawHandle.replace("@", "").trim()
    setValidatingHandles(prev => ({ ...prev, [platform]: true }))

    try {
      // 1. Check duplicate in local database
      const dupRes = await fetch(`/api/check-handle?platform=${platform}&value=${cleanHandle}`)
      const dupData = await dupRes.json()

      if (dupData.exists) {
        setDuplicateStatus(prev => ({ ...prev, [platform]: true }))
        setHandleValidation(prev => ({
          ...prev,
          [platform]: {
            checked: true,
            valid: false,
            message: `Handle @${cleanHandle} is already registered in Caskayd.`,
          },
        }))
        toast.error(`The ${platform === "instagram" ? "Instagram" : "TikTok"} handle is already in the database.`)
        return
      } else {
        setDuplicateStatus(prev => ({ ...prev, [platform]: false }))
      }

      // 2. Validate live social existence & fetch followers ($0 minimal endpoint)
      const valRes = await fetch(`/api/validate-handle?platform=${platform}&value=${cleanHandle}`)
      const valData = await valRes.json()

      if (valData.exists) {
        setHandleValidation(prev => ({
          ...prev,
          [platform]: {
            checked: true,
            valid: true,
            followers: valData.followers,
            name: valData.displayName,
            message: `Found on ${platform === "instagram" ? "Instagram" : "TikTok"}: ${valData.displayName} (${valData.followers} followers)`,
          },
        }))

        // Auto-populate followers
        if (platform === "instagram" && valData.followers) {
          setValue("instagramFollowers", valData.followers, { shouldValidate: true })
        } else if (platform === "tiktok" && valData.followers) {
          setValue("tiktokFollowers", valData.followers, { shouldValidate: true })
        }

        // Auto-populate creator name if currently empty
        const currentName = getValues("name")
        if (!currentName && valData.displayName && valData.displayName !== cleanHandle) {
          setValue("name", valData.displayName, { shouldValidate: true })
        }

        // Auto-populate email if found in bio and field is empty
        const currentEmail = getValues("email")
        if (!currentEmail && valData.email) {
          setValue("email", valData.email, { shouldValidate: true })
        }

        // Auto-populate primary niche if currently empty and bio matched one
        const currentPrimaryNiche = getValues("primaryNiche")
        if (!currentPrimaryNiche && valData.primaryNiche) {
          setValue("primaryNiche", valData.primaryNiche, { shouldValidate: true })
        }

        // Auto-populate secondary niches (merge up to 4)
        if (valData.secondaryNiches && valData.secondaryNiches.length > 0) {
          const currentSecondary = getValues("secondaryNiches") || []
          const merged = Array.from(new Set([...currentSecondary, ...valData.secondaryNiches])).slice(0, 4)
          setValue("secondaryNiches", merged, { shouldValidate: true })
        }

        // Auto-populate search tags strictly from 1-to-1 bio words (merge unique)
        if (valData.searchTags && valData.searchTags.length > 0) {
          const currentTags = getValues("searchTags") || ""
          const existingTagsList = currentTags.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean)
          const newTags = valData.searchTags.filter((t: string) => !existingTagsList.includes(t.toLowerCase()))
          if (newTags.length > 0) {
            const combined = existingTagsList.length > 0
              ? (currentTags + ", " + newTags.join(", "))
              : newTags.join(", ")
            setValue("searchTags", combined, { shouldValidate: true })
          }
        }
      } else {
        setHandleValidation(prev => ({
          ...prev,
          [platform]: {
            checked: true,
            valid: false,
            message: `Account "@${cleanHandle}" was not found on ${platform === "instagram" ? "Instagram" : "TikTok"}. Double check for typos!`,
          },
        }))
      }
    } catch (error) {
      console.error("Error validating handle:", error)
    } finally {
      setValidatingHandles(prev => ({ ...prev, [platform]: false }))
    }
  }, [setValue, getValues])

  // Select and load a suggestion into the form
  const loadSuggestion = React.useCallback((sugg: SuggestionItem, idx: number) => {
    setActiveSuggestionIndex(idx)
    reset({
      name: sugg.name || "",
      instagramHandle: sugg.platform?.toUpperCase() === "INSTAGRAM" ? sugg.username : "",
      instagramFollowers: "",
      tiktokHandle: sugg.platform?.toUpperCase() === "TIKTOK" ? sugg.username : "",
      tiktokFollowers: "",
      country: "Nigeria",
      state: "",
      gender: "",
      primaryNiche: "",
      secondaryNiches: [],
      email: "",
      searchTags: "",
    })

    setDuplicateStatus({ instagram: false, tiktok: false })
    setHandleValidation({
      instagram: { checked: false, valid: false },
      tiktok: { checked: false, valid: false },
    })

    // Immediately trigger live verification
    const platform = sugg.platform?.toUpperCase() === "TIKTOK" ? "tiktok" : "instagram"
    verifyAndValidateHandle(platform, sugg.username)
  }, [reset, verifyAndValidateHandle])

  // Initial load of first suggestion if in queue mode
  React.useEffect(() => {
    if (mode === "queue" && suggestions.length > 0 && !igHandle && !ttHandle) {
      loadSuggestion(suggestions[0], 0)
    }
  }, [mode, suggestions, igHandle, ttHandle, loadSuggestion])

  const dismissSuggestion = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/suggestions?id=${id}`, { method: "DELETE" })
      const nextSuggestions = suggestions.filter(s => s.id !== id)
      setSuggestions(nextSuggestions)
      toast.info("Suggestion dismissed")
      if (nextSuggestions.length > 0) {
        const nextIdx = Math.min(activeSuggestionIndex, nextSuggestions.length - 1)
        loadSuggestion(nextSuggestions[nextIdx], nextIdx)
      } else {
        reset()
      }
    } catch {
      toast.error("Failed to dismiss suggestion")
    }
  }

  const activeSuggestion = suggestions[activeSuggestionIndex]

  const onSubmit = async (data: CreatorFormValues) => {
    setIsSubmitting(true)
    try {
      if (data.instagramHandle) data.instagramHandle = data.instagramHandle.replace("@", "").trim()
      if (data.tiktokHandle) data.tiktokHandle = data.tiktokHandle.replace("@", "").trim()

      const suggestionId = mode === "queue" && activeSuggestion ? activeSuggestion.id : undefined
      const result = await submitCreatorAction(data, suggestionId)

      if (result.success) {
        toast.success("✓ Creator successfully ingested!", {
          description: "Database record created and suggestion marked done.",
        })

        if (mode === "queue" && activeSuggestion) {
          // Remove from local suggestions list
          const nextSuggestions = suggestions.filter(s => s.id !== activeSuggestion.id)
          setSuggestions(nextSuggestions)

          if (nextSuggestions.length > 0) {
            const nextIdx = Math.min(activeSuggestionIndex, nextSuggestions.length - 1)
            toast.info(`Advancing to next suggestion (${nextSuggestions.length} remaining)...`)
            loadSuggestion(nextSuggestions[nextIdx], nextIdx)
          } else {
            reset()
            toast.success("🎉 All caught up! The suggestion queue is complete.")
          }
        } else {
          reset()
          setDuplicateStatus({ instagram: false, tiktok: false })
          setHandleValidation({
            instagram: { checked: false, valid: false },
            tiktok: { checked: false, valid: false },
          })
        }
      } else {
        toast.error("Submission failed", { description: result.error })
      }
    } catch {
      toast.error("An unexpected error occurred during submission.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-6">
      {/* View Switcher Controls */}
      <div className="flex items-center justify-between mb-8 p-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-inner">
        <button
          type="button"
          onClick={() => {
            setMode("queue")
            if (suggestions.length > 0) {
              loadSuggestion(suggestions[0], 0)
            }
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
            mode === "queue"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
          }`}
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>⚡ Quick Ingest Queue</span>
          {suggestions.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 text-xs font-bold rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              {suggestions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("manual")
            reset()
            setDuplicateStatus({ instagram: false, tiktok: false })
            setHandleValidation({
              instagram: { checked: false, valid: false },
              tiktok: { checked: false, valid: false },
            })
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
            mode === "manual"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
          }`}
        >
          <span>✍️ Manual Blank Entry</span>
        </button>
      </div>

      {/* Suggestion Queue Cards Deck */}
      {mode === "queue" && (
        <div className="mb-8 p-5 bg-gradient-to-br from-zinc-50 to-zinc-100/60 dark:from-zinc-900/60 dark:to-zinc-900/20 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                Pending Suggestions ({suggestions.length})
              </h4>
              <span className="text-xs text-zinc-500">• Click any card to load</span>
            </div>
            <button
              type="button"
              onClick={fetchSuggestions}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
            >
              🔄 Refresh Queue
            </button>
          </div>

          {loadingSuggestions ? (
            <div className="py-6 text-center text-sm text-zinc-500 animate-pulse">
              Loading pending suggestions...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                🎉 All caught up! No pending suggestions in the queue.
              </p>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Switch to Manual Blank Entry
              </button>
            </div>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
              {suggestions.map((sugg, idx) => {
                const isActive = idx === activeSuggestionIndex
                const isInstagram = sugg.platform?.toUpperCase() === "INSTAGRAM"

                return (
                  <div
                    key={sugg.id}
                    onClick={() => loadSuggestion(sugg, idx)}
                    className={`flex-shrink-0 cursor-pointer px-3.5 py-2.5 rounded-xl border text-left transition-all duration-200 flex items-center gap-3 ${
                      isActive
                        ? "bg-white dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-900/10 dark:ring-zinc-100/10 shadow-md"
                        : "bg-white/60 dark:bg-zinc-800/40 border-zinc-200/70 dark:border-zinc-700/60 hover:bg-white hover:border-zinc-300"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isInstagram ? "bg-pink-100 text-pink-700" : "bg-black text-white"
                    }`}>
                      {isInstagram ? "IG" : "TT"}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          @{sugg.username}
                        </span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 max-w-[110px] truncate">
                        {sugg.name || "Suggested creator"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => dismissSuggestion(sugg.id, e)}
                      className="text-zinc-400 hover:text-rose-500 text-xs px-1 hover:bg-rose-50 rounded transition-colors"
                      title="Dismiss/Skip suggestion"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {activeSuggestion && (
            <div className="mt-3.5 pt-3 border-t border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                Reviewing <strong>{activeSuggestionIndex + 1} of {suggestions.length}</strong>: @{activeSuggestion.username}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Auto-validating • Pick State and Approve
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Registration Form */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Section 1: Identification */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-1 bg-zinc-800 rounded-full"></div>
                <h3 className="text-lg font-semibold">1. Social Accounts & Identity</h3>
              </div>
              {mode === "queue" && activeSuggestion && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  Ingesting: @{activeSuggestion.username}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Instagram Handle */}
              <div>
                <Label htmlFor="instagramHandle" className="text-sm font-medium">Instagram Handle</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-3 text-muted-foreground">@</span>
                  <Input 
                    id="instagramHandle" 
                    {...register("instagramHandle")} 
                    placeholder="username"
                    className={`pl-8 pr-10 h-11 ${
                      duplicateStatus.instagram || (handleValidation.instagram.checked && !handleValidation.instagram.valid)
                        ? "border-red-400 focus-visible:ring-red-400 bg-red-50/40" 
                        : handleValidation.instagram.checked && handleValidation.instagram.valid
                        ? "border-emerald-400 focus-visible:ring-emerald-400 bg-emerald-50/20"
                        : "bg-zinc-50/50 focus-visible:ring-zinc-800"
                    }`}
                    onBlur={(e) => verifyAndValidateHandle("instagram", e.target.value)}
                  />

                  {/* Status Indicator Icon */}
                  <div className="absolute right-3 top-3 flex items-center">
                    {validatingHandles.instagram && (
                      <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin"></div>
                    )}
                    {!validatingHandles.instagram && handleValidation.instagram.checked && (
                      handleValidation.instagram.valid ? (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold animate-in zoom-in duration-200 shadow-sm" title="Account verified">
                          ✓
                        </span>
                      ) : (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold animate-in zoom-in duration-200 shadow-sm" title="Account not found">
                          ✕
                        </span>
                      )
                    )}
                  </div>
                </div>

                {validatingHandles.instagram && (
                  <p className="text-xs text-blue-500 mt-1.5 font-medium animate-pulse">Checking Instagram account...</p>
                )}

                {!validatingHandles.instagram && handleValidation.instagram.checked && (
                  <p className={`text-xs mt-1.5 font-medium flex items-center gap-1.5 ${
                    handleValidation.instagram.valid ? "text-emerald-600" : "text-rose-600"
                  }`}>
                    {handleValidation.instagram.valid ? "✓" : "⚠️"} {handleValidation.instagram.message}
                  </p>
                )}
              </div>

              {/* TikTok Handle */}
              <div>
                <Label htmlFor="tiktokHandle" className="text-sm font-medium">TikTok Handle</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-3 text-muted-foreground">@</span>
                  <Input 
                    id="tiktokHandle" 
                    {...register("tiktokHandle")} 
                    placeholder="username"
                    className={`pl-8 pr-10 h-11 ${
                      duplicateStatus.tiktok || (handleValidation.tiktok.checked && !handleValidation.tiktok.valid)
                        ? "border-red-400 focus-visible:ring-red-400 bg-red-50/40" 
                        : handleValidation.tiktok.checked && handleValidation.tiktok.valid
                        ? "border-emerald-400 focus-visible:ring-emerald-400 bg-emerald-50/20"
                        : "bg-zinc-50/50 focus-visible:ring-zinc-800"
                    }`}
                    onBlur={(e) => verifyAndValidateHandle("tiktok", e.target.value)}
                  />

                  {/* Status Indicator Icon */}
                  <div className="absolute right-3 top-3 flex items-center">
                    {validatingHandles.tiktok && (
                      <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin"></div>
                    )}
                    {!validatingHandles.tiktok && handleValidation.tiktok.checked && (
                      handleValidation.tiktok.valid ? (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold animate-in zoom-in duration-200 shadow-sm" title="Account verified">
                          ✓
                        </span>
                      ) : (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold animate-in zoom-in duration-200 shadow-sm" title="Account not found">
                          ✕
                        </span>
                      )
                    )}
                  </div>
                </div>

                {validatingHandles.tiktok && (
                  <p className="text-xs text-blue-500 mt-1.5 font-medium animate-pulse">Checking TikTok account...</p>
                )}

                {!validatingHandles.tiktok && handleValidation.tiktok.checked && (
                  <p className={`text-xs mt-1.5 font-medium flex items-center gap-1.5 ${
                    handleValidation.tiktok.valid ? "text-emerald-600" : "text-rose-600"
                  }`}>
                    {handleValidation.tiktok.valid ? "✓" : "⚠️"} {handleValidation.tiktok.message}
                  </p>
                )}
              </div>

              {/* Full Name */}
              <div className="col-span-full md:col-span-2">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <Input id="name" {...register("name")} placeholder="e.g. John Doe" className="mt-2 h-11 bg-zinc-50/50 focus-visible:ring-zinc-800" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>
            </div>
          </div>

          {/* Locked Overlay Wrapper */}
          <div className="relative">
            {!hasValidHandle && (
              <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300">
                <div className="bg-white p-4 rounded-full shadow-sm mb-3">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <p className="text-sm font-medium text-zinc-600">Enter a verified social handle to unlock form</p>
              </div>
            )}

            {/* Section 2: Details */}
            <div className={`space-y-8 transition-all duration-500 ${hasValidHandle ? "opacity-100" : "opacity-30 select-none"}`}>
              {/* Follower Counts */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-zinc-800 rounded-full"></div>
                  <h3 className="text-lg font-semibold">2. Follower Counts</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className={`text-sm font-medium ${!igHandle || duplicateStatus.instagram ? "text-zinc-400" : ""}`}>Instagram Followers</Label>
                    <Input 
                      disabled={!igHandle || duplicateStatus.instagram} 
                      {...register("instagramFollowers")} 
                      placeholder="e.g. 50k, 1.2m" 
                      className="mt-2 h-11 bg-zinc-50/50 focus-visible:ring-zinc-800" 
                    />
                    {errors.instagramFollowers && <p className="text-xs text-red-500 mt-1">{errors.instagramFollowers.message}</p>}
                  </div>
                  <div>
                    <Label className={`text-sm font-medium ${!ttHandle || duplicateStatus.tiktok ? "text-zinc-400" : ""}`}>TikTok Followers</Label>
                    <Input 
                      disabled={!ttHandle || duplicateStatus.tiktok} 
                      {...register("tiktokFollowers")} 
                      placeholder="e.g. 120k, 2.5m" 
                      className="mt-2 h-11 bg-zinc-50/50 focus-visible:ring-zinc-800" 
                    />
                    {errors.tiktokFollowers && <p className="text-xs text-red-500 mt-1">{errors.tiktokFollowers.message}</p>}
                  </div>
                </div>
              </div>

              {/* Demographics */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-zinc-800 rounded-full"></div>
                  <h3 className="text-lg font-semibold">3. Demographics & Location</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Gender</Label>
                    <Select onValueChange={(val: any) => setValue("gender", String(val), { shouldValidate: true })}>
                      <SelectTrigger className="h-11 bg-zinc-50/50 focus:ring-zinc-800">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Non-binary">Non-binary</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-xs text-red-500 mt-1">{errors.gender.message}</p>}
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Country</Label>
                    <Input disabled {...register("country")} className="h-11 bg-zinc-100 text-zinc-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">State</Label>
                    <div className="h-11 [&>button]:h-11 [&>button]:bg-zinc-50/50 [&>button:focus]:ring-zinc-800">
                      <SearchableSelect 
                        options={NIGERIAN_STATES}
                        value={selectedState}
                        onChange={(val) => setValue("state", val, { shouldValidate: true })}
                        placeholder="Select State"
                      />
                    </div>
                    {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Primary Niche</Label>
                    <div className="h-11 [&>button]:h-11 [&>button]:bg-zinc-50/50 [&>button:focus]:ring-zinc-800">
                      <SearchableSelect 
                        options={Object.keys(NICHE_CATEGORIES)}
                        value={selectedPrimaryNiche}
                        onChange={(val) => {
                          setValue("primaryNiche", val, { shouldValidate: true })
                        }}
                        placeholder="Select Primary"
                      />
                    </div>
                    {errors.primaryNiche && <p className="text-xs text-red-500 mt-1">{errors.primaryNiche.message}</p>}
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Secondary Niches (Max 4)</Label>
                    <div className="[&>button]:min-h-[44px] [&>button]:bg-zinc-50/50 [&>button:focus]:ring-zinc-800">
                      <SearchableMultiSelect 
                        options={allAvailableNiches.filter(n => n !== selectedPrimaryNiche)}
                        selected={selectedSecondaryNiches || []}
                        onChange={(val) => {
                          if (val.length <= 4) {
                            setValue("secondaryNiches", val, { shouldValidate: true })
                          } else {
                            toast.error("You can only select up to 4 secondary niches.")
                          }
                        }}
                        placeholder="Add up to 4 sub-categories"
                        disabled={false}
                      />
                      {errors.secondaryNiches && <p className="text-xs text-red-500 mt-1">{errors.secondaryNiches.message}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact & Metadata */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-zinc-800 rounded-full"></div>
                  <h3 className="text-lg font-semibold">4. Niche & Discovery</h3>
                </div>

                <div>
                  <Label htmlFor="searchTags" className="text-sm font-medium">Search Tags (Comma separated)</Label>
                  <Input 
                    id="searchTags" 
                    {...register("searchTags")} 
                    placeholder="e.g. comedy, lagos, gen-z" 
                    className="mt-2 h-11 bg-zinc-50/50 focus-visible:ring-zinc-800" 
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">Auto-extracted from bio keywords. Feel free to tweak.</p>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium">Business Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    {...register("email")} 
                    placeholder="contact@creator.com" 
                    className="mt-2 h-11 bg-zinc-50/50 focus-visible:ring-zinc-800" 
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !hasValidHandle}
                  className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-xl shadow-sm text-base transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Ingesting Creator to Live Database...</span>
                    </>
                  ) : mode === "queue" && activeSuggestion ? (
                    <>
                      <span>✓ Approve & Ingest @{activeSuggestion.username}</span>
                      <span className="text-xs font-normal opacity-80">(Auto-advances queue)</span>
                    </>
                  ) : (
                    <span>Register Creator</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
