import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppContextProvider } from './contexts/AppContext.jsx'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /* A 401 means "not signed in", not a transient failure worth retrying. */
      retry: (failureCount, error) => {
        if (error?.status === 401) return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>
        <App />
        {/* Devtools add weight to the production bundle; keep them out of it. */}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </AppContextProvider>
    </QueryClientProvider>
  </StrictMode>,
)
