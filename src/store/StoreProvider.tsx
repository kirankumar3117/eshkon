'use client'

import { useRef } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { makeStore } from './index'
import type { AppStore } from './index'

interface StoreProviderProps {
  children: React.ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  // Use a ref so we only create the store once per component lifetime,
  // even in React StrictMode (which double-invokes effects).
  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null)

  if (storeRef.current === null) {
    storeRef.current = makeStore()
  }

  const { store, persistor } = storeRef.current

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
