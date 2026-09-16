import PocketBase from 'pocketbase';
import { writable } from 'svelte/store';

function getPocketBaseUrl(): string {
  // 1. Explicit env override (e.g., VITE_POCKETBASE_URL in .env)
  if (import.meta.env.VITE_POCKETBASE_URL) {
    return import.meta.env.VITE_POCKETBASE_URL;
  }

  // 2. Client-side dynamic LAN IP / Domain auto-detection
  if (typeof window !== 'undefined') {
    if (window.location.port === '8090') {
      return window.location.origin;
    }
    return `${window.location.protocol}//${window.location.hostname}:8090`;
  }

  // 3. Server-side / SSR default fallback
  return 'http://127.0.0.1:8090';
}

export const PB_URL = getPocketBaseUrl();
export const pb = new PocketBase(PB_URL);

// Current logged in user reactive store
export const currentUser = writable(pb.authStore.record);

if (typeof window !== 'undefined') {
  pb.authStore.onChange((_token, record) => {
    currentUser.set(record);
  }, false);
}

export function logout() {
  pb.authStore.clear();
  currentUser.set(null);
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

export function getFileUrl(record: any, filename: string): string {
  if (!record || !filename) return '';
  return pb.files.getURL(record, filename);
}

export function getAvatarUrl(user: any): string {
  if (!user) return '';
  if (user.avatar) {
    return getFileUrl(user, user.avatar);
  }
  const name = encodeURIComponent(user.name || user.username || 'User');
  return `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff&bold=true`;
}
