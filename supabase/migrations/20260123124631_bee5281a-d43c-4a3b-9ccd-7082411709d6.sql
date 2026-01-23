-- Add trade_type column to merchants table for storing specific payment method
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS trade_type text;

-- Add comment for clarity
COMMENT ON COLUMN public.merchants.trade_type IS 'Specific payment method for LG Pay: nagad, bkash (BDT), easypaisa, jazzcash (PKR)';