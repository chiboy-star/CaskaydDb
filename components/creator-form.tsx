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

export function CreatorForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [validatingHandles, setValidatingHandles] = React.useState({ instagram: false, tiktok: false })
  const [duplicateStatus, setDuplicateStatus] = React.useState({ instagram: false, tiktok: false })

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
    reset
  } = useForm<CreatorFormValues>({
    resolver: zodResolver(creatorSchema) as any, // <--- ADD "as any" HERE
    defaultValues: {
      name: "",
      instagramHandle: "",
      instagramFollowers: undefined,
      tiktokHandle: "",
      tiktokFollowers: undefined,
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

  // Lock logic: Unlocks the rest of the form only if a handle is provided AND it's not a duplicate
  const hasValidHandle = 
    (igHandle && igHandle.trim().length > 0 && !duplicateStatus.instagram) || 
    (ttHandle && ttHandle.trim().length > 0 && !duplicateStatus.tiktok)

  // Asynchronous duplicate verification logic
  const verifyHandleUniqueness = async (platform: "instagram" | "tiktok", handle: string) => {
    if (!handle || handle.trim() === "") {
      setDuplicateStatus(prev => ({ ...prev, [platform]: false }))
      return
    }

    setValidatingHandles(prev => ({ ...prev, [platform]: true }))
    try {
      const cleanHandle = handle.replace("@", "").trim()
      const res = await fetch(`/api/check-handle?platform=${platform}&value=${cleanHandle}`)
      const data = await res.json()

      if (data.exists) {
        setDuplicateStatus(prev => ({ ...prev, [platform]: true }))
        toast.error(`The ${platform === "instagram" ? "Instagram" : "TikTok"} creator handle is already in the database.`, {
          description: "Duplicate entries are blocked to maintain database cleanliness.",
        })
      } else {
        setDuplicateStatus(prev => ({ ...prev, [platform]: false }))
      }
    } catch (error) {
      console.error("Error validating handle:", error)
    } finally {
      setValidatingHandles(prev => ({ ...prev, [platform]: false }))
    }
  }

  // Get matching secondary options array based on selection
  const availableSecondaryNiches = selectedPrimaryNiche ? NICHE_CATEGORIES[selectedPrimaryNiche] || [] : []

  const onSubmit = async (data: CreatorFormValues) => {
    setIsSubmitting(true)
    try {
      // Clean handle signs before sending to server action
      if (data.instagramHandle) data.instagramHandle = data.instagramHandle.replace("@", "").trim()
      if (data.tiktokHandle) data.tiktokHandle = data.tiktokHandle.replace("@", "").trim()

      const result = await submitCreatorAction(data)
      if (result.success) {
        toast.success("Creator successfully submitted!", {
          description: "The database record has been safely updated.",
        })
        reset()
        setDuplicateStatus({ instagram: false, tiktok: false })
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
              <div className="col-span-full md:col-span-2">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <Input id="name" {...register("name")} placeholder="e.g. John Doe" className="mt-2 h-11 bg-zinc-50/50 focus-visible:ring-zinc-800" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="instagramHandle" className="text-sm font-medium">Instagram Handle</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-3 text-muted-foreground">@</span>
                  <Input 
                    id="instagramHandle" 
                    {...register("instagramHandle")} 
                    placeholder="username"
                    className={`pl-8 h-11 ${duplicateStatus.instagram ? "border-red-500 focus-visible:ring-red-500 bg-red-50" : "bg-zinc-50/50 focus-visible:ring-zinc-800"}`}
                    onBlur={(e) => verifyHandleUniqueness("instagram", e.target.value)}
                  />
                </div>
                {validatingHandles.instagram && <p className="text-xs text-blue-500 mt-1 font-medium animate-pulse">Verifying handle...</p>}
              </div>

              <div>
                <Label htmlFor="tiktokHandle" className="text-sm font-medium">TikTok Handle</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-3 text-muted-foreground">@</span>
                  <Input 
                    id="tiktokHandle" 
                    {...register("tiktokHandle")} 
                    placeholder="username"
                    className={`pl-8 h-11 ${duplicateStatus.tiktok ? "border-red-500 focus-visible:ring-red-500 bg-red-50" : "bg-zinc-50/50 focus-visible:ring-zinc-800"}`}
                    onBlur={(e) => verifyHandleUniqueness("tiktok", e.target.value)}
                  />
                </div>
                {validatingHandles.tiktok && <p className="text-xs text-blue-500 mt-1 font-medium animate-pulse">Verifying handle...</p>}
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
                <p className="text-sm font-medium text-zinc-600">Enter a unique social handle to unlock</p>
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
                      type="number" 
                      disabled={!igHandle || duplicateStatus.instagram} 
                      {...register("instagramFollowers")} 
                      placeholder="e.g. 50000"
                      className="mt-2 h-11 bg-zinc-50/50 focus-visible:ring-zinc-800 disabled:bg-zinc-100"
                    />
                  </div>
                  <div>
                    <Label className={`text-sm font-medium ${!ttHandle || duplicateStatus.tiktok ? "text-zinc-400" : ""}`}>TikTok Followers</Label>
                    <Input 
                      type="number" 
                      disabled={!ttHandle || duplicateStatus.tiktok} 
                      {...register("tiktokFollowers")} 
                      placeholder="e.g. 120000"
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
                          // Note: We no longer wipe secondary niches here!
                        }}
                        placeholder="Select Primary"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Secondary Niches (Max 4)</Label>
                    <div className="[&>button]:min-h-[44px] [&>button]:bg-zinc-50/50 [&>button:focus]:ring-zinc-800">
                      <SearchableMultiSelect 
                        // Filter out the primary niche so they can't pick it twice
                        options={allAvailableNiches.filter(n => n !== selectedPrimaryNiche)}
                        selected={selectedSecondaryNiches || []}
                        onChange={(val) => {
                          // Force the UI to cap at 4 selections
                          if (val.length <= 4) {
                            setValue("secondaryNiches", val, { shouldValidate: true })
                          } else {
                            toast.error("You can only select up to 4 secondary niches.")
                          }
                        }}
                        placeholder="Add up to 4 sub-categories"
                        disabled={false} // Always unlocked now
                      />
                      {errors.secondaryNiches && <p className="text-xs text-red-500 mt-1">{errors.secondaryNiches.message}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-1 bg-zinc-800 rounded-full"></div>
                  <h3 className="text-lg font-semibold">4. Contact</h3>
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input id="email" type="email" {...register("email")} placeholder="contact@creator.com" className="mt-2 h-11 bg-zinc-50/50 focus-visible:ring-zinc-800" />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
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