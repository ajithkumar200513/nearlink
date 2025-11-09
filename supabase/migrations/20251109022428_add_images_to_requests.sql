/*
  # Add images column to requests table

  ## Overview
  Adds support for image uploads to the requests table, allowing users to include images when posting what they're looking for.

  ## Changes
  - Add `images` (text[]) column to requests table with default empty array
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requests' AND column_name = 'images'
  ) THEN
    ALTER TABLE requests ADD COLUMN images text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;
