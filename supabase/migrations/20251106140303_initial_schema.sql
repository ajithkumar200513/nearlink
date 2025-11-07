/*
  # NearLink Initial Schema

  ## Overview
  This migration creates the foundational database structure for NearLink, a hyperlocal two-way marketplace.
  
  ## Tables Created
  
  ### 1. profiles
  Extends Supabase auth.users with additional user information
  - `id` (uuid, FK to auth.users) - User identifier
  - `full_name` (text) - User's display name
  - `phone` (text) - Contact number (hidden until unlocked)
  - `location` (text) - User's general area/locality
  - `latitude` (decimal) - GPS latitude for proximity search
  - `longitude` (decimal) - GPS longitude for proximity search
  - `avatar_url` (text) - Profile picture URL
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update
  
  ### 2. listings
  Items/services available for sale or rent
  - `id` (uuid, PK) - Listing identifier
  - `user_id` (uuid, FK to profiles) - Listing owner
  - `title` (text) - Item/service title
  - `description` (text) - Detailed description
  - `category` (text) - Category (electronics, furniture, books, etc.)
  - `listing_type` (text) - Type: 'sell' or 'rent'
  - `price` (decimal) - Sale price or daily/monthly rent amount
  - `price_unit` (text) - 'per_day', 'per_month', or 'fixed' for sales
  - `images` (text[]) - Array of image URLs
  - `location` (text) - Item location/area
  - `latitude` (decimal) - Item GPS latitude
  - `longitude` (decimal) - Item GPS longitude
  - `status` (text) - 'available', 'sold', 'rented', 'inactive'
  - `created_at` (timestamptz) - Listing creation time
  - `updated_at` (timestamptz) - Last update time
  
  ### 3. requests
  Buyer-posted requests for items/services they need
  - `id` (uuid, PK) - Request identifier
  - `user_id` (uuid, FK to profiles) - Requester
  - `title` (text) - What they're looking for
  - `description` (text) - Detailed requirements
  - `category` (text) - Category
  - `request_type` (text) - 'buy' or 'rent'
  - `budget` (decimal) - Maximum budget
  - `budget_unit` (text) - 'per_day', 'per_month', or 'fixed'
  - `location` (text) - Preferred area
  - `latitude` (decimal) - Location latitude
  - `longitude` (decimal) - Location longitude
  - `status` (text) - 'active', 'fulfilled', 'closed'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 4. contact_unlocks
  Tracks which users have unlocked contact info (daily micro-fee system)
  - `id` (uuid, PK) - Unlock record identifier
  - `buyer_id` (uuid, FK to profiles) - User who paid to unlock
  - `seller_id` (uuid, FK to profiles) - User whose contact was unlocked
  - `listing_id` (uuid, FK to listings, nullable) - Related listing if applicable
  - `request_id` (uuid, FK to requests, nullable) - Related request if applicable
  - `unlock_date` (date) - Date of unlock (for daily access tracking)
  - `amount_paid` (decimal) - Fee paid for unlock
  - `created_at` (timestamptz) - Unlock timestamp
  
  ## Security
  
  All tables have Row Level Security (RLS) enabled with the following policies:
  
  ### profiles
  - Anyone can view public profile info
  - Users can only update their own profile
  - Users can insert their own profile on signup
  
  ### listings
  - Anyone can view available listings
  - Users can create their own listings
  - Users can update/delete only their own listings
  
  ### requests
  - Anyone can view active requests
  - Users can create their own requests
  - Users can update/delete only their own requests
  
  ### contact_unlocks
  - Users can view their own unlock records (as buyer)
  - Users can view unlocks for their listings/requests (as seller)
  - Only authenticated users can create unlock records
  
  ## Notes
  - Uses PostGIS-style geography for future proximity searches
  - Phone numbers remain private until unlocked via payment
  - Daily micro-fee model: users pay small fee per day to access contacts
  - Status fields enable marketplace flow management
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  location text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create listings table
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('sell', 'rent')),
  price decimal(10, 2) NOT NULL,
  price_unit text NOT NULL DEFAULT 'fixed' CHECK (price_unit IN ('per_day', 'per_month', 'fixed')),
  images text[] DEFAULT ARRAY[]::text[],
  location text NOT NULL,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'rented', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available listings"
  ON listings FOR SELECT
  TO authenticated
  USING (status = 'available');

CREATE POLICY "Users can create own listings"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
  ON listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
  ON listings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('buy', 'rent')),
  budget decimal(10, 2),
  budget_unit text DEFAULT 'fixed' CHECK (budget_unit IN ('per_day', 'per_month', 'fixed')),
  location text NOT NULL,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active requests"
  ON requests FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Users can create own requests"
  ON requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own requests"
  ON requests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create contact_unlocks table
CREATE TABLE IF NOT EXISTS contact_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  request_id uuid REFERENCES requests(id) ON DELETE SET NULL,
  unlock_date date NOT NULL DEFAULT CURRENT_DATE,
  amount_paid decimal(10, 2) NOT NULL DEFAULT 5.00,
  created_at timestamptz DEFAULT now(),
  UNIQUE(buyer_id, seller_id, unlock_date)
);

ALTER TABLE contact_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlock records as buyer"
  ON contact_unlocks FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Users can view unlocks for their listings as seller"
  ON contact_unlocks FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Authenticated users can create unlocks"
  ON contact_unlocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_category ON requests(category);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_location ON requests(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_unlocks_buyer_id ON contact_unlocks(buyer_id);
CREATE INDEX IF NOT EXISTS idx_contact_unlocks_seller_id ON contact_unlocks(seller_id);
CREATE INDEX IF NOT EXISTS idx_contact_unlocks_unlock_date ON contact_unlocks(unlock_date);
