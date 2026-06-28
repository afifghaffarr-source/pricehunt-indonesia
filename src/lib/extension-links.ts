/**
 * Chrome Web Store links and metadata. Single source of truth.
 *
 * After launch, set NEXT_PUBLIC_CWS_PUBLISHED=true in production env to
 * make /extension render the "Live on Chrome Web Store" banner instead of
 * the manual download flow.
 */

const isPublished = process.env.NEXT_PUBLIC_CWS_PUBLISHED === "true";

/** The actual CWS extension ID — fill in after first publish. */
const EXTENSION_ID = process.env.NEXT_PUBLIC_CWS_EXTENSION_ID ?? "";

/** Public CWS listing URL. Empty string when not yet published. */
export const CHROME_WEB_STORE_URL: string | null =
  isPublished && EXTENSION_ID
    ? `https://chromewebstore.google.com/detail/bijakbeli/${EXTENSION_ID}`
    : null;

export const isLiveOnChromeWebStore = CHROME_WEB_STORE_URL !== null;
