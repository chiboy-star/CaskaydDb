// src/components/searchable-select.tsx
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface SearchableSelectProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  emptyText?: string
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyText = "No results found.",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Click outside listener to safely close the custom dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [])

  const customFilter = (value: string, search: string) => {
    const normalizedValue = value.toLowerCase()
    const normalizedSearch = search.toLowerCase()
    if (normalizedValue.includes(normalizedSearch)) return 1

    let searchIndex = 0
    for (let i = 0; i < normalizedValue.length; i++) {
      if (normalizedValue[i] === normalizedSearch[searchIndex]) {
        searchIndex++
      }
      if (searchIndex === normalizedSearch.length) return 1
    }
    return 0
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between font-normal"
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        {value ? value : placeholder}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-50 w-full mt-2 rounded-md border bg-popover shadow-md outline-none animate-in fade-in-0 zoom-in-95">
          <Command filter={customFilter}>
            {/* onFocus block ensures mobile keyboards don't force sudden scroll jumps */}
            <CommandInput 
              placeholder={`Search ${placeholder.toLowerCase()}...`} 
              autoFocus={false} 
            />
            <CommandList className="max-h-[250px] overflow-y-auto">
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? "" : currentValue)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}