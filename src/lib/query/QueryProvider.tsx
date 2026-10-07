import type { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { queryClient } from "@/lib/query/queryClient"
import { QuerySessionSync } from "@/lib/query/QuerySessionSync"

type QueryProviderProps = {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <QuerySessionSync />
      {children}
    </QueryClientProvider>
  )
}
