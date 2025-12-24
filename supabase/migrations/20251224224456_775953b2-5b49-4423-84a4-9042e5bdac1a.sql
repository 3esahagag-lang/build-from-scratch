-- Create a function to get monthly usage for a fixed number
CREATE OR REPLACE FUNCTION public.get_fixed_number_monthly_usage(
  _fixed_number_id UUID,
  _user_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.fixed_number_transfers
  WHERE fixed_number_id = _fixed_number_id
    AND user_id = _user_id
    AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
$$;

-- Create a function to check if a transfer would exceed the monthly limit
CREATE OR REPLACE FUNCTION public.check_fixed_number_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_usage NUMERIC;
  monthly_limit NUMERIC;
BEGIN
  -- Get the monthly limit for this fixed number
  SELECT fn.monthly_limit INTO monthly_limit
  FROM public.fixed_numbers fn
  WHERE fn.id = NEW.fixed_number_id;
  
  -- If no limit set (0 or NULL), allow the transfer
  IF monthly_limit IS NULL OR monthly_limit <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Get current monthly usage
  SELECT COALESCE(SUM(amount), 0) INTO current_usage
  FROM public.fixed_number_transfers
  WHERE fixed_number_id = NEW.fixed_number_id
    AND user_id = NEW.user_id
    AND created_at >= date_trunc('month', CURRENT_TIMESTAMP);
  
  -- Check if adding this amount would exceed the limit
  IF (current_usage + NEW.amount) > monthly_limit THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED:تم تجاوز الحد الشهري للتحويلات. الحد: %, المستخدم: %, المتبقي: %', 
      monthly_limit, current_usage, (monthly_limit - current_usage);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce the limit on insert
CREATE TRIGGER enforce_fixed_number_limit
  BEFORE INSERT ON public.fixed_number_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.check_fixed_number_limit();