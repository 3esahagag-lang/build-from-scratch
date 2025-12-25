-- Drop the security definer view and recreate as security invoker
DROP VIEW IF EXISTS public.ledger_entries;

-- Recreate view with SECURITY INVOKER (default, respects RLS of querying user)
CREATE VIEW public.ledger_entries 
WITH (security_invoker = true)
AS
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