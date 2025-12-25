-- Create enums for transaction types and related entities
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense', 'profit', 'debt', 'debt_payment');
CREATE TYPE public.related_entity_type AS ENUM ('cash_transfer', 'inventory_sale', 'debt', 'phone_number');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'confirmed', 'failed', 'reversed');

-- Create the unified financial transactions table
CREATE TABLE public.financial_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    transaction_type public.transaction_type NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    profit_amount NUMERIC DEFAULT 0 CHECK (profit_amount >= 0),
    related_entity public.related_entity_type NOT NULL,
    related_entity_id UUID,
    status public.transaction_status NOT NULL DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_financial_transactions_user_id ON public.financial_transactions(user_id);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(transaction_type);
CREATE INDEX idx_financial_transactions_status ON public.financial_transactions(status);
CREATE INDEX idx_financial_transactions_created_at ON public.financial_transactions(created_at DESC);
CREATE INDEX idx_financial_transactions_related ON public.financial_transactions(related_entity, related_entity_id);

-- Enable Row Level Security
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user isolation
CREATE POLICY "Users can CRUD own financial_transactions"
ON public.financial_transactions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_financial_transaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_financial_transaction_timestamp();

-- Create helper function to get capital balance (income - expense, excluding profit)
CREATE OR REPLACE FUNCTION public.get_capital_balance(_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        SUM(
            CASE 
                WHEN transaction_type = 'income' THEN amount
                WHEN transaction_type = 'expense' THEN -amount
                WHEN transaction_type = 'debt' THEN -amount
                WHEN transaction_type = 'debt_payment' THEN amount
                ELSE 0
            END
        ), 0
    )
    FROM public.financial_transactions
    WHERE user_id = _user_id
    AND status = 'confirmed'
$$;

-- Create helper function to get total profit
CREATE OR REPLACE FUNCTION public.get_total_profit(_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(profit_amount), 0)
    FROM public.financial_transactions
    WHERE user_id = _user_id
    AND status = 'confirmed'
$$;

-- Create helper function to get financial summary
CREATE OR REPLACE FUNCTION public.get_financial_summary(_user_id UUID)
RETURNS TABLE (
    total_income NUMERIC,
    total_expense NUMERIC,
    total_profit NUMERIC,
    total_debt_given NUMERIC,
    total_debt_received NUMERIC,
    capital_balance NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(profit_amount), 0) as total_profit,
        COALESCE(SUM(CASE WHEN transaction_type = 'debt' THEN amount ELSE 0 END), 0) as total_debt_given,
        COALESCE(SUM(CASE WHEN transaction_type = 'debt_payment' THEN amount ELSE 0 END), 0) as total_debt_received,
        public.get_capital_balance(_user_id) as capital_balance
    FROM public.financial_transactions
    WHERE user_id = _user_id
    AND status = 'confirmed'
$$;