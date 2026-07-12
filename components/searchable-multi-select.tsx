// src/components/searchable-multi-select.tsx
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
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

interface SearchableMultiSelectProps {
  options: string[]
  selected: string[]
  onChange: (value: string[]) => void
  placeholder: string
  disabled?: boolean
}

export function SearchableMultiSelect({
  options,
  selected = [],
  onChange,
  placeholder,
  disabled = false,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Click outside listener
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

  const handleSelect = (item: string) => {
    const isSelected = selected.includes(item)
    if (isSelected) {
      onChange(selected.filter((t) => t !== item))
    } else {
      onChange([...selected, item])
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        className="w-full justify-between font-normal min-h-10 h-auto flex-wrap gap-1 text-left"
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[90%]">
            {selected.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                {item}
                <X
                  className="h-3 w-3 cursor-pointer opacity-70 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(item)
                  }}
                />
              </span>
            ))}
          </div>
        ) : (
          placeholder
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 self-center" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-50 w-full mt-2 rounded-md border bg-popover shadow-md outline-none animate-in fade-in-0 zoom-in-95">
          <Command>
            <CommandInput 
              placeholder={`Search secondary options...`} 
              autoFocus={false} 
            />
            <CommandList className="max-h-[250px] overflow-y-auto">
              <CommandEmpty>No niches found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected.includes(option) ? "opacity-100" : "opacity-0"
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