import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type PreviewMode = 'desktop' | 'mobile'

interface UiState {
  selectedSectionId: string | null
  panelOpen: boolean
  previewMode: PreviewMode
}

const initialState: UiState = {
  selectedSectionId: null,
  panelOpen: true,
  previewMode: 'desktop',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    selectSection: (state, action: PayloadAction<string | null>) => {
      state.selectedSectionId = action.payload
      if (action.payload !== null) {
        state.panelOpen = true
      }
    },

    togglePanel: (state) => {
      state.panelOpen = !state.panelOpen
    },

    setPreviewMode: (state, action: PayloadAction<PreviewMode>) => {
      state.previewMode = action.payload
    },
  },
})

export const { selectSection, togglePanel, setPreviewMode } = uiSlice.actions

export default uiSlice.reducer
