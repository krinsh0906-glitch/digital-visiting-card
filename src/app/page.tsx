"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  MouseEvent,
} from "react";

import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

import {
  Phone,
  Mail,
  Globe,
  MapPin,
} from "lucide-react";

export default function Home() {
  // =========================================
  // CARD STATE
  // =========================================

  const [flipped, setFlipped] =
    useState(false);

  // =========================================
  // DOWNLOAD MODAL
  // =========================================

  const [showEmail, setShowEmail] =
    useState(false);

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  // =========================================
  // QR / MEETING SESSION
  // =========================================

  const [sessionCode, setSessionCode] =
    useState("");

  // =========================================
  // CARD REFERENCES
  // =========================================

  const frontCardRef =
    useRef<HTMLDivElement | null>(null);

  const backCardRef =
    useRef<HTMLDivElement | null>(null);

  // =========================================
  // READ SESSION CODE FROM QR URL
  // =========================================

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const session =
      params.get("session");

    if (session) {
      setSessionCode(
        session.trim()
      );
    }
  }, []);

  // =========================================
  // DOWNLOAD + GENERATE TWO-SIDED PDF
  // RETURNS BASE64 PDF FOR EMAIL
  // =========================================

  const downloadCard =
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
          "Card elements not found."
        );
      }

      // =======================================
      // CARD SIZE
      // =======================================

      const pdfWidth = 85.6;
      const pdfHeight = 53.8;

      // =======================================
      // CAPTURE FRONT
      // =======================================

      const frontImage =
        await toPng(frontCard, {
          pixelRatio: 3,
          cacheBust: true,
          backgroundColor: "#080808",

          style: {
            transform: "none",
            backfaceVisibility:
              "visible",
          },
        });

      // =======================================
      // CAPTURE BACK
      // =======================================

      const backImage =
        await toPng(backCard, {
          pixelRatio: 3,
          cacheBust: true,
          backgroundColor: "#101010",

          style: {
            transform: "none",
            backfaceVisibility:
              "visible",
          },
        });

      // =======================================
      // CREATE PDF
      // =======================================

      const pdf =
        new jsPDF({
          orientation: "landscape",
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
      // CREATE PDF BLOB
      // =======================================

      const pdfBlob =
        pdf.output("blob");

      // =======================================
      // DOWNLOAD PDF
      // =======================================

      const blobUrl =
        URL.createObjectURL(
          pdfBlob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = blobUrl;

      link.download =
        "Krinsh-Panchal-Digital-Card.pdf";

      link.style.display =
        "none";

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      setTimeout(() => {
        URL.revokeObjectURL(
          blobUrl
        );
      }, 2000);

      // =======================================
      // GET SAME PDF AS BASE64
      // =======================================

      const pdfDataUri =
        pdf.output(
          "datauristring"
        );

      const pdfBase64 =
        pdfDataUri.split(",")[1];

      if (!pdfBase64) {
        throw new Error(
          "Unable to create PDF data."
        );
      }

      return pdfBase64;
    };

  // =========================================
  // SAVE LEAD
  // =========================================

  const saveLead = async (
    visitorName: string,
    visitorEmail: string
  ) => {
    try {
      const response =
        await fetch(
          "/api/leads",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name: visitorName,
              email: visitorEmail,
              sessionCode:
                sessionCode || "",
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        "LEAD API RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to save lead."
        );
      }

      console.log(
        "Lead saved successfully."
      );

      return true;
    } catch (error) {
      console.error(
        "SAVE LEAD ERROR:",
        error
      );

      return false;
    }
  };

  // =========================================
  // SEND SAME PDF BY EMAIL
  // =========================================

  const sendEmailInBackground =
    async (
      userEmail: string,
      pdfBase64: string
    ) => {
      try {
        const response =
          await fetch(
            "/api/send-card",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                email: userEmail,
                cardPdf:
                  pdfBase64,
              }),
            }
          );

        const data =
          await response.json();

        console.log(
          "EMAIL API RESPONSE:",
          data
        );

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to send email."
          );
        }

        console.log(
          "Email request successful."
        );
      } catch (error) {
        console.error(
          "BACKGROUND EMAIL ERROR:",
          error
        );
      }
    };

  // =========================================
  // DOWNLOAD + SAVE LEAD + EMAIL
  // =========================================

  const handleDownload =
    async () => {
      setMessage("");

      const cleanName =
        name.trim();

      const cleanEmail =
        email.trim();

      // =======================================
      // VALIDATE NAME
      // =======================================

      if (!cleanName) {
        setMessage(
          "Please enter your name."
        );

        return;
      }

      // =======================================
      // VALIDATE EMAIL
      // =======================================

      if (!cleanEmail) {
        setMessage(
          "Please enter your email address."
        );

        return;
      }

      if (
        !cleanEmail.includes(
          "@"
        ) ||
        !cleanEmail.includes(
          "."
        )
      ) {
        setMessage(
          "Please enter a valid email address."
        );

        return;
      }

      try {
        setSubmitting(true);

        // =====================================
        // GENERATE + DOWNLOAD PDF
        // =====================================

        const pdfBase64 =
          await downloadCard();

        // =====================================
        // SAVE LEAD
        // =====================================

        await saveLead(
          cleanName,
          cleanEmail
        );

        // =====================================
        // CLOSE MODAL
        // =====================================

        setShowEmail(false);

        // =====================================
        // CLEAR FORM
        // =====================================

        setName("");
        setEmail("");

        // =====================================
        // SHOW SUCCESS
        // =====================================

        setMessage(
          "Card downloaded. Email is being sent..."
        );

        // =====================================
        // SEND CARD EMAIL
        // =====================================

        void sendEmailInBackground(
          cleanEmail,
          pdfBase64
        );
      } catch (error) {
        console.error(
          "CARD DOWNLOAD ERROR:",
          error
        );

        setMessage(
          "Unable to download the card. Please try again."
        );
      } finally {
        setSubmitting(false);
      }
    };

  // =========================================
  // CARD FLIP
  // =========================================

  const handleCardClick = (
    event: MouseEvent<HTMLDivElement>
  ) => {
    const target =
      event.target as HTMLElement;

    // Don't flip when clicking
    // phone/email/website/location links.
    if (
      target.closest("a")
    ) {
      return;
    }

    setFlipped(
      (previous) => !previous
    );
  };

  // =========================================
  // OPEN DOWNLOAD MODAL
  // =========================================

  const openDownloadModal =
    () => {
      setMessage("");
      setShowEmail(true);
    };

  // =========================================
  // CLOSE DOWNLOAD MODAL
  // =========================================

  const closeDownloadModal =
    () => {
      if (submitting) {
        return;
      }

      setShowEmail(false);
      setMessage("");
    };

  // =========================================
  // RENDER
  // =========================================

  return (
    <main className="card-page">

      {/* =====================================
          INTRO
      ====================================== */}

      <section className="intro">

        <div className="hello-icon">
          👋
        </div>

        <p className="eyebrow">
          GREAT MEETING YOU
        </p>

        <h1>
          I&apos;m Krinsh Panchal
        </h1>

        <p className="intro-description">
          Here&apos;s my digital visiting card.
          <br />
          Tap the card to explore.
        </p>

      </section>

      {/* =====================================
          DIGITAL CARD
      ====================================== */}

      <section className="card-wrapper">

        <div
          className={`business-card ${
            flipped
              ? "flipped"
              : ""
          }`}
          onClick={
            handleCardClick
          }
        >

          {/* =================================
              FRONT
          ================================= */}

          <div
            ref={
              frontCardRef
            }
            className="card-face card-front"
          >

            <div className="card-top">

              <span className="card-initials">
                KP
              </span>

              <span className="card-small-text">
                DIGITAL CARD
              </span>

            </div>

            <div className="card-center">

              <p className="card-label">
                KRINSH PANCHAL
              </p>

              <h2>
                Founder &amp; Creative
              </h2>

            </div>

            <div className="card-bottom">

              <span>
                NOVASPACE
              </span>

              <span>
                HIRMIVERSE
              </span>

            </div>

          </div>

          {/* =================================
              BACK
          ================================= */}

          <div
            ref={
              backCardRef
            }
            className="card-face card-back"
          >

            <div className="back-heading">

              <p className="back-label">
                LET&apos;S CONNECT
              </p>

              <h2>
                Krinsh Panchal
              </h2>

            </div>

            {/* CONTACT DETAILS */}

            <div className="contact-details">

              {/* PHONE */}

              <a
                href="tel:+919157579359"
                className="contact-item"
                onClick={(
                  event
                ) => {
                  event.stopPropagation();
                }}
              >

                <Phone
                  size={16}
                  strokeWidth={1.6}
                />

                <span>
                  +91 91575 79359
                </span>

              </a>

              {/* EMAIL */}

              <a
                href="mailto:krinsh0906@gmail.com"
                className="contact-item"
                onClick={(
                  event
                ) => {
                  event.stopPropagation();
                }}
              >

                <Mail
                  size={16}
                  strokeWidth={1.6}
                />

                <span>
                  krinsh0906@gmail.com
                </span>

              </a>

              {/* WEBSITE */}

              <a
                href="https://krinshpanchal.in"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-item"
                onClick={(
                  event
                ) => {
                  event.stopPropagation();
                }}
              >

                <Globe
                  size={16}
                  strokeWidth={1.6}
                />

                <span>
                  krinshpanchal.in
                </span>

              </a>

              {/* LOCATION */}

              <a
                href="https://www.google.com/maps/search/?api=1&query=Ahmedabad%2C%20Gujarat"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-item"
                onClick={(
                  event
                ) => {
                  event.stopPropagation();
                }}
              >

                <MapPin
                  size={16}
                  strokeWidth={1.6}
                />

                <span>
                  Ahmedabad, Gujarat
                </span>

              </a>

            </div>

            {/* FLIP HINT */}

            <p className="flip-hint">
              Tap to flip back
            </p>

          </div>

        </div>

      </section>

      {/* =====================================
          DOWNLOAD BUTTON
      ====================================== */}

      <button
        type="button"
        className="download-button"
        onClick={
          openDownloadModal
        }
      >

        <span>
          ↓
        </span>

        Download My Card

      </button>

      {/* =====================================
          SUCCESS MESSAGE
      ====================================== */}

      {message &&
        !showEmail && (
          <div className="success-message">
            {message}
          </div>
        )}

      {/* =====================================
          NAME + EMAIL MODAL
      ====================================== */}

      {showEmail && (

        <div
          className="modal-overlay"
          onClick={
            closeDownloadModal
          }
        >

          <div
            className="email-modal"
            onClick={(
              event
            ) => {
              event.stopPropagation();
            }}
          >

            {/* CLOSE */}

            <button
              type="button"
              className="close-button"
              onClick={
                closeDownloadModal
              }
              disabled={
                submitting
              }
            >
              ×
            </button>

            {/* ICON */}

            <div className="modal-icon">
              ✉️
            </div>

            {/* TITLE */}

            <h2>
              Get my card
            </h2>

            {/* DESCRIPTION */}

            <p>
              Enter your name and email
              and I&apos;ll send you my
              digital card.
            </p>

            {/* NAME */}

            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(
                event
              ) => {
                setName(
                  event.target.value
                );

                setMessage("");
              }}
              disabled={
                submitting
              }
              autoComplete="name"
              autoFocus
            />

            {/* EMAIL */}

            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(
                event
              ) => {
                setEmail(
                  event.target.value
                );

                setMessage("");
              }}
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  event.preventDefault();

                  void handleDownload();
                }
              }}
              disabled={
                submitting
              }
              inputMode="email"
              autoComplete="email"
            />

            {/* ERROR */}

            {message && (
              <div className="error-message">
                {message}
              </div>
            )}

            {/* BUTTON */}

            <button
              type="button"
              className="send-button"
              onClick={() => {
                void handleDownload();
              }}
              disabled={
                submitting
              }
            >
              {submitting
                ? "Preparing Card..."
                : "Download & Send Card"}
            </button>

            {/* PRIVACY */}

            <p className="privacy-text">
              Your name and email are only
              used to send my card.
            </p>

          </div>

        </div>

      )}

    </main>
  );
}