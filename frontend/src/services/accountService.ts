// Ties the extension to the signed-in account, and cleans up on sign-out.
import type { Session } from '@supabase/supabase-js';
import * as api from '../api/client';
import { signOut } from '../api/auth';
import { clearExtensionLink, getExtensionLink, setExtensionLink } from '../api/extension';

/** Give the extension its own device token for this account, unless it already has one. */
export async function linkExtension(session: Session): Promise<'linked' | 'already' | 'no-extension'> {
  const link = await getExtensionLink();
  if (!link) return 'no-extension';
  if (link.linked && link.userId === session.user.id) return 'already';
  const created = await api.createDeviceToken('Chrome extension');
  await setExtensionLink({ token: created.token, tokenId: created.id, userId: session.user.id, email: session.user.email ?? null });
  return 'linked';
}

/** Sign out here and in the extension, and revoke the extension's token. */
export async function signOutEverywhere(): Promise<void> {
  try {
    const link = await getExtensionLink();
    if (link?.linked && link.tokenId) await api.revokeDeviceToken(link.tokenId).catch(() => undefined);
    await clearExtensionLink();
  } finally {
    await signOut();
  }
}
