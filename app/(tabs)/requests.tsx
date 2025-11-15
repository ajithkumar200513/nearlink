import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { MapPin, Tag, DollarSign, MessageCircle } from 'lucide-react-native';
import { getOrCreateConversation } from '@/lib/messaging';

interface Request {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  request_type: string;
  budget: number;
  budget_unit: string;
  location: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

export default function Requests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(
          `
          *,
          profiles (
            full_name
          )
        `
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleChat = async (request: Request) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to chat');
      return;
    }

    if (user.id === request.user_id) {
      Alert.alert('Info', 'You cannot chat with yourself');
      return;
    }

    try {
      const conversationId = await getOrCreateConversation(
        user.id,
        request.user_id,
        undefined,
        request.id
      );
      router.push({
        pathname: '/chat/[id]',
        params: { id: conversationId },
      });
    } catch (error: any) {
      Alert.alert('Error', 'Could not open chat');
    }
  };

  const renderItem = ({ item }: { item: Request }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {item.request_type === 'buy' ? 'Want to Buy' : 'Want to Rent'}
          </Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.description} numberOfLines={3}>
        {item.description}
      </Text>
      {item.budget && (
        <View style={styles.budgetRow}>
          <DollarSign size={16} color="#34c759" />
          <Text style={styles.budget}>
            Budget: ₹{item.budget}
            {item.budget_unit !== 'fixed' && `/${item.budget_unit.replace('per_', '')}`}
          </Text>
        </View>
      )}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Tag size={14} color="#666" />
          <Text style={styles.metaText}>{item.category}</Text>
        </View>
        <View style={styles.metaItem}>
          <MapPin size={14} color="#666" />
          <Text style={styles.metaText}>{item.location}</Text>
        </View>
      </View>
      <Text style={styles.requester}>Requested by {item.profiles.full_name}</Text>
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => handleChat(item)}>
        <MessageCircle size={16} color="#fff" />
        <Text style={styles.chatButtonText}>Chat</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <Text>Loading...</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No requests yet</Text>
          <Text style={styles.emptySubtext}>Post what you&apos;re looking for!</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
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
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    color: '#f57c00',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  budget: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34c759',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  requester: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
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
