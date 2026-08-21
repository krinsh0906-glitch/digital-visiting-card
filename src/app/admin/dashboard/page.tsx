"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  createSupabaseBrowserClient,
} from "../../lib/supabase-browser";

// ============================================
// TYPES
// ============================================

type Lead = {
  id: string;
  name: string;
  email: string;
  meeting_id: string;
  created_at: string;
};

// ============================================
// ADMIN DASHBOARD
// ============================================

export default function AdminDashboard() {
  const router = useRouter();

  // ==========================================
  // AUTH
  // ==========================================

  const [email, setEmail] =
    useState("");

  const [authLoading, setAuthLoading] =
    useState(true);

  // ==========================================
  // LEADS COUNT
  // ==========================================

  const [leadCount, setLeadCount] =
    useState(0);

  const [leadsLoading, setLeadsLoading] =
    useState(true);

  // ==========================================
  // CHECK USER
  // ==========================================

  useEffect(() => {
    const checkUser =
      async () => {
        try {
          const supabase =
            createSupabaseBrowserClient();

          const {
            data: {
              user,
            },
          } =
            await supabase.auth.getUser();

          if (!user) {
            router.replace(
              "/admin"
            );

            return;
          }

          setEmail(
            user.email || ""
          );

          setAuthLoading(
            false
          );
        } catch (error) {
          console.error(
            "AUTH CHECK ERROR:",
            error
          );

          router.replace(
            "/admin"
          );
        }
      };

    void checkUser();
  }, [router]);

  // ==========================================
  // LOAD LEAD COUNT
  // ==========================================

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const loadLeadCount =
      async () => {
        try {
          setLeadsLoading(
            true
          );

          const response =
            await fetch(
              "/api/leads",
              {
                method: "GET",
                cache: "no-store",
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data?.error ||
                "Unable to load leads."
            );
          }

          const leads: Lead[] =
            Array.isArray(
              data?.leads
            )
              ? data.leads
              : [];

          setLeadCount(
            leads.length
          );
        } catch (error) {
          console.error(
            "LOAD LEAD COUNT ERROR:",
            error
          );

          setLeadCount(0);
        } finally {
          setLeadsLoading(
            false
          );
        }
      };

    void loadLeadCount();
  }, [authLoading]);

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout =
    async () => {
      try {
        const supabase =
          createSupabaseBrowserClient();

        await supabase.auth.signOut();

        router.replace(
          "/admin"
        );
      } catch (error) {
        console.error(
          "LOGOUT ERROR:",
          error
        );
      }
    };

  // ==========================================
  // OPEN LEADS
  // ==========================================

  const openLeads =
    () => {
      router.push(
        "/leads"
      );
    };

  // ==========================================
  // OPEN NETWORKING
  // ==========================================

  const openNetworking =
    () => {
      router.push(
        "/networking"
      );
    };

  // ==========================================
  // LOADING
  // ==========================================

  if (authLoading) {
    return (
      <main className="admin-dashboard">

        <div className="dashboard-loading">
          Loading dashboard...
        </div>

        <style jsx>{`

          .admin-dashboard {
            min-height: 100vh;
            background: #050505;
            color: #f5f5f5;
          }

          .dashboard-loading {
            min-height: 100vh;

            display: flex;

            align-items: center;
            justify-content: center;

            color: #777;

            font-size: 14px;
          }

        `}</style>

      </main>
    );
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  return (
    <main className="admin-dashboard">

      {/* =====================================
          HEADER
      ====================================== */}

      <header className="dashboard-header">

        <div>

          <p className="dashboard-eyebrow">
            KRINSH PANCHAL
          </p>

          <h1>
            Admin Dashboard
          </h1>

          <p className="dashboard-subtitle">
            Manage your networking
            leads and connections.
          </p>

        </div>

        <button
          type="button"
          className="logout-button"
          onClick={
            handleLogout
          }
        >
          Sign Out
        </button>

      </header>

      {/* =====================================
          ACCOUNT
      ====================================== */}

      <section className="account-section">

        <div className="account-card">

          <span className="card-label">
            ADMIN ACCOUNT
          </span>

          <h2>
            Welcome back
          </h2>

          <p>
            {email}
          </p>

        </div>

      </section>

      {/* =====================================
          MANAGEMENT CARDS
      ====================================== */}

      <section className="management-grid">

        {/* ===================================
            NETWORKING / MEETINGS
        ==================================== */}

        <article className="management-card">

          <div className="card-top">

            <span className="card-label">
              MEETINGS
            </span>

            <div className="card-number">
              →
            </div>

          </div>

          <h2>
            Meeting Management
          </h2>

          <p>
            Create and manage your
            exhibition meetings,
            QR codes and networking
            sessions.
          </p>

          <button
            type="button"
            className="management-button"
            onClick={
              openNetworking
            }
          >
            Open Networking

            <span>
              →
            </span>
          </button>

        </article>

        {/* ===================================
            LEADS
        ==================================== */}

        <article className="management-card">

          <div className="card-top">

            <span className="card-label">
              YOUR NETWORK
            </span>

            <div className="lead-count">
              {leadsLoading
                ? "—"
                : leadCount}
            </div>

          </div>

          <h2>
            Leads
          </h2>

          <p>
            People who received
            your digital visiting
            card through your
            networking meetings.
          </p>

          <button
            type="button"
            className="management-button"
            onClick={
              openLeads
            }
          >
            Open Leads

            <span>
              →
            </span>
          </button>

        </article>

      </section>

      {/* =====================================
          FOOTER INFO
      ====================================== */}

      <section className="dashboard-footer">

        <div>

          <span className="card-label">
            NETWORKING SYSTEM
          </span>

          <p>
            Your leads, meetings and
            connections are managed
            from their dedicated
            sections.
          </p>

        </div>

      </section>

      {/* =====================================
          STYLES
      ====================================== */}

      <style jsx>{`

        /* =====================================
           PAGE
        ====================================== */

        .admin-dashboard {
          min-height: 100vh;

          padding: 60px 5vw 100px;

          background: #050505;

          color: #f5f5f5;

          box-sizing: border-box;
        }

        /* =====================================
           HEADER
        ====================================== */

        .dashboard-header {
          max-width: 1400px;

          margin: 0 auto 60px;

          display: flex;

          align-items: flex-start;

          justify-content: space-between;

          gap: 30px;
        }

        .dashboard-eyebrow,
        .card-label {
          margin: 0;

          color: #8494a6;

          font-size: 10px;

          letter-spacing: 5px;

          font-weight: 600;
        }

        .dashboard-header h1 {
          margin: 22px 0 0;

          font-size: clamp(
            48px,
            7vw,
            82px
          );

          line-height: 0.95;

          font-weight: 400;

          letter-spacing: -4px;
        }

        .dashboard-subtitle {
          margin: 20px 0 0;

          color: #777;

          font-size: 15px;

          line-height: 1.6;
        }

        /* =====================================
           LOGOUT
        ====================================== */

        .logout-button {
          min-height: 54px;

          padding: 0 24px;

          border: 1px solid #303030;

          border-radius: 12px;

          background: transparent;

          color: #ddd;

          font-size: 14px;

          font-weight: 600;

          cursor: pointer;

          transition: 0.2s ease;
        }

        .logout-button:hover {
          background: #111;

          border-color: #555;

          color: white;
        }

        /* =====================================
           ACCOUNT
        ====================================== */

        .account-section {
          max-width: 1400px;

          margin: 0 auto 24px;
        }

        .account-card {
          min-height: 180px;

          padding: 32px;

          border: 1px solid #292929;

          border-radius: 22px;

          background: #090909;

          box-sizing: border-box;
        }

        .account-card h2 {
          margin: 20px 0 10px;

          font-size: 28px;

          font-weight: 400;

          letter-spacing: -1px;
        }

        .account-card p {
          margin: 0;

          color: #777;

          font-size: 14px;

          word-break: break-word;
        }

        /* =====================================
           MANAGEMENT GRID
        ====================================== */

        .management-grid {
          max-width: 1400px;

          margin: 0 auto;

          display: grid;

          grid-template-columns:
            repeat(2, 1fr);

          gap: 24px;
        }

        /* =====================================
           MANAGEMENT CARD
        ====================================== */

        .management-card {
          min-height: 350px;

          padding: 36px;

          border: 1px solid #292929;

          border-radius: 24px;

          background: #090909;

          box-sizing: border-box;

          transition:
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .management-card:hover {
          border-color: #3d3d3d;

          background: #0b0b0b;
        }

        /* =====================================
           CARD TOP
        ====================================== */

        .card-top {
          display: flex;

          align-items: center;

          justify-content: space-between;
        }

        .card-number,
        .lead-count {
          width: 52px;

          height: 52px;

          border: 1px solid #292929;

          border-radius: 50%;

          display: flex;

          align-items: center;

          justify-content: center;

          color: #aaa;

          font-size: 14px;

          flex: 0 0 auto;
        }

        .management-card h2 {
          margin: 38px 0 14px;

          font-size: 34px;

          font-weight: 400;

          letter-spacing: -1.5px;
        }

        .management-card p {
          max-width: 500px;

          margin: 0;

          color: #777;

          font-size: 14px;

          line-height: 1.7;
        }

        /* =====================================
           ACTION BUTTON
        ====================================== */

        .management-button {
          min-height: 54px;

          margin-top: 34px;

          padding: 0 22px;

          border: 1px solid #444;

          border-radius: 12px;

          background: #111;

          color: #ddd;

          font-size: 14px;

          font-weight: 600;

          cursor: pointer;

          transition: 0.2s ease;
        }

        .management-button span {
          margin-left: 12px;

          color: #888;

          transition: 0.2s ease;
        }

        .management-button:hover {
          border-color: #777;

          background: #181818;

          color: white;

          transform: translateY(-1px);
        }

        .management-button:hover span {
          color: white;

          transform: translateX(3px);
        }

        /* =====================================
           FOOTER
        ====================================== */

        .dashboard-footer {
          max-width: 1400px;

          margin: 24px auto 0;

          padding: 28px 0;

          border-top: 1px solid #1d1d1d;
        }

        .dashboard-footer p {
          margin: 12px 0 0;

          color: #555;

          font-size: 13px;

          line-height: 1.6;
        }

        /* =====================================
           MOBILE
        ====================================== */

        @media (max-width: 800px) {

          .management-grid {
            grid-template-columns: 1fr;
          }

        }

        @media (max-width: 600px) {

          .admin-dashboard {
            padding: 35px 18px 70px;
          }

          .dashboard-header {
            flex-direction: column;

            margin-bottom: 45px;
          }

          .dashboard-header h1 {
            font-size: 48px;

            letter-spacing: -3px;
          }

          .logout-button {
            width: 100%;
          }

          .account-card,
          .management-card {
            padding: 26px 22px;
          }

          .management-card {
            min-height: 320px;
          }

          .management-card h2 {
            font-size: 30px;
          }

          .management-button {
            width: 100%;
          }

        }

      `}</style>

    </main>
  );
}