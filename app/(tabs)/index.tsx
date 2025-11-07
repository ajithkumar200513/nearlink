import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { MapPin, Tag, MessageCircle } from 'lucide-react-native';
import { getOrCreateConversation } from '@/lib/messaging';

interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  listing_type: string;
  price: number;
  price_unit: string;
  images: string[];
  location: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

export default function Browse() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(
          `
          *,
          profiles (
            full_name
          )
        `
        )
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setListings(data || []);
    } catch (error: any) {
      console.error('Error fetching listings:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const handleChat = async (listing: Listing) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to chat');
      return;
    }

    if (user.id === listing.user_id) {
      Alert.alert('Info', 'You cannot chat with yourself');
      return;
    }

    try {
      const conversationId = await getOrCreateConversation(
        user.id,
        listing.user_id,
        listing.id
      );
      router.push({
        pathname: '/chat/[id]',
        params: { id: conversationId },
      });
    } catch (error: any) {
      Alert.alert('Error', 'Could not open chat');
    }
  };

  const renderItem = ({ item }: { item: Listing }) => (
    <View style={styles.card}>
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.price}>
          ₹{item.price}
          {item.price_unit !== 'fixed' && `/${item.price_unit.replace('per_', '')}`}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Tag size={14} color="#666" />
            <Text style={styles.metaText}>{item.category}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.listing_type === 'sell' ? 'For Sale' : 'For Rent'}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <MapPin size={14} color="#666" />
          <Text style={styles.metaText}>{item.location}</Text>
        </View>
        <Text style={styles.seller}>By {item.profiles.full_name}</Text>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => handleChat(item)}>
          <MessageCircle size={16} color="#fff" />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <Text>Loading...</Text>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No listings yet</Text>
          <Text style={styles.emptySubtext}>Be the first to post something!</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
  },
  cardContent: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  badge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  seller: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    marginBottom: 12,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
  },
  chatButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});
