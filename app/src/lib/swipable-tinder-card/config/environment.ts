export const ENVIRONMENT = {
  IS_BROWSER: typeof window !== 'undefined',
  IS_TOUCH_DEVICE: typeof window !== 'undefined' && 'ontouchstart' in window,
}