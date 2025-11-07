import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { MessageSquare, ChevronRight } from 'lucide-react-native';

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  listing_id: string | null;
  request_id: string | null;
  last_message_at: string;
  created_at: string;
  messages: Array<{
    content: string;
    created_at: string;
  }>;
  other_participant: {
    full_name: string;
    id: string;
  };
  listing?: {
    title: string;
  };
  request?: {
    title: string;
  };
}

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
          *,
          messages (
            content,
            created_at
          ),
          listing: listings (
            title
          ),
          request: requests (
            title
          )
        `
        )
        .or(
          `participant_1_id.eq.${user?.id},participant_2_id.eq.${user?.id}`
        )
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const enhancedConversations = (data || []).map((conv: any) => {
        const otherParticipantId =
          conv.participant_1_id === user?.id
            ? conv.participant_2_id
            : conv.participant_1_id;

        return {
          ...conv,
          other_participant: {
            id: otherParticipantId,
            full_name: '', // Will be fetched separately
          },
        };
      });

      // Fetch participant names
      const participantIds = enhancedConversations.map(
        (c) => c.other_participant.id
      );
      if (participantIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', participantIds);

        if (profiles) {
          const profileMap = Object.fromEntries(
            profiles.map((p) => [p.id, p.full_name])
          );
          enhancedConversations.forEach((conv) => {
            conv.other_participant.full_name =
              profileMap[conv.other_participant.id] || 'Unknown';
          });
        }
      }

      setConversations(enhancedConversations);
    } catch (error: any) {
      console.error('Error fetching conversations:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const lastMessage = item.messages?.[0];
    const itemTitle = item.listing?.title || item.request?.title || 'Direct Message';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/chat/[id]',
            params: { id: item.id },
          })
        }>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name}>{item.other_participant.full_name}</Text>
            <ChevronRight size={20} color="#ccc" />
          </View>
          <Text style={styles.subject} numberOfLines={1}>
            {itemTitle}
          </Text>
          {lastMessage && (
            <Text style={styles.preview} numberOfLines={2}>
              {lastMessage.content}
            </Text>
          )}
          <Text style={styles.time}>
            {new Date(item.last_message_at).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <Text>Loading...</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centered}>
          <MessageSquare size={48} color="#ccc" />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>
            Start chatting with buyers or sellers
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
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
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  subject: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  preview: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    color: '#bbb',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});
