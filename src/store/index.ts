import { configureStore, combineReducers } from '@reduxjs/toolkit'
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import type { TypedUseSelectorHook } from 'react-redux'
import { useDispatch, useSelector } from 'react-redux'
import draftPageReducer from './slices/draftPageSlice'
import uiReducer from './slices/uiSlice'
import publishReducer from './slices/publishSlice'
import type { Storage } from 'redux-persist'

// SSR-safe storage: localStorage is unavailable on the server.
// Next.js evaluates 'use client' components on the server for SSR,
// so we gate on typeof window.
function makeStorage(): Storage {
  if (typeof window === 'undefined') {
    return {
      getItem: (_key: string) => Promise.resolve(null),
      setItem: (_key: string, _value: string) => Promise.resolve(),
      removeItem: (_key: string) => Promise.resolve(),
    }
  }
  return {
    getItem: (key: string) =>
      Promise.resolve(window.localStorage.getItem(key)),
    setItem: (key: string, value: string) => {
      window.localStorage.setItem(key, value)
      return Promise.resolve()
    },
    removeItem: (key: string) => {
      window.localStorage.removeItem(key)
      return Promise.resolve()
    },
  }
}

const persistConfig = {
  key: 'page-studio-draft',
  storage: makeStorage(),
  whitelist: ['draftPage'],
}

const rootReducer = combineReducers({
  draftPage: draftPageReducer,
  ui: uiReducer,
  publish: publishReducer,
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export function makeStore() {
  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // redux-persist dispatches these non-serializable action types internally
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
  })

  const persistor = persistStore(store)

  return { store, persistor }
}

// Singleton for use outside React (e.g. API routes, server actions)
let _storeInstance: ReturnType<typeof makeStore> | null = null

export function getStore() {
  if (!_storeInstance) _storeInstance = makeStore()
  return _storeInstance
}

export type AppStore = ReturnType<typeof makeStore>['store']
export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = AppStore['dispatch']

// Typed hooks — use these everywhere instead of plain useDispatch/useSelector
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
