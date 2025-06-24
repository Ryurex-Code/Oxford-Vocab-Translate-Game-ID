-- Schema untuk tabel profiles (menggunakan UUID dan foreign key ke auth.users)
-- Pastikan untuk menjalankan ini setelah Supabase Auth sudah aktif

-- Drop existing objects if they exist (for clean re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS public.profiles;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL,
    username TEXT UNIQUE,
    total_score INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_username_key UNIQUE (username),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Index untuk pencarian yang lebih cepat
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_total_score ON public.profiles(total_score DESC);
CREATE INDEX idx_profiles_updated_at ON public.profiles(updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- Policy untuk read: users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy untuk insert: users can only create their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy untuk update: users can only update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Optional: Policy to allow service role to access all profiles (for admin operations)
-- CREATE POLICY "Service role can access all profiles" ON public.profiles
--     FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger untuk auto-update updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, total_score, updated_at)
    VALUES (new.id, NULL, 0, NOW());
    RETURN new;
END;
$$ language 'plpgsql' security definer;

-- Trigger to automatically create profile when new user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Sample data (optional - uncomment if needed for testing)
-- Note: These would need to be actual UUIDs that exist in auth.users table
-- You can create test users through Supabase Auth dashboard first, then add their profiles
-- 
-- INSERT INTO public.profiles (id, username, total_score) VALUES 
-- ('12345678-1234-1234-1234-123456789012', 'demo_user', 10),
-- ('87654321-4321-4321-4321-210987654321', 'test_user', 25);

-- Verification queries (run these to check if everything is set up correctly)
-- SELECT * FROM public.profiles;
-- SELECT * FROM auth.users;
-- \d public.profiles
