import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Send } from 'lucide-react-native';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  listing?: {
    title: string;
  };
  request?: {
    title: string;
  };
  other_participant?: {
    full_name: string;
  };
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id) {
      fetchConversation();
      fetchMessages();
    }
  }, [id]);

  const fetchConversation = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
          *,
          listing: listings (
            title
          ),
          request: requests (
            title
          )
        `
        )
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const otherParticipantId =
          data.participant_1_id === user?.id
            ? data.participant_2_id
            : data.participant_1_id;

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', otherParticipantId)
          .maybeSingle();

        setConversation({
          ...data,
          other_participant: {
            full_name: profile?.full_name || 'User',
          },
        });
      }
    } catch (error: any) {
      console.error('Error fetching conversation:', error.message);
    }
  }, [id, user]);

  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchConversation();
      fetchMessages();
    }
  }, [id, fetchConversation, fetchMessages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !id) return;

    setSending(true);
    const text = messageText;
    setMessageText('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: id,
          sender_id: user?.id,
          content: text,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', id);

      setMessages((prev) => [data, ...prev]);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error: any) {
      console.error('Error sending message:', error.message);
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === user?.id;

    return (
      <View
        style={[styles.messageRow, isOwn ? styles.messageRowRight : styles.messageRowLeft]}>
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
          ]}>
          <Text
            style={[
              styles.messageText,
              isOwn ? styles.messageTextOwn : styles.messageTextOther,
            ]}>
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
            ]}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerName}>
            {conversation?.other_participant?.full_name || 'Chat'}
          </Text>
          {(conversation?.listing || conversation?.request) && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {conversation.listing?.title || conversation.request?.title}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <Text>Loading...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>Start the conversation!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messagesList}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          placeholderTextColor="#999"
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sending}>
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  messageBubbleOwn: {
    backgroundColor: '#007AFF',
  },
  messageBubbleOther: {
    backgroundColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#fff',
  },
  messageTextOther: {
    color: '#1a1a1a',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  messageTimeOwn: {
    color: '#d0d0d0',
  },
  messageTimeOther: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
