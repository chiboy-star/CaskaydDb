// app/layout.tsx
import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Caskayd Registry",
  description: "Internal Creator Data Platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <main className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-zinc-50 dark:bg-zinc-950">
          {children}
        </main>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}