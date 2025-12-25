-- Create enum for record types and actions
CREATE TYPE public.record_type AS ENUM ('transfer', 'inventory_sale', 'inventory_add', 'debt', 'debt_payment', 'fixed_number_transfer');
CREATE TYPE public.record_action AS ENUM ('create', 'update', 'reverse', 'delete');
CREATE TYPE public.record_status AS ENUM ('active', 'reversed', 'deleted');

-- Create the record_history table for audit trail
CREATE TABLE public.record_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    record_type public.record_type NOT NULL,
    record_id UUID NOT NULL,
    action public.record_action NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}',
    previous_values JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_record_history_user_id ON public.record_history(user_id);
CREATE INDEX idx_record_history_record ON public.record_history(record_type, record_id);
CREATE INDEX idx_record_history_created_at ON public.record_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.record_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view own record_history"
ON public.record_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own record_history"
ON public.record_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create unified ledger_entries view for all financial records
CREATE OR REPLACE VIEW public.ledger_entries AS
SELECT 
    t.id,
    t.user_id,
    'transfer'::record_type as record_type,
    t.type as sub_type,
    t.amount,
    COALESCE(t.profit, 0) as profit,
    t.notes as description,
    NULL::uuid as related_entity_id,
    'cash_transfer' as related_entity_type,
    fn.name as related_entity_name,
    CASE 
        WHEN t.is_archived THEN 'deleted'::record_status
        ELSE 'active'::record_status
    END as status,
    t.created_at
FROM public.transfers t
LEFT JOIN public.fixed_numbers fn ON t.fixed_number_id = fn.id

UNION ALL

SELECT 
    ft.id,
    ft.user_id,
    'fixed_number_transfer'::record_type as record_type,
    'income' as sub_type,
    ft.amount,
    0 as profit,
    ft.notes as description,
    ft.fixed_number_id as related_entity_id,
    'phone_number' as related_entity_type,
    fn.name as related_entity_name,
    'active'::record_status as status,
    ft.created_at
FROM public.fixed_number_transfers ft
LEFT JOIN public.fixed_numbers fn ON ft.fixed_number_id = fn.id

UNION ALL

SELECT 
    il.id,
    il.user_id,
    CASE 
        WHEN il.action = 'sell' THEN 'inventory_sale'::record_type
        ELSE 'inventory_add'::record_type
    END as record_type,
    il.action as sub_type,
    ABS(il.quantity_change) as amount,
    COALESCE(il.profit, 0) as profit,
    ii.name as description,
    il.item_id as related_entity_id,
    'inventory_item' as related_entity_type,
    ii.name as related_entity_name,
    'active'::record_status as status,
    il.created_at
FROM public.inventory_logs il
LEFT JOIN public.inventory_items ii ON il.item_id = ii.id

UNION ALL

SELECT 
    d.id,
    d.user_id,
    CASE 
        WHEN d.is_paid THEN 'debt_payment'::record_type
        ELSE 'debt'::record_type
    END as record_type,
    d.type as sub_type,
    d.amount,
    0 as profit,
    d.description,
    d.id as related_entity_id,
    'debt' as related_entity_type,
    d.description as related_entity_name,
    CASE 
        WHEN d.is_archived THEN 'deleted'::record_status
        WHEN d.is_paid THEN 'active'::record_status
        ELSE 'active'::record_status
    END as status,
    COALESCE(d.paid_at, d.created_at) as created_at
FROM public.debts d;

-- Function to log record changes (audit trail)
CREATE OR REPLACE FUNCTION public.log_record_change(
    _user_id UUID,
    _record_type record_type,
    _record_id UUID,
    _action record_action,
    _changes JSONB DEFAULT '{}',
    _previous_values JSONB DEFAULT NULL,
    _reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    history_id UUID;
BEGIN
    INSERT INTO public.record_history (
        user_id, record_type, record_id, action, changes, previous_values, reason
    ) VALUES (
        _user_id, _record_type, _record_id, _action, _changes, _previous_values, _reason
    )
    RETURNING id INTO history_id;
    
    RETURN history_id;
END;
$$;

-- Function to get record history
CREATE OR REPLACE FUNCTION public.get_record_history(_user_id UUID, _record_id UUID)
RETURNS TABLE (
    id UUID,
    action record_action,
    changes JSONB,
    previous_values JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id, action, changes, previous_values, reason, created_at
    FROM public.record_history
    WHERE user_id = _user_id AND record_id = _record_id
    ORDER BY created_at DESC
$$;

-- Function to reverse a transfer
CREATE OR REPLACE FUNCTION public.reverse_transfer(_user_id UUID, _transfer_id UUID, _reason TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    old_record RECORD;
BEGIN
    -- Get the current record
    SELECT * INTO old_record FROM public.transfers WHERE id = _transfer_id AND user_id = _user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Mark as archived (soft delete/reverse)
    UPDATE public.transfers SET is_archived = TRUE WHERE id = _transfer_id;
    
    -- Log the reversal
    PERFORM public.log_record_change(
        _user_id,
        'transfer',
        _transfer_id,
        'reverse',
        jsonb_build_object('is_archived', TRUE),
        row_to_json(old_record)::jsonb,
        _reason
    );
    
    RETURN TRUE;
END;
$$;

-- Function to reverse a debt
CREATE OR REPLACE FUNCTION public.reverse_debt(_user_id UUID, _debt_id UUID, _reason TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    old_record RECORD;
BEGIN
    SELECT * INTO old_record FROM public.debts WHERE id = _debt_id AND user_id = _user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    UPDATE public.debts SET is_archived = TRUE WHERE id = _debt_id;
    
    PERFORM public.log_record_change(
        _user_id,
        'debt',
        _debt_id,
        'reverse',
        jsonb_build_object('is_archived', TRUE),
        row_to_json(old_record)::jsonb,
        _reason
    );
    
    RETURN TRUE;
END;
$$;