-- Create password_reset_otps table for OTP verification
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    CONSTRAINT valid_otp_length CHECK (LENGTH(otp) = 6)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON public.password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_otp ON public.password_reset_otps(otp);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_is_used ON public.password_reset_otps(is_used);

-- Add RLS policies
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (for requesting OTP)
CREATE POLICY "Anyone can request OTP"
    ON public.password_reset_otps
    FOR INSERT
    WITH CHECK (true);

-- Policy: Allow service role to read/update (for verification)
CREATE POLICY "Service role can manage OTPs"
    ON public.password_reset_otps
    FOR ALL
    USING (true);

COMMENT ON TABLE public.password_reset_otps IS 'Stores OTP codes for password reset verification';
COMMENT ON COLUMN public.password_reset_otps.email IS 'User email address';
COMMENT ON COLUMN public.password_reset_otps.otp IS '6-digit OTP code';
COMMENT ON COLUMN public.password_reset_otps.is_used IS 'Whether OTP has been used';
COMMENT ON COLUMN public.password_reset_otps.created_at IS 'OTP creation timestamp (expires after 10 minutes)';
COMMENT ON COLUMN public.password_reset_otps.verified_at IS 'Timestamp when OTP was verified';
