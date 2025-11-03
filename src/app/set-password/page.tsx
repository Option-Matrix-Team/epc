"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import getSupabaseClient from "@/lib/supabaseClient";
import { all_routes } from "@/routes/all_routes";
import ImageWithBasePath from "@/core/imageWithBasePath";

export default function SetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [strength, setStrength] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        if (!password) {
            setError("Password is required");
            setLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }
        try {
            const supabase = getSupabaseClient();
            // Ensure there's an authenticated user/session first
            const userRes: any = await supabase.auth.getUser();
            const user = userRes?.data?.user ?? null;
            if (!user) {
                throw new Error("No authenticated session found. Please open the magic link from your email and try again.");
            }

            // Update the currently authenticated user's password and mark metadata so lists can show verification
            const { error } = await supabase.auth.updateUser({ password, data: { password_set: true } });
            if (error) throw error;
            // On success, show toast then redirect to login after short delay
            setShowSuccess(true);
            setTimeout(() => {
                // clear any auth fragments from URL for safety
                try { window.history.replaceState({}, document.title, window.location.pathname + window.location.search); } catch (e) { }
                router.push(all_routes.login);
            }, 1200);
        } catch (err: any) {
            setError(err.message || "Failed to set password");
        } finally {
            setLoading(false);
        }
    };

    // Utility to attempt to hide any open Bootstrap modal (DOM fallback) before navigation
    const hideAllModals = () => {
        try {
            document.querySelectorAll('.modal').forEach((m) => {
                try {
                    (m as HTMLElement).classList.remove('show');
                    (m as any).style.display = 'none';
                } catch (_) { }
            });
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            try { document.body.classList.remove('modal-open'); (document.body as any).style.overflow = ''; (document.body as any).style.paddingRight = ''; } catch (_) { }
        } catch (e) { /* ignore */ }
    };

    // Password strength calculation
    useEffect(() => {
        let score = 0;
        if (password.length >= 8) score += 1;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        setStrength(score);
    }, [password]);

    // Auto-clear hash after Supabase sets session from the magic link.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const hash = window.location.hash || '';
        if (!hash.includes('access_token=')) return;

        const supabase = getSupabaseClient();
        let cancelled = false;

        const checkUser = async () => {
            for (let i = 0; i < 20; i++) {
                if (cancelled) return;
                try {
                    const u = await supabase.auth.getUser();
                    const user = (u as any)?.data?.user ?? null;
                    if (user) {
                        // remove fragment from URL without adding history
                        try { window.history.replaceState({}, document.title, window.location.pathname + window.location.search); } catch (e) { }
                        return;
                    }
                } catch (e) { }
                await new Promise(r => setTimeout(r, 200));
            }
        };
        checkUser();
        return () => { cancelled = true; };
    }, []);

    return (
        <>
            <div className="auth-bg position-relative overflow-hidden">
                <div className="container-fuild position-relative z-1">
                    <div className="w-100 overflow-hidden position-relative flex-wrap d-block vh-100">
                        <div className="row justify-content-center align-items-center vh-100 overflow-auto flex-wrap py-3">
                            <div className="col-lg-4 mx-auto">
                                <div className="card border-1 p-lg-3 shadow-md rounded-3 mb-4">
                                    <div className="card-body">
                                        <h4 className="card-title mb-3">Set your password</h4>
                                        <form onSubmit={handleSetPassword}>
                                            <div className="mb-3">
                                                <label className="form-label">New password</label>
                                                <div className="input-group">
                                                    <input className="form-control" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} />
                                                    <button type="button" className="btn btn-light border" onClick={() => setShowPassword(s => !s)} aria-label="Toggle password visibility">
                                                        <i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label">Confirm password</label>
                                                <div className="input-group">
                                                    <input className="form-control" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                                    <button type="button" className="btn btn-light border" onClick={() => setShowConfirmPassword(s => !s)} aria-label="Toggle confirm password visibility">
                                                        <i className={showConfirmPassword ? 'ti ti-eye-off' : 'ti ti-eye'} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label">Strength</label>
                                                <div className="progress" style={{ height: 8 }}>
                                                    <div className={`progress-bar ${strength <= 1 ? 'bg-danger' : strength === 2 ? 'bg-warning' : 'bg-success'}`} role="progressbar" style={{ width: `${(strength / 4) * 100}%` }} aria-valuenow={strength} aria-valuemin={0} aria-valuemax={4}></div>
                                                </div>
                                                <small className="text-muted">{strength <= 1 ? 'Weak' : strength === 2 ? 'Fair' : strength === 3 ? 'Good' : 'Strong'}</small>
                                            </div>
                                            {error && <div className="alert alert-danger">{error}</div>}
                                            <div className="d-flex justify-content-end gap-2">
                                                <button className="btn btn-secondary" type="button" onClick={() => { try { hideAllModals(); } catch (_) { } router.push(all_routes.login); }}>Cancel</button>
                                                <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save password'}</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                                <p className="text-dark text-center">Copyright © 2025 - EMR</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ImageWithBasePath
                src="assets/chartxbg2.jpg"
                alt="background"
                className="login-bg-cover img-fluid"
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    zIndex: 0,
                }}
            />
        </>
    );
}
