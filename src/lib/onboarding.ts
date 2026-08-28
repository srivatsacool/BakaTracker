/** User-scoped onboarding persistence. Keyed by authenticated user ID
 *  to prevent cross-user state sharing. */
const STORAGE_KEY_PREFIX = 'bt_onboarding:';

function onboardingKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

/** Check if onboarding is already completed for this user. */
export function isOnboardingComplete(userId: string): boolean {
  try {
    return localStorage.getItem(onboardingKey(userId)) === 'done';
  } catch {
    return false;
  }
}

/** Mark onboarding as completed for this user. */
export function markOnboardingComplete(userId: string): void {
  try {
    localStorage.setItem(onboardingKey(userId), 'done');
  } catch {
    // localStorage unavailable — fail open
  }
}
