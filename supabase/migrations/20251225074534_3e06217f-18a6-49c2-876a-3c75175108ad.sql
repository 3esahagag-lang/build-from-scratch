-- Add profit column to transfers table
ALTER TABLE public.transfers
ADD COLUMN profit numeric DEFAULT 0;

-- Add profit_per_unit and unit_type columns to inventory_items table
ALTER TABLE public.inventory_items
ADD COLUMN profit_per_unit numeric DEFAULT 0,
ADD COLUMN unit_type text DEFAULT 'قطعة';

-- Add profit column to inventory_logs table
ALTER TABLE public.inventory_logs
ADD COLUMN profit numeric DEFAULT 0;