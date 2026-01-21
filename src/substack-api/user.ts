import type { UserProfile, Subscription } from "./types.ts";
import { HEADERS, API_URLS, DEFAULT_TIMEOUT } from "./constants.ts";

/**
 * Resolve a potentially renamed Substack handle by following redirects.
 * @param oldHandle - The original handle that may have been renamed
 * @returns The new handle if renamed, null if no redirect or on error
 */
export async function resolveHandleRedirect(
  oldHandle: string
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(`${API_URLS.USER_PAGE}${oldHandle}`, {
      headers: HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });

    if (response.ok) {
      // Parse the final URL to extract the handle
      const finalUrl = new URL(response.url);
      const pathParts = finalUrl.pathname.replace(/^\/|\/$/g, "").split("/");

      // Check if this is a profile URL (starts with @)
      if (pathParts.length > 0 && pathParts[0].startsWith("@")) {
        const newHandle = pathParts[0].slice(1); // Remove the @ prefix

        // Only return if it's actually different
        if (newHandle && newHandle !== oldHandle) {
          console.log(`Handle redirect detected: ${oldHandle} -> ${newHandle}`);
          return newHandle;
        }
      }
    }

    return null;
  } catch (error) {
    console.debug(`Error resolving handle redirect for ${oldHandle}: ${error}`);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * User class for interacting with Substack user profiles.
 * Handles renamed accounts by following redirects when a handle has changed.
 */
export class User {
  public username: string;
  public readonly originalUsername: string;
  private readonly followRedirects: boolean;
  private endpoint: string;
  private userData: UserProfile | null = null;
  private redirectAttempted: boolean = false;

  /**
   * Initialize a User object.
   * @param username - The Substack username
   * @param followRedirects - Whether to follow redirects when a handle has been renamed
   */
  constructor(username: string, followRedirects: boolean = true) {
    this.username = username;
    this.originalUsername = username;
    this.followRedirects = followRedirects;
    this.endpoint = `${API_URLS.USER_PROFILE}/${username}/public_profile`;
  }

  toString(): string {
    return `User: ${this.username}`;
  }

  /**
   * Update the user's handle and endpoint.
   */
  private updateHandle(newHandle: string): void {
    console.log(`Updating handle from ${this.username} to ${newHandle}`);
    this.username = newHandle;
    this.endpoint = `${API_URLS.USER_PROFILE}/${newHandle}/public_profile`;
  }

  /**
   * Fetch the raw user data from the API and cache it.
   * Handles renamed accounts by following redirects when followRedirects is true.
   * @param forceRefresh - Whether to force a refresh of the data
   * @returns Full user profile data
   */
  private async fetchUserData(forceRefresh = false): Promise<UserProfile> {
    if (this.userData !== null && !forceRefresh) {
      return this.userData;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(this.endpoint, {
        headers: HEADERS,
        signal: controller.signal,
      });

      if (response.ok) {
        this.userData = (await response.json()) as UserProfile;
        return this.userData;
      }

      // Handle 404 errors if we should follow redirects
      if (
        response.status === 404 &&
        this.followRedirects &&
        !this.redirectAttempted
      ) {
        // Mark that we've attempted a redirect to prevent loops
        this.redirectAttempted = true;

        // Try to resolve the redirect
        const newHandle = await resolveHandleRedirect(this.username);

        if (newHandle) {
          // Update our state with the new handle
          this.updateHandle(newHandle);

          // Try the request again with the new handle
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(
            () => retryController.abort(),
            DEFAULT_TIMEOUT
          );

          try {
            const retryResponse = await fetch(this.endpoint, {
              headers: HEADERS,
              signal: retryController.signal,
            });

            if (retryResponse.ok) {
              this.userData = (await retryResponse.json()) as UserProfile;
              return this.userData;
            }

            throw new Error(
              `Failed to fetch user data even after redirect to ${newHandle}: ${retryResponse.status}`
            );
          } finally {
            clearTimeout(retryTimeoutId);
          }
        } else {
          // No redirect found, this is a real 404
          console.debug(
            `No redirect found for ${this.username}, user may be deleted`
          );
        }
      }

      throw new Error(
        `Failed to fetch user data: ${response.status} ${response.statusText}`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get the complete raw user data.
   * @param forceRefresh - Whether to force a refresh of the data
   * @returns Full user profile data
   */
  async getRawData(forceRefresh = false): Promise<UserProfile> {
    return this.fetchUserData(forceRefresh);
  }

  /**
   * Get the user's unique ID number.
   */
  async getId(): Promise<number> {
    const data = await this.fetchUserData();
    return data.id;
  }

  /**
   * Get the user's name.
   */
  async getName(): Promise<string> {
    const data = await this.fetchUserData();
    return data.name;
  }

  /**
   * Get the date when the user's profile was set up.
   */
  async getProfileSetUpAt(): Promise<string | undefined> {
    const data = await this.fetchUserData();
    return data.profile_set_up_at;
  }

  /**
   * Check if this user's handle was redirected from the original.
   */
  get wasRedirected(): boolean {
    return this.username !== this.originalUsername;
  }

  /**
   * Get newsletters the user has subscribed to.
   * @returns List of subscription info with domain details
   */
  async getSubscriptions(): Promise<Subscription[]> {
    const data = await this.fetchUserData();
    const subscriptions: Subscription[] = [];

    for (const sub of data.subscriptions || []) {
      const pub = sub.publication;
      const domain =
        pub.custom_domain || `${pub.subdomain}.substack.com`;

      subscriptions.push({
        publication_id: pub.id,
        publication_name: pub.name,
        domain,
        membership_state: sub.membership_state,
      });
    }

    return subscriptions;
  }
}
