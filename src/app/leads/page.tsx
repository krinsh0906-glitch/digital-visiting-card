"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ============================================
// TYPES
// ============================================

type Meeting = {
  id: string;
  title: string;
  location: string | null;
  session_date: string;
  session_code: string;
  is_active: boolean;
};

type Lead = {
  id: string;
  name: string;
  email: string;
  meeting_id: string;
  created_at: string;
  meeting_sessions:
    | Meeting
    | Meeting[]
    | null;
};

// ============================================
// HELPERS
// ============================================

function formatDate(
  dateString: string
) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

// ============================================
// PAGE
// ============================================

export default function LeadsPage() {
  const router = useRouter();

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =========================================
  // LOAD LEADS
  // =========================================

  useEffect(() => {
    const loadLeads = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
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

        setLeads(
          Array.isArray(data?.leads)
            ? data.leads
            : []
        );
      } catch (error) {
        console.error(
          "LOAD LEADS ERROR:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load leads."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadLeads();
  }, []);

  // =========================================
  // GET MEETING
  // =========================================

  const getMeeting = (
    lead: Lead
  ): Meeting | null => {
    if (
      !lead.meeting_sessions
    ) {
      return null;
    }

    if (
      Array.isArray(
        lead.meeting_sessions
      )
    ) {
      return (
        lead.meeting_sessions[0] ||
        null
      );
    }

    return lead.meeting_sessions;
  };

  // =========================================
  // RENDER
  // =========================================

  return (
    <main className="leads-page">

      {/* =====================================
          HEADER
      ====================================== */}

      <header className="leads-header">

        <div>

          <p className="leads-eyebrow">
            YOUR NETWORK
          </p>

          <h1>
            Leads
          </h1>

          <p className="leads-subtitle">
            People who received your
            digital visiting card.
          </p>

        </div>

        <div className="lead-count">
          {leads.length}
        </div>

      </header>

      {/* =====================================
          ERROR
      ====================================== */}

      {error && (
        <div className="leads-error">
          {error}
        </div>
      )}

      {/* =====================================
          LOADING
      ====================================== */}

      {loading && (
        <div className="leads-state">
          Loading leads...
        </div>
      )}

      {/* =====================================
          EMPTY
      ====================================== */}

      {!loading &&
        !error &&
        leads.length === 0 && (
          <div className="leads-state">

            <div className="empty-icon">
              +
            </div>

            <h2>
              No leads yet
            </h2>

            <p>
              When someone scans your
              meeting QR code and submits
              their details, they will
              appear here.
            </p>

          </div>
        )}

      {/* =====================================
          LEAD LIST
      ====================================== */}

      {!loading &&
        leads.length > 0 && (
          <section className="lead-list">

            {leads.map((lead) => {

              const meeting =
                getMeeting(lead);

              return (
                <article
                  key={lead.id}
                  className="lead-card"
                >

                  {/* ==========================
                      PERSON
                  =========================== */}

                  <div className="lead-person">

                    <div className="lead-avatar">
                      {lead.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>

                      <h2>
                        {lead.name}
                      </h2>

                      <p>
                        {lead.email}
                      </p>

                    </div>

                  </div>

                  {/* ==========================
                      MEETING
                  =========================== */}

                  <div className="lead-meeting">

                    <span className="lead-label">
                      MEETING
                    </span>

                    <strong>
                      {meeting?.title ||
                        "Unknown meeting"}
                    </strong>

                    <span className="lead-date">
                      {formatDate(
                        lead.created_at
                      )}
                    </span>

                  </div>

                  {/* ==========================
                      VIEW
                  =========================== */}

                  <button
                    type="button"
                    className="view-button"
                    onClick={() =>
                      router.push(
                        `/leads/${lead.id}`
                      )
                    }
                  >
                    View
                    <span>
                      →
                    </span>
                  </button>

                </article>
              );
            })}

          </section>
        )}

      {/* =====================================
          STYLES
      ====================================== */}

      <style jsx>{`

        .leads-page {
          min-height: 100vh;
          padding: 48px 4vw 100px;
          background: #050505;
          color: #f5f5f5;
          box-sizing: border-box;
        }

        .leads-header {
          max-width: 1400px;
          margin: 0 auto 55px;

          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
        }

        .leads-eyebrow {
          margin: 0 0 18px;

          font-size: 10px;
          letter-spacing: 5px;
          font-weight: 600;

          color: #8494a6;
        }

        .leads-header h1 {
          margin: 0;

          font-size: clamp(
            52px,
            7vw,
            82px
          );

          line-height: 0.95;
          font-weight: 400;

          letter-spacing: -4px;
        }

        .leads-subtitle {
          margin: 20px 0 0;

          color: #888;
          font-size: 15px;
        }

        .lead-count {
          min-width: 64px;
          height: 64px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid #303030;
          border-radius: 50%;

          color: #ddd;
          font-size: 15px;
        }

        .lead-list {
          max-width: 1400px;
          margin: 0 auto;

          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .lead-card {
          display: grid;

          grid-template-columns:
            minmax(280px, 1.5fr)
            minmax(260px, 1fr)
            auto;

          align-items: center;

          gap: 35px;

          padding: 28px 34px;

          border: 1px solid #292929;
          border-radius: 22px;

          background: #080808;

          transition:
            border-color 0.2s ease,
            transform 0.2s ease,
            background 0.2s ease;
        }

        .lead-card:hover {
          border-color: #414141;
          background: #0a0a0a;
          transform: translateY(-1px);
        }

        .lead-person {
          display: flex;
          align-items: center;
          gap: 20px;
          min-width: 0;
        }

        .lead-avatar {
          flex: 0 0 auto;

          width: 58px;
          height: 58px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid #303030;
          border-radius: 50%;

          color: #ddd;
          font-size: 18px;
        }

        .lead-person h2 {
          margin: 0 0 7px;

          font-size: 20px;
          font-weight: 500;

          color: #f2f2f2;
        }

        .lead-person p {
          margin: 0;

          color: #777;
          font-size: 14px;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lead-meeting {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .lead-label {
          color: #718198;

          font-size: 9px;
          letter-spacing: 4px;
          font-weight: 600;
        }

        .lead-meeting strong {
          color: #ddd;

          font-size: 14px;
          font-weight: 400;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lead-date {
          color: #666;
          font-size: 12px;
        }

        .view-button {
          min-width: 110px;
          min-height: 52px;

          padding: 0 20px;

          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;

          border: 1px solid #303030;
          border-radius: 12px;

          background: transparent;
          color: #ddd;

          font-size: 14px;
          font-weight: 600;

          cursor: pointer;

          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease;
        }

        .view-button:hover {
          border-color: #555;
          background: #151515;
          color: white;
        }

        .view-button span {
          font-size: 18px;
          line-height: 1;
        }

        .leads-state {
          max-width: 1400px;
          margin: 0 auto;

          padding: 90px 30px;

          border: 1px solid #252525;
          border-radius: 22px;

          text-align: center;
          color: #777;
        }

        .empty-icon {
          width: 58px;
          height: 58px;

          margin: 0 auto 24px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid #353535;
          border-radius: 50%;

          color: #aaa;
          font-size: 24px;
        }

        .leads-state h2 {
          margin: 0 0 10px;

          color: #ddd;
          font-size: 25px;
          font-weight: 400;
        }

        .leads-state p {
          max-width: 450px;
          margin: 0 auto;

          color: #707070;
          font-size: 14px;
          line-height: 1.6;
        }

        .leads-error {
          max-width: 1400px;
          margin: 0 auto 25px;

          padding: 16px 18px;

          border: 1px solid
            rgba(255, 80, 80, 0.3);

          border-radius: 12px;

          background: rgba(
            120,
            30,
            30,
            0.08
          );

          color: #ff7777;

          font-size: 14px;
        }

        @media (max-width: 900px) {

          .lead-card {
            grid-template-columns:
              1fr
              auto;
          }

          .lead-meeting {
            grid-column: 1;
          }

          .view-button {
            grid-column: 2;
            grid-row: 1 / span 2;
          }

        }

        @media (max-width: 600px) {

          .leads-page {
            padding: 30px 18px 70px;
          }

          .leads-header {
            align-items: flex-start;
          }

          .leads-header h1 {
            font-size: 52px;
          }

          .lead-count {
            width: 52px;
            min-width: 52px;
            height: 52px;
          }

          .lead-card {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 24px;

            padding: 24px 20px;
          }

          .lead-person {
            gap: 15px;
          }

          .lead-avatar {
            width: 50px;
            height: 50px;
          }

          .view-button {
            width: 100%;
          }

        }

      `}</style>

    </main>
  );
}