import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type PublishStatus = 'idle' | 'publishing' | 'success' | 'error'

interface PublishState {
  status: PublishStatus
  lastVersion: string | null
  error: string | null
  changelog: string | null
}

const initialState: PublishState = {
  status: 'idle',
  lastVersion: null,
  error: null,
  changelog: null,
}

const publishSlice = createSlice({
  name: 'publish',
  initialState,
  reducers: {
    startPublish: (state) => {
      state.status = 'publishing'
      state.error = null
      state.changelog = null
    },

    publishSuccess: (
      state,
      action: PayloadAction<{ version: string; changelog: string }>
    ) => {
      state.status = 'success'
      state.lastVersion = action.payload.version
      state.changelog = action.payload.changelog
      state.error = null
    },

    publishFailure: (state, action: PayloadAction<string>) => {
      state.status = 'error'
      state.error = action.payload
    },
  },
})

export const { startPublish, publishSuccess, publishFailure } =
  publishSlice.actions

export default publishSlice.reducer
