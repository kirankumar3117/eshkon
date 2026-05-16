/**
 * All Contentful SDK usage is isolated here.
 * No other file may import from 'contentful' directly.
 *
 * Required Contentful content model:
 *   Content type "page":
 *     - pageId  (Short text)
 *     - slug    (Short text)
 *     - title   (Short text)
 *     - sections (References, many → content type "section")
 *
 *   Content type "section":
 *     - id   (Short text)
 *     - type (Short text) — one of: hero | featureGrid | testimonial | cta
 *     - props (JSON object)
 *
 *   Content type "pageDraft":
 *     - slug  (Short text, required)
 *     - data  (JSON object, required) — full serialised Page
 *
 *   Content type "pageRelease":
 *     - slug        (Short text, required)
 *     - version     (Short text, required) — semver e.g. "1.0.0"
 *     - data        (JSON object, required) — full serialised Page
 *     - publishedAt (Short text, required) — ISO-8601 timestamp
 */
import { createClient } from 'contentful'

export class ContentfulError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'ContentfulError'
  }
}

function buildDeliveryClient() {
  const space = process.env.CONTENTFUL_SPACE_ID
  const accessToken = process.env.CONTENTFUL_DELIVERY_TOKEN
  const environment = process.env.CONTENTFUL_ENVIRONMENT ?? 'master'

  if (!space || !accessToken) {
    throw new ContentfulError(
      'Missing required env vars: CONTENTFUL_SPACE_ID and CONTENTFUL_DELIVERY_TOKEN'
    )
  }

  return createClient({ space, accessToken, environment })
}

function buildPreviewClient() {
  const space = process.env.CONTENTFUL_SPACE_ID
  const accessToken = process.env.CONTENTFUL_PREVIEW_TOKEN
  const environment = process.env.CONTENTFUL_ENVIRONMENT ?? 'master'

  if (!space || !accessToken) {
    throw new ContentfulError(
      'Missing required env vars: CONTENTFUL_SPACE_ID and CONTENTFUL_PREVIEW_TOKEN'
    )
  }

  return createClient({
    space,
    accessToken,
    environment,
    host: 'preview.contentful.com',
  })
}

// Lazy singletons — created on first use to avoid errors at module load time
// when env vars may not yet be available (e.g. test environment).
let _deliveryClient: ReturnType<typeof buildDeliveryClient> | null = null
let _previewClient: ReturnType<typeof buildPreviewClient> | null = null

export function getClient(preview: boolean) {
  if (preview) {
    if (!_previewClient) _previewClient = buildPreviewClient()
    return _previewClient
  }
  if (!_deliveryClient) _deliveryClient = buildDeliveryClient()
  return _deliveryClient
}

export type ContentfulClient = ReturnType<typeof getClient>

