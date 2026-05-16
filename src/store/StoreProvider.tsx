'use client'

import { useRef, useState, useEffect } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { makeStore } from './index'
import type { AppStore } from './index'

interface StoreProviderProps {
  children: React.ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null)
  const [mounted, setMounted] = useState(false)

  if (storeRef.current === null) {
    storeRef.current = makeStore()
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  const { store, persistor } = storeRef.current

  // During SSR and initial hydration, render children without PersistGate
  // to ensure the client HTML matches the server HTML.
  if (!mounted) {
    return <Provider store={store as AppStore}>{children}</Provider>
  }

  return (
    <Provider store={store as AppStore}>
      {/*
        PersistGate delays rendering until the persisted state has been
        rehydrated from localStorage — prevents a flash of empty state.
      */}
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  )
}
