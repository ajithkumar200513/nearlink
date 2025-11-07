import { supabase } from './supabase';

export async function getOrCreateConversation(
  userId: string,
  otherUserId: string,
  listingId?: string,
  requestId?: string
) {
  try {
    const whereQuery = {
      participant_1_id: userId,
      participant_2_id: otherUserId,
    };

    let query = supabase
      .from('conversations')
      .select('id')
      .eq('participant_1_id', userId)
      .eq('participant_2_id', otherUserId);

    if (listingId) {
      query = query.eq('listing_id', listingId);
    }
    if (requestId) {
      query = query.eq('request_id', requestId);
    }

    let { data, error } = await query.maybeSingle();

    if (error) throw error;

    if (data) {
      return data.id;
    }

    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        participant_1_id: userId,
        participant_2_id: otherUserId,
        listing_id: listingId || null,
        request_id: requestId || null,
      })
      .select('id')
      .single();

    if (createError) throw createError;

    return newConv.id;
  } catch (error: any) {
    console.error('Error getting/creating conversation:', error.message);
    throw error;
  }
}
