/**
 * Checks if the given url is a valid youtube video url.
 * @param url The url to check.
 * @returns true if the url is a valid youtube video url.
 */
const isYtVideoTab = (url: string | null | undefined): boolean => url?.match(/\D+\.youtube.com\/watch/) != null;


export { isYtVideoTab };