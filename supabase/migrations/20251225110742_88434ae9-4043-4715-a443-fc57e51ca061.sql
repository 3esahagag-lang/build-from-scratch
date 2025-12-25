-- Create enum for profit source types
CREATE TYPE public.profit_source_type AS ENUM ('inventory_sale', 'cash_transfer');

-- Create the profits table as a first-class entity
CREATE TABLE public.profits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    source_type public.profit_source_type NOT NULL,
    source_id UUID,
    transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    quantity INTEGER,
    unit_type TEXT DEFAULT 'قطعة',
    profit_per_unit NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_profits_user_id ON public.profits(user_id);
CREATE INDEX idx_profits_source_type ON public.profits(source_type);
CREATE INDEX idx_profits_created_at ON public.profits(created_at DESC);
CREATE INDEX idx_profits_transaction_id ON public.profits(transaction_id);
CREATE INDEX idx_profits_daily ON public.profits(user_id, created_at);

-- Enable Row Level Security
ALTER TABLE public.profits ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user isolation
CREATE POLICY "Users can CRUD own profits"
ON public.profits
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to get total profit for a user
CREATE OR REPLACE FUNCTION public.get_user_total_profit(_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(amount), 0)
    FROM public.profits
    WHERE user_id = _user_id
$$;

-- Function to get daily profit
CREATE OR REPLACE FUNCTION public.get_daily_profit(_user_id UUID, _date DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(amount), 0)
    FROM public.profits
    WHERE user_id = _user_id
    AND DATE(created_at) = _date
$$;

-- Function to get profit by source type
CREATE OR REPLACE FUNCTION public.get_profit_by_source(_user_id UUID, _source_type profit_source_type)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(amount), 0)
    FROM public.profits
    WHERE user_id = _user_id
    AND source_type = _source_type
$$;

-- Function to get profit summary by source
CREATE OR REPLACE FUNCTION public.get_profit_summary(_user_id UUID)
RETURNS TABLE (
    total_profit NUMERIC,
    inventory_profit NUMERIC,
    transfer_profit NUMERIC,
    today_profit NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COALESCE(SUM(amount), 0) as total_profit,
        COALESCE(SUM(CASE WHEN source_type = 'inventory_sale' THEN amount ELSE 0 END), 0) as inventory_profit,
        COALESCE(SUM(CASE WHEN source_type = 'cash_transfer' THEN amount ELSE 0 END), 0) as transfer_profit,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN amount ELSE 0 END), 0) as today_profit
    FROM public.profits
    WHERE user_id = _user_id
$$;

-- Function to get daily profit breakdown for a date range
CREATE OR REPLACE FUNCTION public.get_profit_by_date_range(
    _user_id UUID,
    _start_date DATE,
    _end_date DATE
)
RETURNS TABLE (
    profit_date DATE,
    total_amount NUMERIC,
    inventory_amount NUMERIC,
    transfer_amount NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        DATE(created_at) as profit_date,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN source_type = 'inventory_sale' THEN amount ELSE 0 END), 0) as inventory_amount,
        COALESCE(SUM(CASE WHEN source_type = 'cash_transfer' THEN amount ELSE 0 END), 0) as transfer_amount
    FROM public.profits
    WHERE user_id = _user_id
    AND DATE(created_at) BETWEEN _start_date AND _end_date
    GROUP BY DATE(created_at)
    ORDER BY profit_date DESC
$$;