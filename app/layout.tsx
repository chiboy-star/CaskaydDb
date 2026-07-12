// app/layout.tsx
import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

// Initialize Inter for general UI text
const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans" 
})

// Initialize a premium Serif font for the elegant headings
const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  variable: "--font-serif" 
})

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
      {/* Apply the CSS variables to the body */}
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <main className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-zinc-50 dark:bg-zinc-950">
          {children}
        </main>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}