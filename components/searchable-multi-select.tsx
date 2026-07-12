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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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

  const handleSelect = (item: string) => {
    const isSelected = selected.includes(item)
    if (isSelected) {
      onChange(selected.filter((t) => t !== item))
    } else {
      onChange([...selected, item])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger render={
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal min-h-10 h-auto flex-wrap gap-1 text-left"
          disabled={disabled}
        />
      }>
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
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={`Search secondary options...`} />
          <CommandList>
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
      </PopoverContent>
    </Popover>
  )
}