-- Supabase Schema for Notflix

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  "isPremium" BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  "profileImage" TEXT DEFAULT '',
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  "reviewComment" TEXT DEFAULT '',
  "reviewedBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
  "reviewedAt" TIMESTAMPTZ,
  subject TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "cloudinaryId" TEXT NOT NULL,
  "isPremium" BOOLEAN DEFAULT false,
  "uploadedBy" UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  views INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 0,
  "reviewCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  "user" UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(note, "user")
);

-- 4. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  actor UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT DEFAULT '/',
  "isRead" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  sender UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  "senderName" TEXT NOT NULL,
  room TEXT NOT NULL CHECK (room IN ('general', 'doubt', 'community', 'reviews')),
  "isAdmin" BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. RPC INCREMENT FUNCTIONS
CREATE OR REPLACE FUNCTION increment_views(note_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.notes
  SET views = views + 1
  WHERE id = note_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_downloads(note_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.notes
  SET downloads = downloads + 1
  WHERE id = note_id;
END;
$$ LANGUAGE plpgsql;
