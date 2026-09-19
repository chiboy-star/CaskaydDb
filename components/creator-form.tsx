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

export function CreatorForm() {
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
    },
  })

  // Watch fields to handle conditional access requirements
  const igHandle = useWatch({ control, name: "instagramHandle" })
  const ttHandle = useWatch({ control, name: "tiktokHandle" })
  const selectedPrimaryNiche = useWatch({ control, name: "primaryNiche" })
  const selectedState = useWatch({ control, name: "state" })
  const selectedSecondaryNiches = useWatch({ control, name: "secondaryNiches" })
  const allAvailableNiches = React.useMemo(() => {
    return Array.from(new Set(Object.values(NICHE_CATEGORIES).flat())).sort()
  }, [])

  // Lock logic: Unlocks form if at least one handle is provided, valid, and not duplicate
  const hasValidHandle = 
    (igHandle && igHandle.trim().length > 0 && !duplicateStatus.instagram && (!handleValidation.instagram.checked || handleValidation.instagram.valid)) || 
    (ttHandle && ttHandle.trim().length > 0 && !duplicateStatus.tiktok && (!handleValidation.tiktok.checked || handleValidation.tiktok.valid))

  // Real-time verification and auto-population
  const verifyAndValidateHandle = async (platform: "instagram" | "tiktok", rawHandle: string) => {
    if (!rawHandle || rawHandle.trim() === "") {
      setDuplicateStatus(prev => ({ ...prev, [platform]: false }))
      setHandleValidation(prev => ({ ...prev, [platform]: { checked: false, valid: false } }))
      return
    }

    const cleanHandle = rawHandle.replace("@", "").trim()
    setValidatingHandles(prev => ({ ...prev, [platform]: true }))

    try {
      // 1. Check duplicate in local Caskayd database
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
              : newTags.join(", ");
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
  }

  const onSubmit = async (data: CreatorFormValues) => {
    setIsSubmitting(true)
    try {
      if (data.instagramHandle) data.instagramHandle = data.instagramHandle.replace("@", "").trim()
      if (data.tiktokHandle) data.tiktokHandle = data.tiktokHandle.replace("@", "").trim()

      const result = await submitCreatorAction(data)
      if (result.success) {
        toast.success("Creator successfully submitted!", {
          description: "The database record has been safely updated.",
        })
        reset()
        setDuplicateStatus({ instagram: false, tiktok: false })
        setHandleValidation({
          instagram: { checked: false, valid: false },
          tiktok: { checked: false, valid: false },
        })
      } else {
        toast.error("Submission failed", { description: result.error })
      }
    } catch (err) {
      toast.error("An unexpected error occurred during submission.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-8">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-background border border-border/40 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-zinc-900 px-8 py-6 border-b">
          <h2 className="font-serif font-medium tracking-tight text-white text-3xl md:text-5xl drop-shadow-xl leading-tight">Caskayd Registry</h2>
        </div>

        <div className="p-8 space-y-10">
          
          {/* Section 1: Gatekeeper */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b pb-2">
              <div className="h-6 w-1 bg-zinc-800 rounded-full"></div>
              <h3 className="text-lg font-semibold">1. Identification</h3>
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
              
              {/* Analytics */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-zinc-800 rounded-full"></div>
                  <h3 className="text-lg font-semibold">2. Analytics</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className={`text-sm font-medium ${!igHandle || duplicateStatus.instagram ? "text-zinc-400" : ""}`}>Instagram Followers</Label>
                    <Input 
                      disabled={!igHandle || duplicateStatus.instagram} 
                      {...register("instagramFollowers")} 
                      placeholder="e.g. 50k, 1.2m"
                      className="mt-2 h-11 bg-zinc-50/50 focus-visible:ring-zinc-800 disabled:bg-zinc-100"
                    />
                  </div>
                  <div>
                    <Label className={`text-sm font-medium ${!ttHandle || duplicateStatus.tiktok ? "text-zinc-400" : ""}`}>TikTok Followers</Label>
                    <Input 
                      disabled={!ttHandle || duplicateStatus.tiktok} 
                      {...register("tiktokFollowers")} 
                      placeholder="e.g. 120k, 2.5m"
                      className="mt-2 h-11 bg-zinc-50/50 focus-visible:ring-zinc-800 disabled:bg-zinc-100"
                    />
                  </div>
                </div>
              </div>

              {/* Categorization */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-zinc-800 rounded-full"></div>
                  <h3 className="text-lg font-semibold">3. Categorization & Location</h3>
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
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Country</Label>
                    <Input value="Nigeria" disabled className="h-11 bg-zinc-100 text-zinc-500 font-medium cursor-not-allowed" />
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
                  <h3 className="text-lg font-semibold">4. Contact & Metadata</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="searchTags" className="text-sm font-medium">Search Tags</Label>
                    <Input 
                      id="searchTags" 
                      {...register("searchTags")} 
                      placeholder="e.g. comedy, lagos, gen-z" 
                      className="mt-2 h-11 bg-zinc-50/50 focus-visible:ring-zinc-800" 
                    />
                    <p className="text-xs text-zinc-400 mt-1">Separate tags with commas.</p>
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
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full h-12 text-md font-semibold bg-zinc-900 hover:bg-zinc-800 text-white transition-colors" disabled={isSubmitting || !hasValidHandle}>
                  {isSubmitting ? "Processing Entry..." : "Securely Register Creator"}
                </Button>
              </div>

            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
