"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase-browser";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const supabase =
        createSupabaseBrowserClient();

      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        throw error;
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (error) {
      console.error(
        "ADMIN LOGIN ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">

        <div className="admin-login-header">
          <p className="admin-eyebrow">
            KRINSH PANCHAL
          </p>

          <h1>
            Admin
          </h1>

          <p>
            Sign in to manage your
            networking meetings.
          </p>
        </div>

        <form
          className="admin-login-form"
          onSubmit={handleLogin}
        >

          <div className="admin-field">
            <label htmlFor="admin-email">
              Email
            </label>

            <input
              id="admin-email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="admin-password">
              Password
            </label>

            <input
              id="admin-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="admin-login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="admin-login-button"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>

        </form>

      </div>

      <style jsx>{`

        .admin-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background:
            radial-gradient(
              circle at 50% 15%,
              #202020 0%,
              #0b0b0b 45%,
              #050505 100%
            );
          color: #f5f5f5;
        }

        .admin-login-card {
          width: 100%;
          max-width: 440px;
          padding: 40px;
          border: 1px solid #292929;
          border-radius: 24px;
          background: rgba(14, 14, 14, 0.96);
          box-shadow:
            0 30px 100px
            rgba(0, 0, 0, 0.6);
        }

        .admin-login-header {
          margin-bottom: 34px;
        }

        .admin-eyebrow {
          margin: 0 0 14px;
          color: #8494a6;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 5px;
        }

        .admin-login-header h1 {
          margin: 0;
          font-size: 48px;
          font-weight: 400;
          letter-spacing: -2px;
        }

        .admin-login-header p:last-child {
          margin: 14px 0 0;
          color: #777;
          font-size: 14px;
          line-height: 1.6;
        }

        .admin-login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .admin-field {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .admin-field label {
          color: #bbb;
          font-size: 13px;
        }

        .admin-field input {
          width: 100%;
          height: 54px;
          padding: 0 16px;
          border: 1px solid #303030;
          border-radius: 12px;
          outline: none;
          background: #080808;
          color: #fff;
          font-family: inherit;
          font-size: 15px;
          box-sizing: border-box;
          transition:
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .admin-field input::placeholder {
          color: #555;
        }

        .admin-field input:focus {
          border-color: #777;
          background: #0c0c0c;
        }

        .admin-login-error {
          padding: 13px 14px;
          border: 1px solid
            rgba(255, 80, 80, 0.3);
          border-radius: 10px;
          background:
            rgba(120, 30, 30, 0.08);
          color: #ff7777;
          font-size: 13px;
          line-height: 1.4;
        }

        .admin-login-button {
          width: 100%;
          height: 56px;
          margin-top: 4px;
          border: 0;
          border-radius: 12px;
          background: #f5f5f5;
          color: #050505;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background 0.2s ease,
            transform 0.2s ease,
            opacity 0.2s ease;
        }

        .admin-login-button:hover {
          background: #fff;
          transform: translateY(-1px);
        }

        .admin-login-button:disabled {
          opacity: 0.5;
          cursor: wait;
          transform: none;
        }

        @media (max-width: 500px) {

          .admin-login-page {
            padding: 16px;
          }

          .admin-login-card {
            padding: 28px 22px;
            border-radius: 20px;
          }

          .admin-login-header h1 {
            font-size: 42px;
          }

        }

      `}</style>
    </main>
  );
}