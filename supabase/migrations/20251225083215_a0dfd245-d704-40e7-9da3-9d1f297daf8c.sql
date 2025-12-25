-- Add is_disabled column to fixed_numbers table
ALTER TABLE public.fixed_numbers ADD COLUMN is_disabled boolean DEFAULT false;