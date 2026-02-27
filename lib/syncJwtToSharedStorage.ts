import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

export async function syncJwtToSharedStorage(): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await SecureStore.setItemAsync('supabase_jwt', session.access_token, {
      accessGroup: 'group.com.anonymous.BomboMobile.shared',
    });

    // Also store user_id for the share extension
    if (session.user?.id) {
      await SecureStore.setItemAsync('supabase_user_id', session.user.id, {
        accessGroup: 'group.com.anonymous.BomboMobile.shared',
      });
    }
  } catch (e) {
    console.error('syncJwtToSharedStorage error:', e);
  }
}
