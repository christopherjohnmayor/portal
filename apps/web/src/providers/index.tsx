"use client"

import { ThemeProvider } from "@/providers/theme-provider"
import { TerminalProvider } from "@/contexts/terminal-context"
import { useRouter } from "next/router"
import { RouterProvider } from "react-aria-components"

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>["push"]>[1]>
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <RouterProvider navigate={router.push}>
      <TerminalProvider>
        <ThemeProvider attribute="class">{children}</ThemeProvider>
      </TerminalProvider>
    </RouterProvider>
  )
}
