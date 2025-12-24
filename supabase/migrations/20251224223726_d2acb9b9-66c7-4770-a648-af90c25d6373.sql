-- Create a separate table for fixed number transfers/conversions
CREATE TABLE public.fixed_number_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fixed_number_id UUID NOT NULL REFERENCES public.fixed_numbers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.fixed_number_transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to CRUD their own fixed number transfers
CREATE POLICY "Users can CRUD own fixed_number_transfers"
ON public.fixed_number_transfers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries by fixed_number_id
CREATE INDEX idx_fixed_number_transfers_fixed_number_id 
ON public.fixed_number_transfers(fixed_number_id);

-- Create index for faster queries by user_id
CREATE INDEX idx_fixed_number_transfers_user_id 
ON public.fixed_number_transfers(user_id);

-- Create index for monthly queries
CREATE INDEX idx_fixed_number_transfers_created_at 
ON public.fixed_number_transfers(created_at);