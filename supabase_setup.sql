-- 啟用資料表的 RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles 規則
-- 1. 允許所有人讀取 profile
CREATE POLICY "允許所有人讀取 profiles" ON public.profiles
  FOR SELECT USING (true);

-- 2. 允許登入的使用者新增/修改自己的 profile
CREATE POLICY "允許使用者修改自己的 profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Messages 規則
-- 1. 允許所有人讀取 messages
CREATE POLICY "允許所有人讀取 messages" ON public.messages
  FOR SELECT USING (true);

-- 2. 允許登入的使用者發送訊息，且 sender_id 必須是自己的 ID
CREATE POLICY "允許使用者發送訊息" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 建立一個專門用來維持活躍的小資料表 (Keepalive)
CREATE TABLE IF NOT EXISTS public.keepalive (
  id SERIAL PRIMARY KEY,
  pinged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 允許所有人 (包含 anon) 新增資料到 keepalive，用來讓 GitHub Action 觸發
ALTER TABLE public.keepalive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允許匿名新增 keepalive" ON public.keepalive
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "允許匿名讀取 keepalive" ON public.keepalive
  FOR SELECT TO anon USING (true);
