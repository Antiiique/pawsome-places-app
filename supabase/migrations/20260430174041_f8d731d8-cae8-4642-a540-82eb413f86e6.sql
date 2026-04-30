CREATE TABLE public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user2_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body text NOT NULL,
  read_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_select" ON public.conversations FOR SELECT
  USING (auth.uid() IN (user1_id, user2_id));
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IN (user1_id, user2_id));

CREATE POLICY "msg_select" ON public.messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM public.conversations WHERE auth.uid() IN (user1_id, user2_id)
  ));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM public.conversations WHERE auth.uid() IN (user1_id, user2_id)
    )
  );
CREATE POLICY "msg_update" ON public.messages FOR UPDATE
  USING (conversation_id IN (
    SELECT id FROM public.conversations WHERE auth.uid() IN (user1_id, user2_id)
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;