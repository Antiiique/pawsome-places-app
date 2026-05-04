-- Conversations
DROP POLICY IF EXISTS "conv_select_own" ON conversations;
CREATE POLICY "conv_select_own" ON conversations FOR SELECT
  USING (user1_id = auth.uid() OR user2_id = auth.uid());
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Messages
DROP POLICY IF EXISTS "msg_select_own" ON messages;
CREATE POLICY "msg_select_own" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
  )
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;