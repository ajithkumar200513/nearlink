/*
  # Add Messaging System for NearLink

  ## Overview
  This migration adds a messaging system allowing users to chat about listings and requests.
  
  ## Tables Created
  
  ### 1. conversations
  Groups messages between two users related to a specific listing or request
  - `id` (uuid, PK) - Conversation identifier
  - `participant_1_id` (uuid, FK to profiles) - First participant
  - `participant_2_id` (uuid, FK to profiles) - Second participant
  - `listing_id` (uuid, FK to listings, nullable) - Associated listing if any
  - `request_id` (uuid, FK to requests, nullable) - Associated request if any
  - `last_message_at` (timestamptz) - Timestamp of last message
  - `created_at` (timestamptz) - Conversation creation time
  
  ### 2. messages
  Individual messages within conversations
  - `id` (uuid, PK) - Message identifier
  - `conversation_id` (uuid, FK to conversations) - Parent conversation
  - `sender_id` (uuid, FK to profiles) - Message sender
  - `content` (text) - Message text
  - `created_at` (timestamptz) - Message timestamp
  - `read_at` (timestamptz, nullable) - When recipient read it
  
  ## Security
  
  ### conversations
  - Users can view conversations they're part of
  - Users can create conversations with sellers/buyers
  
  ### messages
  - Only conversation participants can view messages
  - Only sender can send messages
  - Only recipient can mark as read
  
  ## Indexes
  - Conversations indexed by participants and timestamps for efficient queries
  - Messages indexed by conversation and sender for fast lookups
*/

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update read_at timestamp"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.participant_2_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.participant_2_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_listing ON conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_request ON conversations(request_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at);
