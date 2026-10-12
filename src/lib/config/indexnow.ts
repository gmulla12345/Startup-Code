/**
 * IndexNow key. IndexNow (indexnow.org) lets a site tell participating search
 * engines (Bing, Yandex, Naver, Seznam, ...) the moment a URL is published or
 * changed, instead of waiting for a recrawl. Ownership is proven by hosting a
 * text file at the site root whose name and contents are this key:
 *
 *   public/<INDEXNOW_KEY>.txt  ->  https://discoverzolo.com/<INDEXNOW_KEY>.txt
 *
 * The key is meant to be public (it is served openly), so it is fine to
 * commit. src/__tests__/seo-metadata.test.ts checks the file exists and
 * matches. Submit URLs with `npm run indexnow` AFTER a production deploy
 * (the engines fetch the key file to verify ownership, so it must be live).
 * Google does not participate in IndexNow; it relies on the sitemap.
 */
export const INDEXNOW_KEY = "755a9cea74f07a3905ca65989f759dcb";
