"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

import {
  Phone,
  Mail,
  Globe,
  MapPin,
} from "lucide-react";

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

type Conversation = {
  id: string;
  lead_id: string;
  conversation: string;
  created_at: string;
  updated_at: string;
};

type GeneratedEmail = {
  subject: string;
  body: string;
  recipient: {
    name: string;
    email: string;
  };
};

// ============================================
// DATE HELPERS
// ============================================

function formatDate(
  dateString: string | null | undefined
) {
  if (!dateString) {
    return "Not specified";
  }

  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
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

function formatDateTime(
  dateString: string | null | undefined
) {
  if (!dateString) {
    return "Not specified";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

// ============================================
// PAGE
// ============================================

export default function LeadDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const leadId =
    typeof params?.id === "string"
      ? params.id
      : "";

  // =========================================
  // LEAD
  // =========================================

  const [lead, setLead] =
    useState<Lead | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =========================================
  // CONVERSATION
  // =========================================

  const [conversation, setConversation] =
    useState("");

  const [
    loadingConversation,
    setLoadingConversation,
  ] = useState(true);

  const [
    savingConversation,
    setSavingConversation,
  ] = useState(false);

  const [
    conversationMessage,
    setConversationMessage,
  ] = useState("");

  // =========================================
  // AI EMAIL
  // =========================================

  const [
    generatingEmail,
    setGeneratingEmail,
  ] = useState(false);

  const [
    generatedEmail,
    setGeneratedEmail,
  ] = useState<GeneratedEmail | null>(
    null
  );

  const [
    emailSubject,
    setEmailSubject,
  ] = useState("");

  const [
    emailBody,
    setEmailBody,
  ] = useState("");

  const [aiMessage, setAiMessage] =
    useState("");

  // =========================================
  // SEND EMAIL
  // =========================================

  const [
    sendingEmail,
    setSendingEmail,
  ] = useState(false);

  // =========================================
  // DIGITAL CARD PDF REFERENCES
  // =========================================

  const frontCardRef =
    useRef<HTMLDivElement | null>(null);

  const backCardRef =
    useRef<HTMLDivElement | null>(null);

  // =========================================
  // GET MEETING
  // =========================================

  const getMeeting = (
    leadData: Lead
  ): Meeting | null => {
    if (!leadData.meeting_sessions) {
      return null;
    }

    if (
      Array.isArray(
        leadData.meeting_sessions
      )
    ) {
      return (
        leadData.meeting_sessions[0] ||
        null
      );
    }

    return leadData.meeting_sessions;
  };

  // =========================================
  // LOAD LEAD
  // =========================================

  useEffect(() => {
    if (!leadId) {
      setError("Lead ID is missing.");
      setLoading(false);
      return;
    }

    const loadLead = async () => {
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
              "Unable to load lead."
          );
        }

        const leads: Lead[] =
          Array.isArray(data?.leads)
            ? data.leads
            : [];

        const foundLead =
          leads.find(
            (item) =>
              item.id === leadId
          ) || null;

        if (!foundLead) {
          throw new Error(
            "Lead not found."
          );
        }

        setLead(foundLead);
      } catch (error) {
        console.error(
          "LOAD LEAD ERROR:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load lead."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadLead();
  }, [leadId]);

  // =========================================
  // LOAD CONVERSATION
  // =========================================

  useEffect(() => {
    if (!leadId) {
      return;
    }

    const loadConversation =
      async () => {
        try {
          setLoadingConversation(
            true
          );

          setConversationMessage("");

          const response =
            await fetch(
              `/api/lead-conversations?leadId=${encodeURIComponent(
                leadId
              )}`,
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
                "Unable to load conversation."
            );
          }

          const savedConversation:
            | Conversation
            | null =
            data?.conversation ||
            null;

          setConversation(
            savedConversation
              ?.conversation || ""
          );
        } catch (error) {
          console.error(
            "LOAD CONVERSATION ERROR:",
            error
          );

          setConversationMessage(
            error instanceof Error
              ? error.message
              : "Unable to load conversation."
          );
        } finally {
          setLoadingConversation(
            false
          );
        }
      };

    void loadConversation();
  }, [leadId]);

  // =========================================
  // SAVE CONVERSATION
  // RETURNS TRUE / FALSE
  // =========================================

  const saveConversation =
    async (): Promise<boolean> => {
      const cleanConversation =
        conversation.trim();

      setConversationMessage("");

      if (!leadId) {
        setConversationMessage(
          "Lead ID is missing."
        );

        return false;
      }

      if (!cleanConversation) {
        setConversationMessage(
          "Please enter your conversation notes first."
        );

        return false;
      }

      try {
        setSavingConversation(
          true
        );

        const response =
          await fetch(
            "/api/lead-conversations",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                leadId,
                conversation:
                  cleanConversation,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to save conversation."
          );
        }

        setConversation(
          data?.conversation
            ?.conversation ||
            cleanConversation
        );

        setConversationMessage(
          "Conversation saved successfully."
        );

        window.setTimeout(() => {
          setConversationMessage(
            ""
          );
        }, 3000);

        return true;
      } catch (error) {
        console.error(
          "SAVE CONVERSATION ERROR:",
          error
        );

        setConversationMessage(
          error instanceof Error
            ? error.message
            : "Unable to save conversation."
        );

        return false;
      } finally {
        setSavingConversation(
          false
        );
      }
    };

  // =========================================
  // GENERATE AI EMAIL
  // =========================================

  const generateFollowUpEmail =
    async () => {
      setAiMessage("");

      if (!leadId) {
        setAiMessage(
          "Lead ID is missing."
        );

        return;
      }

      if (!conversation.trim()) {
        setAiMessage(
          "Please enter your conversation notes first."
        );

        return;
      }

      try {
        setGeneratingEmail(true);

        // =====================================
        // SAVE LATEST NOTES FIRST
        // =====================================

        const saved =
          await saveConversation();

        if (!saved) {
          setAiMessage(
            "Please save the conversation before generating the email."
          );

          return;
        }

        // =====================================
        // GENERATE EMAIL
        // =====================================

        const response =
          await fetch(
            "/api/generate-email",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                leadId,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to generate email."
          );
        }

        if (
          !data?.email?.subject ||
          !data?.email?.body
        ) {
          throw new Error(
            "AI returned an invalid email."
          );
        }

        // =====================================
        // SAVE EMAIL IN STATE
        // =====================================

        setGeneratedEmail(
          data.email
        );

        setEmailSubject(
          data.email.subject
        );

        setEmailBody(
          data.email.body
        );

        setAiMessage(
          "Follow-up email generated successfully."
        );
      } catch (error) {
        console.error(
          "GENERATE EMAIL ERROR:",
          error
        );

        setAiMessage(
          error instanceof Error
            ? error.message
            : "Unable to generate email."
        );
      } finally {
        setGeneratingEmail(false);
      }
    };

  // =========================================
  // CLOSE EMAIL PREVIEW
  // =========================================

  const closeEmailPreview =
    () => {
      if (sendingEmail) {
        return;
      }

      setGeneratedEmail(null);
      setEmailSubject("");
      setEmailBody("");
      setAiMessage("");
    };

  // =========================================
  // COPY EMAIL
  // =========================================

  const copyEmail =
    async () => {
      try {
        const text =
          `Subject: ${emailSubject}\n\n${emailBody}`;

        await navigator.clipboard.writeText(
          text
        );

        setAiMessage(
          "Email copied to clipboard."
        );

        window.setTimeout(() => {
          setAiMessage("");
        }, 2500);
      } catch (error) {
        console.error(
          "COPY EMAIL ERROR:",
          error
        );

        setAiMessage(
          "Unable to copy email."
        );
      }
    };

  // =========================================
  // GENERATE TWO-SIDED DIGITAL CARD PDF
  // =========================================

  const generateCardPdf =
    async (): Promise<string> => {
      const frontCard =
        frontCardRef.current;

      const backCard =
        backCardRef.current;

      if (
        !frontCard ||
        !backCard
      ) {
        throw new Error(
          "Digital card elements were not found."
        );
      }

      // =======================================
      // CARD SIZE
      // Standard business card size
      // =======================================

      const pdfWidth = 85.6;
      const pdfHeight = 53.8;

      // =======================================
      // CAPTURE FRONT
      // =======================================

      const frontImage =
        await toPng(
          frontCard,
          {
            pixelRatio: 3,

            cacheBust: true,

            backgroundColor:
              "#080808",

            style: {
              transform: "none",

              backfaceVisibility:
                "visible",
            },
          }
        );

      // =======================================
      // CAPTURE BACK
      // =======================================

      const backImage =
        await toPng(
          backCard,
          {
            pixelRatio: 3,

            cacheBust: true,

            backgroundColor:
              "#101010",

            style: {
              transform: "none",

              backfaceVisibility:
                "visible",
            },
          }
        );

      // =======================================
      // CREATE PDF
      // =======================================

      const pdf =
        new jsPDF({
          orientation:
            "landscape",

          unit: "mm",

          format: [
            pdfWidth,
            pdfHeight,
          ],

          compress: true,
        });

      // =======================================
      // PAGE 1 — FRONT
      // =======================================

      pdf.addImage(
        frontImage,
        "PNG",
        0,
        0,
        pdfWidth,
        pdfHeight,
        undefined,
        "FAST"
      );

      // =======================================
      // PAGE 2 — BACK
      // =======================================

      pdf.addPage([
        pdfWidth,
        pdfHeight,
      ]);

      pdf.addImage(
        backImage,
        "PNG",
        0,
        0,
        pdfWidth,
        pdfHeight,
        undefined,
        "FAST"
      );

      // =======================================
      // GET BASE64
      // =======================================

      const pdfDataUri =
        pdf.output(
          "datauristring"
        );

      const pdfBase64 =
        pdfDataUri.split(",")[1];

      if (!pdfBase64) {
        throw new Error(
          "Unable to create digital card PDF."
        );
      }

      return pdfBase64;
    };

  // =========================================
  // SEND EMAIL + CARD PDF
  // =========================================

  const sendEmail =
    async () => {
      setAiMessage("");

      if (!leadId) {
        setAiMessage(
          "Lead ID is missing."
        );

        return;
      }

      if (!emailSubject.trim()) {
        setAiMessage(
          "Email subject is required."
        );

        return;
      }

      if (!emailBody.trim()) {
        setAiMessage(
          "Email body is required."
        );

        return;
      }

      try {
        setSendingEmail(true);

        // =====================================
        // STEP 1
        // GENERATE PDF
        // =====================================

        setAiMessage(
          "Preparing your digital card..."
        );

        const cardPdf =
          await generateCardPdf();

        // =====================================
        // STEP 2
        // SEND EMAIL + PDF
        // =====================================

        setAiMessage(
          "Sending email and digital card..."
        );

        const response =
          await fetch(
            "/api/send-email",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                leadId,

                subject:
                  emailSubject.trim(),

                body:
                  emailBody.trim(),

                cardPdf,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to send email."
          );
        }

        // =====================================
        // SUCCESS
        // =====================================

        setAiMessage(
          "Email and digital card sent successfully."
        );

        window.setTimeout(() => {
          setGeneratedEmail(null);
          setEmailSubject("");
          setEmailBody("");
          setAiMessage("");
        }, 2500);
      } catch (error) {
        console.error(
          "SEND EMAIL ERROR:",
          error
        );

        setAiMessage(
          error instanceof Error
            ? error.message
            : "Unable to send email."
        );
      } finally {
        setSendingEmail(false);
      }
    };

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="lead-page">

        <div className="loading-state">
          Loading lead...
        </div>

        <style jsx>{`

          .lead-page {
            min-height: 100vh;

            padding:
              50px 4vw;

            background: #050505;

            color: #f5f5f5;
          }

          .loading-state {
            max-width: 1400px;

            margin:
              120px auto;

            text-align: center;

            color: #777;

            font-size: 14px;
          }

        `}</style>

      </main>
    );
  }

  // =========================================
  // ERROR
  // =========================================

  if (error || !lead) {
    return (
      <main className="lead-page">

        <div className="error-state">

          <p className="eyebrow">
            LEAD DETAILS
          </p>

          <h1>
            {error ||
              "Lead not found."}
          </h1>

          <button
            type="button"
            onClick={() =>
              router.push("/leads")
            }
          >
            ← Back to Leads
          </button>

        </div>

        <style jsx>{`

          .lead-page {
            min-height: 100vh;

            padding:
              50px 4vw;

            background: #050505;

            color: #f5f5f5;
          }

          .error-state {
            max-width: 1400px;

            margin:
              120px auto;
          }

          .eyebrow {
            margin:
              0 0 15px;

            color: #8494a6;

            font-size: 10px;

            letter-spacing: 5px;

            font-weight: 600;
          }

          .error-state h1 {
            margin:
              0 0 30px;

            font-size: 42px;

            font-weight: 400;
          }

          .error-state button {
            min-height: 52px;

            padding:
              0 22px;

            border:
              1px solid #333;

            border-radius: 12px;

            background:
              transparent;

            color: #ddd;

            cursor: pointer;
          }

          .error-state button:hover {
            background: #111;
          }

        `}</style>

      </main>
    );
  }

  const meeting =
    getMeeting(lead);

  // =========================================
  // PAGE
  // =========================================

  return (
    <main className="lead-page">

      {/* =====================================
          HEADER
      ====================================== */}

      <header className="lead-header">

        <button
          type="button"
          className="back-button"
          onClick={() =>
            router.push("/leads")
          }
        >
          ← Back to Leads
        </button>

        <div className="header-content">

          <p className="eyebrow">
            LEAD DETAILS
          </p>

          <h1>
            {lead.name}
          </h1>

          <p className="header-email">
            {lead.email}
          </p>

        </div>

      </header>

      {/* =====================================
          LEAD INFORMATION
      ====================================== */}

      <section className="details-grid">

        <div className="detail-card">

          <span className="detail-label">
            NAME
          </span>

          <strong>
            {lead.name}
          </strong>

        </div>

        <div className="detail-card">

          <span className="detail-label">
            EMAIL
          </span>

          <strong>
            {lead.email}
          </strong>

        </div>

      </section>

      {/* =====================================
          MEETING
      ====================================== */}

      <section className="meeting-card">

        <p className="section-label">
          MEETING / EVENT
        </p>

        <h2>
          {meeting?.title ||
            "Meeting unavailable"}
        </h2>

        <p className="meeting-location">
          {meeting?.location ||
            "Location not specified"}
        </p>

        <div className="meeting-meta">

          <div>

            <span>
              MEETING DATE
            </span>

            <strong>
              {formatDate(
                meeting?.session_date
              )}
            </strong>

          </div>

          <div>

            <span>
              LEAD CAPTURED
            </span>

            <strong>
              {formatDateTime(
                lead.created_at
              )}
            </strong>

          </div>

        </div>

      </section>

      {/* =====================================
          CONVERSATION
      ====================================== */}

      <section className="conversation-card">

        <p className="section-label">
          NEXT STEP
        </p>

        <h2>
          Conversation
        </h2>

        <p className="conversation-description">
          Write down what you discussed
          with this person. These notes
          will be used by AI to create a
          personalized follow-up email.
        </p>

        {loadingConversation ? (
          <div className="conversation-loading">
            Loading conversation...
          </div>
        ) : (
          <textarea
            value={conversation}
            onChange={(event) => {
              setConversation(
                event.target.value
              );

              setConversationMessage(
                ""
              );

              setAiMessage("");
            }}
            placeholder="Example: Met at Indian Gifting Expo. He is interested in corporate uniforms and asked me to send the Hirmiverse catalogue next week."
            disabled={
              savingConversation ||
              generatingEmail ||
              sendingEmail
            }
          />
        )}

        {/* CONVERSATION MESSAGE */}

        {conversationMessage && (
          <div
            className={
              conversationMessage.includes(
                "successfully"
              )
                ? "conversation-success"
                : "conversation-error"
            }
          >
            {conversationMessage}
          </div>
        )}

        {/* AI MESSAGE */}

        {aiMessage && (
          <div
            className={
              aiMessage.includes(
                "successfully"
              ) ||
              aiMessage.includes(
                "copied"
              )
                ? "conversation-success"
                : "conversation-error"
            }
          >
            {aiMessage}
          </div>
        )}

        {/* ACTIONS */}

        <div className="conversation-actions">

          <button
            type="button"
            className="save-button"
            onClick={() => {
              void saveConversation();
            }}
            disabled={
              savingConversation ||
              generatingEmail ||
              sendingEmail ||
              loadingConversation
            }
          >
            {savingConversation
              ? "Saving..."
              : "Save Conversation"}
          </button>

          <button
            type="button"
            className="ai-button"
            onClick={() => {
              void generateFollowUpEmail();
            }}
            disabled={
              generatingEmail ||
              savingConversation ||
              sendingEmail ||
              loadingConversation ||
              !conversation.trim()
            }
          >
            {generatingEmail
              ? "Generating..."
              : "✦ Generate Follow-up Email"}
          </button>

        </div>

      </section>

      {/* =====================================
          HIDDEN DIGITAL CARD
          USED ONLY FOR PDF GENERATION
      ====================================== */}

      <div className="pdf-card-renderer">

        {/* ===================================
            FRONT
        =================================== */}

        <div
          ref={frontCardRef}
          className="pdf-card-face pdf-card-front"
        >

          <div className="pdf-card-top">

            <span className="pdf-card-initials">
              KP
            </span>

            <span className="pdf-card-small-text">
              DIGITAL CARD
            </span>

          </div>

          <div className="pdf-card-center">

            <p className="pdf-card-label">
              KRINSH PANCHAL
            </p>

            <h2>
              Founder &amp; Creative
            </h2>

          </div>

          <div className="pdf-card-bottom">

            <span>
              NOVASPACE
            </span>

            <span>
              HIRMIVERSE
            </span>

          </div>

        </div>

        {/* ===================================
            BACK
        =================================== */}

        <div
          ref={backCardRef}
          className="pdf-card-face pdf-card-back"
        >

          <div className="pdf-back-heading">

            <p className="pdf-back-label">
              LET&apos;S CONNECT
            </p>

            <h2>
              Krinsh Panchal
            </h2>

          </div>

          <div className="pdf-contact-details">

            <div className="pdf-contact-item">

              <Phone
                size={16}
                strokeWidth={1.6}
              />

              <span>
                +91 91575 79359
              </span>

            </div>

            <div className="pdf-contact-item">

              <Mail
                size={16}
                strokeWidth={1.6}
              />

              <span>
                krinsh0906@gmail.com
              </span>

            </div>

            <div className="pdf-contact-item">

              <Globe
                size={16}
                strokeWidth={1.6}
              />

              <span>
                krinshpanchal.in
              </span>

            </div>

            <div className="pdf-contact-item">

              <MapPin
                size={16}
                strokeWidth={1.6}
              />

              <span>
                Ahmedabad, Gujarat
              </span>

            </div>

          </div>

          <p className="pdf-flip-hint">
            Tap to flip back
          </p>

        </div>

      </div>

      {/* =====================================
          AI EMAIL PREVIEW MODAL
      ====================================== */}

      {generatedEmail && (
        <div
          className="email-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEmailPreview();
            }
          }}
        >

          <div className="email-modal">

            {/* ================================
                HEADER
            ================================= */}

            <div className="email-modal-header">

              <div>

                <p className="section-label">
                  AI FOLLOW-UP
                </p>

                <h2>
                  Review Email
                </h2>

              </div>

              <button
                type="button"
                className="email-close"
                onClick={
                  closeEmailPreview
                }
                disabled={
                  sendingEmail
                }
              >
                ×
              </button>

            </div>

            {/* ================================
                RECIPIENT
            ================================= */}

            <div className="recipient-box">

              <span>
                TO
              </span>

              <strong>
                {generatedEmail.recipient.name}
              </strong>

              <small>
                {generatedEmail.recipient.email}
              </small>

            </div>

            {/* ================================
                SUBJECT
            ================================= */}

            <div className="email-field">

              <label>
                SUBJECT
              </label>

              <input
                type="text"
                value={emailSubject}
                onChange={(event) =>
                  setEmailSubject(
                    event.target.value
                  )
                }
                disabled={
                  sendingEmail
                }
              />

            </div>

            {/* ================================
                BODY
            ================================= */}

            <div className="email-field">

              <label>
                EMAIL
              </label>

              <textarea
                value={emailBody}
                onChange={(event) =>
                  setEmailBody(
                    event.target.value
                  )
                }
                disabled={
                  sendingEmail
                }
              />

            </div>

            {/* ================================
                ATTACHMENT NOTICE
            ================================= */}

            <div className="attachment-notice">

              <span className="attachment-icon">
                📎
              </span>

              <div>

                <strong>
                  Digital Card
                </strong>

                <small>
                  A two-sided PDF of your
                  digital visiting card will
                  be attached automatically.
                </small>

              </div>

            </div>

            {/* ================================
                ACTIONS
            ================================= */}

            <div className="email-modal-actions">

              <button
                type="button"
                className="secondary-email-button"
                onClick={
                  closeEmailPreview
                }
                disabled={
                  sendingEmail
                }
              >
                Close
              </button>

              <button
                type="button"
                className="copy-email-button"
                onClick={() => {
                  void copyEmail();
                }}
                disabled={
                  sendingEmail
                }
              >
                Copy Email
              </button>

              <button
                type="button"
                className="send-email-button"
                onClick={() => {
                  void sendEmail();
                }}
                disabled={
                  sendingEmail ||
                  !emailSubject.trim() ||
                  !emailBody.trim()
                }
              >
                {sendingEmail
                  ? "Sending..."
                  : "Send Email"}
              </button>

            </div>

            {/* ================================
                MESSAGE
            ================================= */}

            {aiMessage && (
              <div
                className={
                  aiMessage.includes(
                    "successfully"
                  )
                    ? "modal-success"
                    : "modal-error"
                }
              >
                {aiMessage}
              </div>
            )}

            {/* ================================
                FOOTER
            ================================= */}

            <p className="email-next-step">
              Review and edit the email before
              sending. The email will be sent to{" "}
              {generatedEmail.recipient.email}
              {" "}with your two-sided digital
              card attached as a PDF.
            </p>

          </div>

        </div>
      )}

      {/* =====================================
          STYLES
      ====================================== */}

      <style jsx>{`

        /* =====================================
           PAGE
        ====================================== */

        .lead-page {
          min-height: 100vh;

          padding:
            48px 4vw 100px;

          background: #050505;

          color: #f5f5f5;

          box-sizing: border-box;
        }

        .lead-header,
        .details-grid,
        .meeting-card,
        .conversation-card {
          max-width: 1400px;

          margin-left: auto;

          margin-right: auto;
        }

        /* =====================================
           HEADER
        ====================================== */

        .lead-header {
          margin-bottom: 55px;
        }

        .back-button {
          margin-bottom: 55px;

          padding:
            12px 18px;

          border:
            1px solid #292929;

          border-radius: 10px;

          background:
            transparent;

          color: #aaa;

          font-size: 13px;

          cursor: pointer;

          transition:
            0.2s ease;
        }

        .back-button:hover {
          color: white;

          border-color: #555;

          background: #111;
        }

        .eyebrow,
        .section-label,
        .detail-label {
          margin: 0;

          color: #8494a6;

          font-size: 10px;

          letter-spacing: 5px;

          font-weight: 600;
        }

        .header-content h1 {
          margin:
            22px 0 10px;

          font-size:
            clamp(
              50px,
              7vw,
              82px
            );

          line-height: 0.95;

          font-weight: 400;

          letter-spacing: -4px;
        }

        .header-email {
          margin: 0;

          color: #777;

          font-size: 16px;
        }

        /* =====================================
           DETAILS
        ====================================== */

        .details-grid {
          display: grid;

          grid-template-columns:
            repeat(2, 1fr);

          gap: 22px;

          margin-bottom: 22px;
        }

        .detail-card {
          min-height: 110px;

          padding: 28px;

          border:
            1px solid #292929;

          border-radius: 20px;

          background: #080808;

          display: flex;

          flex-direction: column;

          justify-content: center;

          gap: 16px;

          box-sizing: border-box;
        }

        .detail-card strong {
          color: #eee;

          font-size: 17px;

          font-weight: 400;

          word-break:
            break-word;
        }

        /* =====================================
           MEETING
        ====================================== */

        .meeting-card {
          padding: 38px;

          border:
            1px solid #292929;

          border-radius: 22px;

          background: #080808;

          margin-bottom: 22px;

          box-sizing: border-box;
        }

        .meeting-card h2 {
          margin:
            25px 0 10px;

          font-size: 32px;

          font-weight: 400;

          letter-spacing: -1.5px;
        }

        .meeting-location {
          margin: 0;

          color: #777;

          font-size: 15px;
        }

        .meeting-meta {
          display: grid;

          grid-template-columns:
            repeat(2, 1fr);

          gap: 30px;

          margin-top: 35px;

          padding-top: 28px;

          border-top:
            1px solid #242424;
        }

        .meeting-meta div {
          display: flex;

          flex-direction: column;

          gap: 10px;
        }

        .meeting-meta span {
          color: #697585;

          font-size: 9px;

          letter-spacing: 4px;
        }

        .meeting-meta strong {
          color: #ccc;

          font-size: 14px;

          font-weight: 400;
        }

        /* =====================================
           CONVERSATION
        ====================================== */

        .conversation-card {
          padding: 38px;

          border:
            1px solid #292929;

          border-radius: 22px;

          background: #080808;

          box-sizing: border-box;
        }

        .conversation-card h2 {
          margin:
            25px 0 10px;

          font-size: 32px;

          font-weight: 400;

          letter-spacing: -1.5px;
        }

        .conversation-description {
          margin:
            0 0 25px;

          color: #777;

          font-size: 14px;

          line-height: 1.6;

          max-width: 720px;
        }

        .conversation-card textarea {
          width: 100%;

          min-height: 210px;

          padding: 18px;

          border:
            1px solid #303030;

          border-radius: 14px;

          background: #050505;

          color: #eee;

          font-family: inherit;

          font-size: 15px;

          line-height: 1.6;

          resize: vertical;

          outline: none;

          box-sizing: border-box;

          transition:
            0.2s ease;
        }

        .conversation-card textarea:focus {
          border-color: #666;
        }

        .conversation-card textarea::placeholder {
          color: #555;
        }

        .conversation-loading {
          min-height: 210px;

          display: flex;

          align-items: center;

          justify-content: center;

          border:
            1px solid #292929;

          border-radius: 14px;

          color: #666;

          font-size: 14px;
        }

        /* =====================================
           MESSAGES
        ====================================== */

        .conversation-success,
        .conversation-error {
          margin-top: 15px;

          padding:
            14px 16px;

          border-radius: 11px;

          font-size: 13px;
        }

        .conversation-success {
          border:
            1px solid
            rgba(
              60,
              220,
              140,
              0.3
            );

          background:
            rgba(
              30,
              100,
              65,
              0.08
            );

          color: #68e5a4;
        }

        .conversation-error {
          border:
            1px solid
            rgba(
              255,
              80,
              80,
              0.3
            );

          background:
            rgba(
              120,
              30,
              30,
              0.08
            );

          color: #ff7777;
        }

        /* =====================================
           ACTIONS
        ====================================== */

        .conversation-actions {
          display: flex;

          align-items: center;

          gap: 12px;

          margin-top: 20px;
        }

        .save-button,
        .ai-button {
          min-height: 52px;

          padding:
            0 22px;

          border-radius: 11px;

          font-size: 14px;

          font-weight: 600;

          transition:
            0.2s ease;
        }

        .save-button {
          border: 0;

          background: #f4f4f4;

          color: #050505;

          cursor: pointer;
        }

        .save-button:hover {
          background: white;

          transform:
            translateY(-1px);
        }

        .save-button:disabled {
          opacity: 0.45;

          cursor:
            not-allowed;

          transform: none;
        }

        .ai-button {
          border:
            1px solid #555;

          background: #111;

          color: #ddd;

          cursor: pointer;
        }

        .ai-button:hover:not(:disabled) {
          border-color: #777;

          background: #181818;

          color: white;

          transform:
            translateY(-1px);
        }

        .ai-button:disabled {
          opacity: 0.45;

          cursor:
            not-allowed;

          transform: none;
        }

        /* =====================================
           HIDDEN PDF CARD
        ====================================== */

        .pdf-card-renderer {
          position: fixed;

          left: -10000px;

          top: 0;

          width: 390px;

          height: 245px;

          pointer-events: none;

          opacity: 1;

          z-index: -1;
        }

        .pdf-card-face {
          position: absolute;

          inset: 0;

          width: 390px;

          height: 245px;

          overflow: hidden;

          border-radius: 22px;

          box-sizing: border-box;

          font-family:
            Arial,
            Helvetica,
            sans-serif;

          color: white;
        }

        /* =====================================
           PDF FRONT
        ====================================== */

        .pdf-card-front {
          background:
            linear-gradient(
              135deg,
              #181818,
              #050505
            );

          border:
            1px solid #333;

          padding: 25px;

          display: flex;

          flex-direction: column;

          justify-content:
            space-between;
        }

        .pdf-card-top,
        .pdf-card-bottom {
          display: flex;

          justify-content:
            space-between;

          align-items: center;
        }

        .pdf-card-initials {
          font-size: 24px;

          font-weight: 700;

          letter-spacing: -2px;
        }

        .pdf-card-small-text {
          font-size: 8px;

          letter-spacing: 3px;

          color: #777;
        }

        .pdf-card-center {
          text-align: left;
        }

        .pdf-card-label {
          margin:
            0 0 7px;

          font-size: 10px;

          letter-spacing: 3px;

          color: #888;
        }

        .pdf-card-center h2 {
          margin: 0;

          font-size: 27px;

          font-weight: 500;

          letter-spacing: -1px;
        }

        .pdf-card-bottom {
          font-size: 9px;

          letter-spacing: 2px;

          color: #888;
        }

        /* =====================================
           PDF BACK
        ====================================== */

        .pdf-card-back {
          background:
            linear-gradient(
              135deg,
              #101010,
              #1b1b1b
            );

          border:
            1px solid #333;

          padding: 25px;

          display: flex;

          flex-direction: column;

          justify-content:
            flex-start;
        }

        .pdf-back-heading {
          display: flex;

          flex-direction: column;

          gap: 7px;

          flex-shrink: 0;
        }

        .pdf-back-label {
          margin: 0;

          font-size: 9px;

          line-height: 1.2;

          letter-spacing: 3px;

          color: #777;
        }

        .pdf-card-back h2 {
          margin: 0;

          font-size: 25px;

          line-height: 1.2;

          font-weight: 500;
        }

        .pdf-contact-details {
          display: flex;

          flex-direction: column;

          gap: 10px;

          margin-top: 20px;

          flex-shrink: 0;
        }

        .pdf-contact-item {
          display: flex;

          align-items: center;

          gap: 11px;

          min-height: 20px;

          color:
            rgba(
              255,
              255,
              255,
              0.68
            );

          font-size: 13px;

          line-height: 1.2;
        }

        .pdf-contact-item svg {
          width: 16px;

          height: 16px;

          flex-shrink: 0;

          color:
            rgba(
              255,
              255,
              255,
              0.65
            );
        }

        .pdf-flip-hint {
          margin:
            auto 0 0;

          padding-top: 8px;

          font-size: 10px;

          line-height: 1;

          letter-spacing: 0.04em;

          color:
            rgba(
              255,
              255,
              255,
              0.28
            );
        }

        /* =====================================
           EMAIL MODAL
        ====================================== */

        .email-modal-backdrop {
          position: fixed;

          inset: 0;

          z-index: 3000;

          display: flex;

          align-items: center;

          justify-content: center;

          padding: 24px;

          background:
            rgba(
              0,
              0,
              0,
              0.82
            );

          backdrop-filter:
            blur(10px);

          -webkit-backdrop-filter:
            blur(10px);

          box-sizing: border-box;
        }

        .email-modal {
          width: 100%;

          max-width: 780px;

          max-height: 90vh;

          overflow-y: auto;

          padding: 34px;

          border:
            1px solid #333;

          border-radius: 22px;

          background: #0d0d0d;

          box-shadow:
            0 30px 100px
            rgba(
              0,
              0,
              0,
              0.75
            );

          box-sizing: border-box;
        }

        /* =====================================
           MODAL HEADER
        ====================================== */

        .email-modal-header {
          display: flex;

          align-items:
            flex-start;

          justify-content:
            space-between;

          margin-bottom: 30px;
        }

        .email-modal-header h2 {
          margin:
            20px 0 0;

          font-size: 32px;

          font-weight: 400;

          letter-spacing: -1.5px;
        }

        .email-close {
          width: 42px;

          height: 42px;

          border:
            1px solid #292929;

          border-radius: 11px;

          background:
            transparent;

          color: #aaa;

          font-size: 24px;

          cursor: pointer;

          transition:
            0.2s ease;
        }

        .email-close:hover:not(:disabled) {
          background: #171717;

          color: white;
        }

        .email-close:disabled {
          opacity: 0.35;

          cursor:
            not-allowed;
        }

        /* =====================================
           RECIPIENT
        ====================================== */

        .recipient-box {
          display: flex;

          flex-direction: column;

          gap: 7px;

          padding: 18px;

          margin-bottom: 22px;

          border:
            1px solid #252525;

          border-radius: 13px;

          background: #090909;
        }

        .recipient-box span {
          color: #697585;

          font-size: 9px;

          letter-spacing: 4px;
        }

        .recipient-box strong {
          color: #eee;

          font-size: 15px;

          font-weight: 500;
        }

        .recipient-box small {
          color: #777;

          font-size: 13px;

          word-break:
            break-word;
        }

        /* =====================================
           EMAIL FIELDS
        ====================================== */

        .email-field {
          display: flex;

          flex-direction: column;

          gap: 10px;

          margin-bottom: 20px;
        }

        .email-field label {
          color: #8494a6;

          font-size: 9px;

          letter-spacing: 4px;

          font-weight: 600;
        }

        .email-field input,
        .email-field textarea {
          width: 100%;

          border:
            1px solid #303030;

          border-radius: 13px;

          background: #050505;

          color: #eee;

          font-family: inherit;

          font-size: 15px;

          outline: none;

          box-sizing: border-box;

          transition:
            0.2s ease;
        }

        .email-field input {
          min-height: 52px;

          padding:
            0 16px;
        }

        .email-field textarea {
          min-height: 280px;

          padding: 17px;

          line-height: 1.65;

          resize: vertical;
        }

        .email-field input:focus,
        .email-field textarea:focus {
          border-color: #666;
        }

        .email-field input:disabled,
        .email-field textarea:disabled {
          opacity: 0.55;

          cursor:
            not-allowed;
        }

        /* =====================================
           ATTACHMENT NOTICE
        ====================================== */

        .attachment-notice {
          display: flex;

          align-items: center;

          gap: 13px;

          margin-top: 4px;

          padding: 14px 16px;

          border:
            1px solid #292929;

          border-radius: 12px;

          background: #090909;
        }

        .attachment-icon {
          display: flex;

          align-items: center;

          justify-content: center;

          width: 36px;

          height: 36px;

          border-radius: 9px;

          background: #151515;

          font-size: 16px;
        }

        .attachment-notice div {
          display: flex;

          flex-direction: column;

          gap: 4px;

          min-width: 0;
        }

        .attachment-notice strong {
          color: #ddd;

          font-size: 13px;

          font-weight: 500;
        }

        .attachment-notice small {
          color: #666;

          font-size: 11px;

          line-height: 1.4;
        }

        /* =====================================
           MODAL ACTIONS
        ====================================== */

        .email-modal-actions {
          display: flex;

          justify-content:
            flex-end;

          gap: 10px;

          margin-top: 25px;
        }

        .secondary-email-button,
        .copy-email-button,
        .send-email-button {
          min-height: 50px;

          padding:
            0 20px;

          border-radius: 11px;

          font-size: 13px;

          font-weight: 600;

          cursor: pointer;

          transition:
            0.2s ease;
        }

        /* CLOSE */

        .secondary-email-button {
          border:
            1px solid #303030;

          background:
            transparent;

          color: #aaa;
        }

        .secondary-email-button:hover:not(:disabled) {
          border-color: #555;

          background: #151515;

          color: white;
        }

        /* COPY */

        .copy-email-button {
          border:
            1px solid #444;

          background: #151515;

          color: #ddd;
        }

        .copy-email-button:hover:not(:disabled) {
          background: #1d1d1d;

          border-color: #666;

          color: white;
        }

        /* SEND */

        .send-email-button {
          border: 0;

          background: #f4f4f4;

          color: #050505;
        }

        .send-email-button:hover:not(:disabled) {
          background: white;

          transform:
            translateY(-1px);
        }

        .send-email-button:disabled,
        .secondary-email-button:disabled,
        .copy-email-button:disabled {
          opacity: 0.35;

          cursor:
            not-allowed;

          transform: none;
        }

        /* =====================================
           MODAL MESSAGES
        ====================================== */

        .modal-success,
        .modal-error {
          margin-top: 18px;

          padding:
            14px 16px;

          border-radius: 11px;

          font-size: 13px;

          line-height: 1.5;
        }

        .modal-success {
          border:
            1px solid
            rgba(
              60,
              220,
              140,
              0.3
            );

          background:
            rgba(
              30,
              100,
              65,
              0.08
            );

          color: #68e5a4;
        }

        .modal-error {
          border:
            1px solid
            rgba(
              255,
              80,
              80,
              0.3
            );

          background:
            rgba(
              120,
              30,
              30,
              0.08
            );

          color: #ff7777;
        }

        /* =====================================
           FOOTER
        ====================================== */

        .email-next-step {
          margin:
            18px 0 0;

          color: #666;

          font-size: 12px;

          line-height: 1.5;

          text-align: right;

          word-break:
            break-word;
        }

        /* =====================================
           MOBILE
        ====================================== */

        @media (max-width: 700px) {

          .lead-page {
            padding:
              30px 18px 70px;
          }

          .header-content h1 {
            font-size: 52px;

            letter-spacing: -3px;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .meeting-card,
          .conversation-card {
            padding:
              26px 20px;
          }

          .meeting-meta {
            grid-template-columns: 1fr;
          }

          .conversation-actions {
            flex-direction: column;

            align-items: stretch;
          }

          .save-button,
          .ai-button {
            width: 100%;
          }

          .email-modal-backdrop {
            padding: 12px;
          }

          .email-modal {
            padding:
              24px 20px;

            max-height: 94vh;

            border-radius: 18px;
          }

          .email-modal-header h2 {
            font-size: 28px;
          }

          .email-modal-actions {
            flex-direction: column;
          }

          .secondary-email-button,
          .copy-email-button,
          .send-email-button {
            width: 100%;
          }

          .email-next-step {
            text-align: center;
          }

        }

      `}</style>

    </main>
  );
}
