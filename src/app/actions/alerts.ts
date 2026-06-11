'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createPriceAlert(
  productId: string,
  targetPrice: number
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Anda harus login terlebih dahulu' };
    }

    // Check if alert already exists for this product and user
    const { data: existing } = await supabase
      .from('price_alerts')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .eq('is_active', true)
      .single();

    if (existing) {
      return { success: false, error: 'Anda sudah memiliki alert aktif untuk produk ini' };
    }

    // Create new alert
    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        user_id: user.id,
        product_id: productId,
        target_price: targetPrice,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating price alert:', error);
      return { success: false, error: 'Gagal membuat price alert' };
    }

    revalidatePath('/product/[slug]', 'page');
    return { success: true, data };
  } catch (error) {
    console.error('Error in createPriceAlert:', error);
    return { success: false, error: 'Terjadi kesalahan server' };
  }
}

export async function updatePriceAlert(
  alertId: string,
  targetPrice: number
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Anda harus login terlebih dahulu' };
    }

    // Update alert (RLS ensures user can only update their own alerts)
    const { data, error } = await supabase
      .from('price_alerts')
      .update({
        target_price: targetPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating price alert:', error);
      return { success: false, error: 'Gagal update price alert' };
    }

    revalidatePath('/product/[slug]', 'page');
    return { success: true, data };
  } catch (error) {
    console.error('Error in updatePriceAlert:', error);
    return { success: false, error: 'Terjadi kesalahan server' };
  }
}

export async function togglePriceAlert(alertId: string, isActive: boolean) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Anda harus login terlebih dahulu' };
    }

    // Toggle alert status
    const { data, error } = await supabase
      .from('price_alerts')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling price alert:', error);
      return { success: false, error: 'Gagal mengubah status alert' };
    }

    revalidatePath('/product/[slug]', 'page');
    return { success: true, data };
  } catch (error) {
    console.error('Error in togglePriceAlert:', error);
    return { success: false, error: 'Terjadi kesalahan server' };
  }
}

export async function deletePriceAlert(alertId: string) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Anda harus login terlebih dahulu' };
    }

    // Delete alert (RLS ensures user can only delete their own alerts)
    const { error } = await supabase
      .from('price_alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting price alert:', error);
      return { success: false, error: 'Gagal menghapus price alert' };
    }

    revalidatePath('/product/[slug]', 'page');
    return { success: true };
  } catch (error) {
    console.error('Error in deletePriceAlert:', error);
    return { success: false, error: 'Terjadi kesalahan server' };
  }
}
