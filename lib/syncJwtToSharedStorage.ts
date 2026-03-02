import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

export async function syncJwtToSharedStorage(): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log('[syncJwt] Session user id:', session?.user?.id);

    if (!session?.access_token) {
      console.log('[syncJwt] No access token, skipping');
      return;
    }

    await SecureStore.setItemAsync('supabase_jwt', session.access_token, {
      accessGroup: 'group.com.onedaytravel.app.shared',
    });
    console.log('[syncJwt] JWT saved');

    // Also store user_id for the share extension
    if (session.user?.id) {
      await SecureStore.setItemAsync('supabase_user_id', session.user.id, {
        accessGroup: 'group.com.onedaytravel.app.shared',
      });
      console.log('[syncJwt] User ID saved:', session.user.id);
    }
  } catch (e: any) {
    console.log('[syncJwt] Error:', e?.message || e);
  }
}
