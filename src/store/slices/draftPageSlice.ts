import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Page, Section, HeroProps, FeatureGridProps, TestimonialProps, CtaProps } from '@/types/page'

interface DraftPageState {
  page: Page | null
  isDirty: boolean
  lastSaved: string | null
}

const initialState: DraftPageState = {
  page: null,
  isDirty: false,
  lastSaved: null,
}

const draftPageSlice = createSlice({
  name: 'draftPage',
  initialState,
  reducers: {
    loadPage: (state, action: PayloadAction<Page>) => {
      state.page = action.payload
      state.isDirty = false
      state.lastSaved = new Date().toISOString()
    },

    addSection: (state, action: PayloadAction<Section>) => {
      if (!state.page) return
      state.page.sections.push(action.payload)
      state.isDirty = true
    },

    removeSection: (state, action: PayloadAction<string>) => {
      if (!state.page) return
      state.page.sections = state.page.sections.filter(
        s => s.id !== action.payload
      )
      state.isDirty = true
    },

    reorderSections: (
      state,
      action: PayloadAction<{ fromIndex: number; toIndex: number }>
    ) => {
      if (!state.page) return
      const { fromIndex, toIndex } = action.payload
      const sections = state.page.sections
      if (
        fromIndex < 0 ||
        fromIndex >= sections.length ||
        toIndex < 0 ||
        toIndex >= sections.length
      ) {
        return
      }
      const moved = sections[fromIndex]
      sections.splice(fromIndex, 1)
      sections.splice(toIndex, 0, moved)
      state.isDirty = true
    },

    updateSectionProps: (
      state,
      action: PayloadAction<{ sectionId: string; props: Record<string, unknown> }>
    ) => {
      if (!state.page) return
      const { sectionId, props } = action.payload
      const index = state.page.sections.findIndex(s => s.id === sectionId)
      if (index === -1) return
      const section = state.page.sections[index]
      // Switch narrows the union so each branch reconstructs the correct Section member.
      // Double-cast through unknown is required because Record<string, unknown> does not
      // structurally overlap the specific props types; the editor validates shapes before dispatch.
      switch (section.type) {
        case 'hero':
          state.page.sections[index] = { ...section, props: props as unknown as HeroProps }
          break
        case 'featureGrid':
          state.page.sections[index] = { ...section, props: props as unknown as FeatureGridProps }
          break
        case 'testimonial':
          state.page.sections[index] = { ...section, props: props as unknown as TestimonialProps }
          break
        case 'cta':
          state.page.sections[index] = { ...section, props: props as unknown as CtaProps }
          break
      }
      state.isDirty = true
    },

    resetDraft: (state) => {
      state.page = null
      state.isDirty = false
      state.lastSaved = null
    },
  },
})

export const {
  loadPage,
  addSection,
  removeSection,
  reorderSections,
  updateSectionProps,
  resetDraft,
} = draftPageSlice.actions

export default draftPageSlice.reducer
