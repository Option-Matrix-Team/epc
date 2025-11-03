"use client"

import ImageWithBasePath from "@/core/imageWithBasePath";
import { all_routes } from "@/routes/all_routes";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import getSupabaseClient from "@/lib/supabaseClient";
type PasswordField = "password" | "confirmPassword";

const LoginComponent = () => {
  const router = useRouter();
  // If Supabase magic-link landed here with an access_token in the URL fragment,
  // forward the entire fragment to /set-password so the client Supabase instance
  // can pick up the session and allow password update.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    if (hash.includes("access_token=")) {
      // preserve fragment when redirecting. Use location.replace to avoid an extra history entry
      // and to navigate before React paints the login UI when possible.
      try {
        window.location.replace(`/set-password${hash}`);
        return;
      } catch (e) {
        router.replace(`/set-password${hash}`);
      }
    }
  }, [router]);

  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    confirmPassword: false,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };
  return (
    <>
      {/* Start Content */}
      <div className="auth-bg position-relative overflow-hidden">
        <div className="container-fuild position-relative z-1">
          <div className="w-100 overflow-hidden position-relative flex-wrap d-block vh-100">
            {/* start row */}
            <div className="row justify-content-center align-items-center vh-100 overflow-auto flex-wrap py-3">
              <div className="col-lg-4 mx-auto">
                <form
                  className="d-flex justify-content-center align-items-center"
                >
                  <div className="d-flex flex-column justify-content-lg-center p-4 p-lg-0 pb-0 flex-fill">

                    <div className="card border-1 p-lg-3 shadow-md rounded-3 mb-4">
                      <div className="card-body">
                        <div className="text-center mb-3">
                          <div className=" mx-auto mb-4 text-center">
                            <ImageWithBasePath
                              src="assets/img/om_logo-rem.png"
                              className="img-fluid"
                              alt="Logo"
                            />
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Email</label>
                          <div className="input-group">
                            <span className="input-group-text border-end-0 bg-white">
                              <i className="ti ti-mail fs-14 text-dark" />
                            </span>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="form-control border-start-0 ps-0"
                              placeholder="you@example.com"
                            />
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Password</label>
                          <div className="position-relative">
                            <div className="pass-group input-group position-relative border rounded">
                              <span className="input-group-text bg-white border-0">
                                <i className="ti ti-lock text-dark fs-14" />
                              </span>
                              <input
                                type={
                                  passwordVisibility.password
                                    ? "text"
                                    : "password"
                                }
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pass-input form-control border-start-0 ps-0"
                                placeholder="****************"
                              />
                              <span
                                className={`ti toggle-password text-dark fs-14 ${passwordVisibility.password
                                  ? "ti-eye"
                                  : "ti-eye-off"
                                  }`}
                                onClick={() =>
                                  togglePasswordVisibility("password")
                                }
                              ></span>
                            </div>
                          </div>
                        </div>
                        {/* <div className="d-flex align-items-center justify-content-between mb-3">
                          <div className="d-flex align-items-center">
                            <div className="form-check form-check-md mb-0">
                              <input
                                className="form-check-input"
                                id="remember_me"
                                type="checkbox"
                              />
                              <label
                                htmlFor="remember_me"
                                className="form-check-label mt-0 text-dark"
                              >
                                Remember Me
                              </label>
                            </div>
                          </div>
                          <div className="text-end">
                            <Link
                              href={all_routes.forgotpasswordbasic}
                              className="text-danger"
                            >
                              Forgot Password?
                            </Link>
                          </div>
                        </div> */}
                        {error && (
                          <div className="alert alert-danger">{error}</div>
                        )}
                        <div className="mb-2">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={async () => {
                              setError(null);
                              setLoading(true);
                              try {
                                const supabase = getSupabaseClient();
                                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                                  email,
                                  password,
                                });
                                if (signInError) throw signInError;
                                // Persist user_type (localStorage) so Sidebar can filter menus.
                                try {
                                  // data may contain user at data.user or data?.user
                                  const authUser = (data as any)?.user ?? (data as any)?.user ?? null;
                                  const userId = authUser?.id ?? null;
                                  // try read from user_metadata first
                                  let detectedUserType = authUser?.user_metadata?.user_type ?? authUser?.user_metadata?.userType ?? null;

                                  // if not present, try to fetch profile row
                                  if (!detectedUserType && userId) {
                                    try {
                                      const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', userId).maybeSingle();
                                      if (profile) {
                                        if (profile.user_type) detectedUserType = profile.user_type;
                                        try { localStorage.setItem('profile', JSON.stringify(profile)); } catch (_) { }
                                      }
                                    } catch (pfErr) {
                                      // ignore
                                    }
                                  }

                                  if (detectedUserType) {
                                    try { localStorage.setItem('user_type', detectedUserType); } catch (_) { }
                                  }
                                } catch (persistErr) {
                                  console.debug('[login] failed to persist user_type', persistErr);
                                }

                                // success - redirect to dashboard
                                router.push(all_routes.dashboard);
                              } catch (err: any) {
                                setError(err?.message || "Login failed");
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="btn bg-primary text-white w-100"
                          >
                            {loading ? "Signing in..." : "Login"}
                          </button>
                        </div>

                      </div>
                      {/* end card body */}
                    </div>
                    {/* end card */}
                  </div>
                </form>
                <p className="text-dark text-center">

                  Copyright © 2025 -   EMR
                </p>
              </div>
              {/* end col */}
            </div>
            {/* end row */}
          </div>
        </div>
      </div>
      {/* End Content */}
      {/* Start Bg Content - full cover background */}
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
      {/* End Bg Content */}
    </>
  );
};

export default LoginComponent;
