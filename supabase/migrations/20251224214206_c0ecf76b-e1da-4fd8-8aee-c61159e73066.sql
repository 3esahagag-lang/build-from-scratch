-- Add phone_number column to fixed_numbers table
ALTER TABLE public.fixed_numbers ADD COLUMN phone_number text;

-- Add check constraint for 11 digits phone number
ALTER TABLE public.fixed_numbers ADD CONSTRAINT phone_number_format 
CHECK (phone_number IS NULL OR (length(phone_number) = 11 AND phone_number ~ '^[0-9]+$'));