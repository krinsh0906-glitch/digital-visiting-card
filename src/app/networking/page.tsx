"use client";

import { useEffect, useRef, useState } from "react";

type Meeting = {
  id: string;
  title: string;
  location: string | null;
  session_date: string;
  session_code: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

// ============================================
// DATE HELPERS
// ============================================

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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

// ============================================
// SAFE JSON
// ============================================

async function readJson(
  response: Response
) {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// ============================================
// PAGE
// ============================================

export default function NetworkingPage() {
  const createSectionRef =
    useRef<HTMLElement | null>(null);

  // =========================================
  // MEETINGS
  // =========================================

  const [meetings, setMeetings] =
    useState<Meeting[]>([]);

  const [loading, setLoading] =
    useState(true);

  // =========================================
  // CREATE
  // =========================================

  const [creating, setCreating] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [sessionDate, setSessionDate] =
    useState(getTodayDate());

  // =========================================
  // EDIT
  // =========================================

  const [editingMeeting, setEditingMeeting] =
    useState<Meeting | null>(null);

  const [editTitle, setEditTitle] =
    useState("");

  const [editLocation, setEditLocation] =
    useState("");

  const [editSessionDate, setEditSessionDate] =
    useState(getTodayDate());

  const [savingEdit, setSavingEdit] =
    useState(false);

  // =========================================
  // MENU
  // =========================================

  const [openMenuId, setOpenMenuId] =
    useState<string | null>(null);

  // =========================================
  // DELETE
  // =========================================

  const [deleteTarget, setDeleteTarget] =
    useState<Meeting | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  // =========================================
  // MESSAGES
  // =========================================

  const [formMessage, setFormMessage] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const [toastMessage, setToastMessage] =
    useState("");

  const [toastType, setToastType] =
    useState<"success" | "error">(
      "success"
    );

  // =========================================
  // TOAST
  // =========================================

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToastMessage(message);
    setToastType(type);

    window.setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  // =========================================
  // LOAD MEETINGS
  // =========================================

  const loadMeetings = async () => {
    try {
      setLoading(true);
      setFormError("");

      const response = await fetch(
        "/api/meetings",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data =
        await readJson(response);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load meetings."
        );
      }

      setMeetings(
        Array.isArray(data?.meetings)
          ? data.meetings
          : []
      );
    } catch (error) {
      console.error(
        "LOAD MEETINGS ERROR:",
        error
      );

      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to load meetings."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMeetings();
  }, []);

  // =========================================
  // SCROLL TO CREATE
  // =========================================

  const scrollToCreate = () => {
    createSectionRef.current?.scrollIntoView(
      {
        behavior: "smooth",
        block: "start",
      }
    );

    window.setTimeout(() => {
      const input =
        document.getElementById(
          "meeting-title"
        );

      input?.focus();
    }, 500);
  };

  // =========================================
  // CREATE MEETING
  // =========================================

  const createMeeting = async () => {
    setFormMessage("");
    setFormError("");

    if (!title.trim()) {
      setFormError(
        "Please enter a meeting or event name."
      );
      return;
    }

    if (!location.trim()) {
      setFormError(
        "Please enter the location."
      );
      return;
    }

    if (!sessionDate) {
      setFormError(
        "Please select the meeting date."
      );
      return;
    }

    try {
      setCreating(true);

      const response = await fetch(
        "/api/meetings",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            title: title.trim(),
            location: location.trim(),
            sessionDate,
          }),
        }
      );

      const data =
        await readJson(response);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to create meeting."
        );
      }

      setTitle("");
      setLocation("");
      setSessionDate(
        getTodayDate()
      );

      await loadMeetings();

      setFormMessage(
        "Meeting created successfully."
      );

      window.setTimeout(() => {
        setFormMessage("");
      }, 3000);
    } catch (error) {
      console.error(
        "CREATE MEETING ERROR:",
        error
      );

      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to create meeting."
      );
    } finally {
      setCreating(false);
    }
  };

  // =========================================
  // OPEN EDIT
  // =========================================

  const openEdit = (
    meeting: Meeting
  ) => {
    // Closed meetings are read-only.
    if (!meeting.is_active) {
      return;
    }

    setOpenMenuId(null);

    setEditingMeeting(meeting);

    setEditTitle(
      meeting.title
    );

    setEditLocation(
      meeting.location || ""
    );

    setEditSessionDate(
      meeting.session_date ||
        getTodayDate()
    );
  };

  // =========================================
  // CLOSE EDIT
  // =========================================

  const closeEdit = () => {
    if (savingEdit) {
      return;
    }

    setEditingMeeting(null);

    setEditTitle("");

    setEditLocation("");

    setEditSessionDate(
      getTodayDate()
    );
  };

  // =========================================
  // SAVE EDIT
  // =========================================

  const saveEdit = async () => {
    if (!editingMeeting) {
      return;
    }

    // Extra protection:
    // closed meetings cannot be edited.
    if (!editingMeeting.is_active) {
      closeEdit();

      showToast(
        "Closed meetings cannot be edited.",
        "error"
      );

      return;
    }

    if (!editTitle.trim()) {
      showToast(
        "Meeting name is required.",
        "error"
      );
      return;
    }

    if (!editLocation.trim()) {
      showToast(
        "Location is required.",
        "error"
      );
      return;
    }

    if (!editSessionDate) {
      showToast(
        "Meeting date is required.",
        "error"
      );
      return;
    }

    try {
      setSavingEdit(true);

      const response = await fetch(
        `/api/meetings?id=${encodeURIComponent(
          editingMeeting.id
        )}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            title:
              editTitle.trim(),

            location:
              editLocation.trim(),

            sessionDate:
              editSessionDate,
          }),
        }
      );

      const data =
        await readJson(response);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to update meeting."
        );
      }

      setEditingMeeting(null);

      setEditTitle("");

      setEditLocation("");

      setEditSessionDate(
        getTodayDate()
      );

      await loadMeetings();

      showToast(
        "Meeting updated successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "UPDATE MEETING ERROR:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Unable to update meeting.",
        "error"
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // =========================================
  // ASK DELETE
  // =========================================

  const askDelete = (
    meeting: Meeting
  ) => {
    // NEVER allow delete for closed meetings.
    if (!meeting.is_active) {
      return;
    }

    setOpenMenuId(null);

    setDeleteTarget(meeting);
  };

  // =========================================
  // DELETE MEETING
  // =========================================

  const deleteMeeting = async () => {
    if (!deleteTarget) {
      return;
    }

    // Extra frontend protection.
    if (!deleteTarget.is_active) {
      setDeleteTarget(null);

      showToast(
        "Closed meetings cannot be deleted.",
        "error"
      );

      return;
    }

    try {
      setDeletingId(
        deleteTarget.id
      );

      const response = await fetch(
        `/api/meetings?id=${encodeURIComponent(
          deleteTarget.id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await readJson(response);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to delete meeting."
        );
      }

      const deletedTitle =
        deleteTarget.title;

      setDeleteTarget(null);

      await loadMeetings();

      showToast(
        `"${deletedTitle}" deleted successfully.`,
        "success"
      );
    } catch (error) {
      console.error(
        "DELETE MEETING ERROR:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Unable to delete meeting.",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================
  // MEETING URL
  // =========================================

  const getMeetingUrl = (
    sessionCode: string
  ) => {
    if (
      typeof window ===
      "undefined"
    ) {
      return "";
    }

    return `${window.location.origin}/?session=${encodeURIComponent(
      sessionCode
    )}`;
  };

  // =========================================
  // QR
  // =========================================

  const openQR = (
    sessionCode: string
  ) => {
    const meetingUrl =
      getMeetingUrl(sessionCode);

    if (!meetingUrl) {
      return;
    }

    const qrUrl =
      `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
        meetingUrl
      )}`;

    window.open(
      qrUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =========================================
  // COPY LINK
  // =========================================

  const copyMeetingLink = async (
    sessionCode: string
  ) => {
    const url =
      getMeetingUrl(sessionCode);

    if (!url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        url
      );

      setOpenMenuId(null);

      showToast(
        "Meeting link copied.",
        "success"
      );
    } catch (error) {
      console.error(
        "COPY LINK ERROR:",
        error
      );

      showToast(
        "Unable to copy the link.",
        "error"
      );
    }
  };

  // =========================================
  // CLOSE MENUS OUTSIDE
  // =========================================

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenuId(null);
    };

    if (openMenuId) {
      document.addEventListener(
        "click",
        handleOutsideClick
      );
    }

    return () => {
      document.removeEventListener(
        "click",
        handleOutsideClick
      );
    };
  }, [openMenuId]);

  // =========================================
  // RENDER
  // =========================================

  return (
    <main className="networking-page">

      {/* =====================================
          TOAST
      ====================================== */}

      {toastMessage && (
        <div
          className={`networking-toast ${
            toastType === "error"
              ? "toast-error"
              : "toast-success"
          }`}
        >
          <span className="toast-icon">
            {toastType === "error"
              ? "!"
              : "✓"}
          </span>

          <span>
            {toastMessage}
          </span>
        </div>
      )}

      {/* =====================================
          HEADER
      ====================================== */}

      <header className="networking-header">

        <p className="networking-eyebrow">
          KRINSH PANCHAL
        </p>

        <h1>
          Networking
        </h1>

        <p className="networking-subtitle">
          Create a meeting, share your QR,
          and remember every connection.
        </p>

      </header>

      {/* =====================================
          CREATE MEETING
      ====================================== */}

      <section
        ref={createSectionRef}
        className="create-meeting"
        id="create-meeting"
      >

        <div className="section-heading">

          <div>

            <p className="section-eyebrow">
              NEW CONNECTION
            </p>

            <h2>
              Create a Meeting
            </h2>

          </div>

        </div>

        <div className="meeting-form">

          {/* EVENT */}

          <div className="form-group">

            <label htmlFor="meeting-title">
              Meeting / Event
            </label>

            <input
              id="meeting-title"
              type="text"
              placeholder="e.g. Mumbai Fair"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              disabled={creating}
            />

          </div>

          {/* LOCATION */}

          <div className="form-group">

            <label htmlFor="meeting-location">
              Location
            </label>

            <input
              id="meeting-location"
              type="text"
              placeholder="e.g. Bombay Exhibition Centre, BKC, Mumbai"
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value
                )
              }
              disabled={creating}
            />

          </div>

          {/* DATE */}

          <div className="form-group">

            <label htmlFor="meeting-date">
              Meeting Date
            </label>

            <input
              id="meeting-date"
              type="date"
              value={sessionDate}
              onChange={(event) =>
                setSessionDate(
                  event.target.value
                )
              }
              disabled={creating}
            />

            <p className="date-help">
              Today is automatically selected.
              You can change it if needed.
            </p>

          </div>

          {/* ERROR */}

          {formError && (
            <div className="networking-message networking-error">
              {formError}
            </div>
          )}

          {/* SUCCESS */}

          {formMessage && (
            <div className="networking-message networking-success">
              {formMessage}
            </div>
          )}

          {/* CREATE */}

          <button
            type="button"
            className="create-button"
            onClick={() => {
              void createMeeting();
            }}
            disabled={creating}
          >
            {creating
              ? "Creating..."
              : "+ Create Meeting"}
          </button>

        </div>

      </section>

      {/* =====================================
          MEETINGS
      ====================================== */}

      <section className="meetings-section">

        <div className="section-heading">

          <div>

            <p className="section-eyebrow">
              YOUR NETWORK
            </p>

            <h2>
              Meetings
            </h2>

          </div>

          <span className="meeting-count">
            {meetings.length}
          </span>

        </div>

        {/* LOADING */}

        {loading && (
          <div className="empty-state">
            Loading meetings...
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          meetings.length === 0 && (
            <div className="empty-state">

              <button
                type="button"
                className="empty-add-button"
                onClick={scrollToCreate}
                aria-label="Create a meeting"
              >
                +
              </button>

              <h3>
                No meetings yet
              </h3>

              <p>
                Create your first meeting above.
              </p>

              <button
                type="button"
                className="empty-create-link"
                onClick={scrollToCreate}
              >
                + Create your first meeting
              </button>

            </div>
          )}

        {/* MEETING LIST */}

        {!loading &&
          meetings.length > 0 && (
            <div className="meeting-list">

              {meetings.map(
                (meeting) => (
                  <article
                    className={`meeting-card ${
                      !meeting.is_active
                        ? "is-closed"
                        : ""
                    }`}
                    key={meeting.id}
                  >

                    {/* CARD TOP */}

                    <div className="meeting-card-top">

                      <div>

                        <span
                          className={`active-badge ${
                            !meeting.is_active
                              ? "closed"
                              : ""
                          }`}
                        >
                          {meeting.is_active
                            ? "ACTIVE"
                            : "CLOSED"}
                        </span>

                        <h3>
                          {meeting.title}
                        </h3>

                      </div>

                      <div className="meeting-card-actions">

                        <span className="meeting-code">
                          {
                            meeting.session_code
                          }
                        </span>

                        {/* =================================
                            THREE DOT MENU
                            
                            IMPORTANT:
                            CLOSED MEETINGS HAVE NO MENU.
                        ================================== */}

                        {meeting.is_active && (
                          <div
                            className="menu-wrapper"
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                          >

                            <button
                              type="button"
                              className="more-button"
                              aria-label="Meeting options"
                              onClick={() =>
                                setOpenMenuId(
                                  openMenuId ===
                                    meeting.id
                                    ? null
                                    : meeting.id
                                )
                              }
                            >
                              ⋮
                            </button>

                            {openMenuId ===
                              meeting.id && (
                              <div className="meeting-menu">

                                {/* EDIT */}

                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={() =>
                                    openEdit(
                                      meeting
                                    )
                                  }
                                >

                                  <span className="menu-icon">
                                    ✎
                                  </span>

                                  <span>
                                    Edit
                                  </span>

                                </button>

                                {/* DELETE */}

                                <button
                                  type="button"
                                  className="menu-item menu-delete"
                                  onClick={() =>
                                    askDelete(
                                      meeting
                                    )
                                  }
                                >

                                  <span className="menu-icon">
                                    🗑
                                  </span>

                                  <span>
                                    Delete
                                  </span>

                                </button>

                              </div>
                            )}

                          </div>
                        )}

                      </div>

                    </div>

                    {/* CARD INFO */}

                    <div className="meeting-info">

                      {/* LOCATION */}

                      <div className="info-item">

                        <span className="info-label">
                          LOCATION
                        </span>

                        <strong>
                          {meeting.location ||
                            "Not specified"}
                        </strong>

                      </div>

                      {/* DATE */}

                      <div className="info-item">

                        <span className="info-label">
                          DATE
                        </span>

                        <strong>
                          {formatDate(
                            meeting.session_date
                          )}
                        </strong>

                      </div>

                    </div>

                    {/* ACTIONS */}

                    <div className="meeting-actions">

                      <button
                        type="button"
                        className="qr-button"
                        onClick={() =>
                          openQR(
                            meeting.session_code
                          )
                        }
                      >
                        Show QR
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          void copyMeetingLink(
                            meeting.session_code
                          );
                        }}
                      >
                        Copy Link
                      </button>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

      </section>

      {/* =====================================
          EDIT MODAL
      ====================================== */}

      {editingMeeting && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEdit();
            }
          }}
        >

          <div className="edit-modal">

            <div className="modal-header">

              <div>

                <p className="section-eyebrow">
                  EDIT MEETING
                </p>

                <h2>
                  Update Meeting
                </h2>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeEdit}
                disabled={savingEdit}
              >
                ×
              </button>

            </div>

            {/* EVENT */}

            <div className="form-group">

              <label htmlFor="edit-title">
                Meeting / Event
              </label>

              <input
                id="edit-title"
                type="text"
                value={editTitle}
                onChange={(event) =>
                  setEditTitle(
                    event.target.value
                  )
                }
                disabled={savingEdit}
              />

            </div>

            {/* LOCATION */}

            <div className="form-group">

              <label htmlFor="edit-location">
                Location
              </label>

              <input
                id="edit-location"
                type="text"
                value={editLocation}
                onChange={(event) =>
                  setEditLocation(
                    event.target.value
                  )
                }
                disabled={savingEdit}
              />

            </div>

            {/* DATE */}

            <div className="form-group">

              <label htmlFor="edit-date">
                Meeting Date
              </label>

              <input
                id="edit-date"
                type="date"
                value={editSessionDate}
                onChange={(event) =>
                  setEditSessionDate(
                    event.target.value
                  )
                }
                disabled={savingEdit}
              />

            </div>

            {/* ACTIONS */}

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={closeEdit}
                disabled={savingEdit}
              >
                Cancel
              </button>

              <button
                type="button"
                className="create-button modal-save"
                onClick={() => {
                  void saveEdit();
                }}
                disabled={savingEdit}
              >
                {savingEdit
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================
          DELETE CONFIRMATION
      ====================================== */}

      {deleteTarget && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setDeleteTarget(null);
            }
          }}
        >

          <div className="delete-modal">

            <div className="delete-icon">
              🗑
            </div>

            <h2>
              Delete meeting?
            </h2>

            <p>
              Are you sure you want to delete{" "}
              <strong>
                {deleteTarget.title}
              </strong>
              ?
              <br />
              This action cannot be undone.
            </p>

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={
                  deletingId !== null
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-button"
                onClick={() => {
                  void deleteMeeting();
                }}
                disabled={
                  deletingId !== null
                }
              >
                {deletingId
                  ? "Deleting..."
                  : "Delete Meeting"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================
          STYLES
      ====================================== */}

      <style jsx>{`

        .networking-page {
          min-height: 100vh;
          padding: 48px 4vw 100px;
          background: #050505;
          color: #f5f5f5;
          box-sizing: border-box;
        }

        .networking-header {
          max-width: 1400px;
          margin: 0 auto 70px;
        }

        .networking-eyebrow,
        .section-eyebrow {
          margin: 0 0 14px;
          font-size: 10px;
          letter-spacing: 5px;
          color: #8494a6;
          font-weight: 600;
        }

        .networking-header h1 {
          margin: 0;
          font-size: clamp(
            48px,
            7vw,
            86px
          );
          line-height: 0.95;
          font-weight: 400;
          letter-spacing: -4px;
        }

        .networking-subtitle {
          margin: 18px 0 0;
          color: #8d8d8d;
          font-size: 14px;
        }

        .create-meeting,
        .meetings-section {
          max-width: 1400px;
          margin: 0 auto 70px;
        }

        .create-meeting {
          padding: 48px;
          border: 1px solid #292929;
          border-radius: 24px;
          background: #0b0b0b;
          scroll-margin-top: 30px;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 38px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 34px;
          font-weight: 400;
          letter-spacing: -1.5px;
        }

        .meeting-form {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-group label {
          font-size: 14px;
          color: #c7c7c7;
        }

        .form-group input {
          width: 100%;
          height: 58px;
          padding: 0 20px;
          border-radius: 14px;
          border: 1px solid #303030;
          background: #080808;
          color: #f4f4f4;
          font-size: 16px;
          outline: none;
          box-sizing: border-box;
          transition: 0.2s ease;
        }

        .form-group input:focus {
          border-color: #777;
        }

        .form-group input::placeholder {
          color: #555;
        }

        .form-group input[type="date"] {
          color-scheme: dark;
        }

        .date-help {
          margin: 2px 0 0;
          color: #707070;
          font-size: 13px;
        }

        .create-button {
          width: 100%;
          min-height: 58px;
          border: 0;
          border-radius: 12px;
          background: #f5f5f5;
          color: #050505;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .create-button:hover {
          background: white;
          transform: translateY(-1px);
        }

        .create-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .networking-message {
          padding: 16px 18px;
          border-radius: 12px;
          font-size: 14px;
        }

        .networking-success {
          border: 1px solid
            rgba(60, 220, 140, 0.3);
          color: #68e5a4;
          background: rgba(
            30,
            100,
            65,
            0.08
          );
        }

        .networking-error {
          border: 1px solid
            rgba(255, 80, 80, 0.3);
          color: #ff7777;
          background: rgba(
            120,
            30,
            30,
            0.08
          );
        }

        .meeting-count {
          min-width: 40px;
          height: 40px;
          border: 1px solid #292929;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a0a0a0;
          font-size: 13px;
        }

        .meeting-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .meeting-card {
          position: relative;
          padding: 48px;
          border: 1px solid #282828;
          border-radius: 24px;
          background: #080808;
          transition:
            border-color 0.2s ease,
            transform 0.2s ease;
        }

        .meeting-card:hover {
          border-color: #3d3d3d;
          transform: translateY(-1px);
        }

        .meeting-card.is-closed {
          opacity: 0.78;
        }

        .meeting-card.is-closed:hover {
          transform: none;
          border-color: #282828;
        }

        .meeting-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 30px;
        }

        .active-badge {
          display: inline-flex;
          align-items: center;
          padding: 8px 14px;
          border: 1px solid
            rgba(50, 220, 130, 0.4);
          border-radius: 999px;
          color: #55df99;
          font-size: 10px;
          letter-spacing: 3px;
          font-weight: 600;
        }

        .active-badge.closed {
          border-color: #333;
          color: #777;
          background: rgba(
            255,
            255,
            255,
            0.02
          );
        }

        .meeting-card h3 {
          margin: 22px 0 0;
          font-size: clamp(
            30px,
            4vw,
            42px
          );
          font-weight: 400;
          letter-spacing: -2px;
        }

        .meeting-card-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .meeting-code {
          display: inline-flex;
          align-items: center;
          min-height: 46px;
          padding: 0 15px;
          border: 1px solid #292929;
          border-radius: 12px;
          color: #777;
          font-size: 11px;
          letter-spacing: 1px;
          white-space: nowrap;
        }

        .menu-wrapper {
          position: relative;
        }

        .more-button {
          width: 46px;
          height: 46px;
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: #ddd;
          font-size: 27px;
          line-height: 1;
          cursor: pointer;
        }

        .more-button:hover {
          background: #171717;
        }

        .meeting-menu {
          position: absolute;
          top: 54px;
          right: 0;
          width: 180px;
          padding: 8px;
          border: 1px solid #343434;
          border-radius: 15px;
          background: #111;
          box-shadow:
            0 20px 60px
            rgba(0, 0, 0, 0.55);
          z-index: 100;
        }

        .menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 14px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #eee;
          text-align: left;
          font-size: 14px;
          cursor: pointer;
        }

        .menu-item:hover {
          background: #1c1c1c;
        }

        .menu-icon {
          width: 20px;
          text-align: center;
        }

        .menu-delete {
          color: #ff6868;
        }

        .meeting-info {
          display: grid;
          grid-template-columns:
            repeat(2, 1fr);
          gap: 30px;
          margin-top: 42px;
          padding-top: 30px;
          border-top: 1px solid #242424;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .info-label {
          color: #697585;
          font-size: 10px;
          letter-spacing: 4px;
        }

        .info-item strong {
          color: #ddd;
          font-size: 15px;
          font-weight: 400;
          line-height: 1.5;
        }

        .meeting-actions {
          display: flex;
          gap: 12px;
          margin-top: 35px;
        }

        .qr-button,
        .secondary-button {
          min-height: 54px;
          padding: 0 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .qr-button {
          border: 0;
          background: #f4f4f4;
          color: #050505;
        }

        .qr-button:hover {
          background: #fff;
        }

        .secondary-button {
          border: 1px solid #303030;
          background: transparent;
          color: #ddd;
        }

        .secondary-button:hover {
          border-color: #555;
          background: #111;
        }

        .empty-state {
          padding: 85px 30px;
          border: 1px solid #252525;
          border-radius: 24px;
          text-align: center;
          color: #777;
        }

        .empty-add-button {
          width: 64px;
          height: 64px;
          margin-bottom: 25px;
          border: 1px solid #353535;
          border-radius: 50%;
          background: transparent;
          color: #aaa;
          font-size: 27px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .empty-add-button:hover {
          color: white;
          border-color: #666;
          transform: scale(1.05);
        }

        .empty-state h3 {
          margin: 0 0 10px;
          color: #ddd;
          font-size: 24px;
          font-weight: 400;
        }

        .empty-state p {
          margin: 0;
          font-size: 14px;
        }

        .empty-create-link {
          margin-top: 25px;
          border: 0;
          background: transparent;
          color: #ddd;
          font-size: 13px;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        /* =====================================
           TOAST
        ====================================== */

        .networking-toast {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 3000;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-radius: 12px;
          background: #111;
          box-shadow:
            0 20px 70px
            rgba(0, 0, 0, 0.6);
          font-size: 14px;
        }

        .toast-success {
          border: 1px solid
            rgba(70, 220, 140, 0.35);
          color: #70e3a6;
        }

        .toast-error {
          border: 1px solid
            rgba(255, 80, 80, 0.35);
          color: #ff7777;
        }

        .toast-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: currentColor;
          color: #111;
          font-size: 12px;
          font-weight: 800;
        }

        /* =====================================
           MODALS
        ====================================== */

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(
            0,
            0,
            0,
            0.78
          );
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .edit-modal,
        .delete-modal {
          width: 100%;
          max-width: 620px;
          padding: 34px;
          border: 1px solid #333;
          border-radius: 22px;
          background: #0d0d0d;
          box-shadow:
            0 30px 100px
            rgba(0, 0, 0, 0.7);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 35px;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 30px;
          font-weight: 400;
        }

        .modal-close {
          width: 40px;
          height: 40px;
          border: 1px solid #292929;
          border-radius: 10px;
          background: transparent;
          color: #aaa;
          font-size: 24px;
          cursor: pointer;
        }

        .modal-close:hover {
          background: #171717;
          color: white;
        }

        .edit-modal .form-group {
          margin-bottom: 22px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 30px;
        }

        .modal-actions .secondary-button,
        .modal-save,
        .delete-confirm-button {
          width: auto;
          min-width: 140px;
        }

        .delete-modal {
          max-width: 460px;
          text-align: center;
        }

        .delete-icon {
          width: 54px;
          height: 54px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid
            rgba(255, 80, 80, 0.3);
          border-radius: 50%;
          color: #ff6868;
        }

        .delete-modal h2 {
          margin: 0 0 12px;
          font-size: 28px;
          font-weight: 400;
        }

        .delete-modal p {
          margin: 0;
          color: #888;
          line-height: 1.6;
          font-size: 14px;
        }

        .delete-modal strong {
          color: #ddd;
          font-weight: 500;
        }

        .delete-confirm-button {
          min-height: 54px;
          padding: 0 24px;
          border: 1px solid
            rgba(255, 70, 70, 0.5);
          border-radius: 12px;
          background: rgba(
            120,
            30,
            30,
            0.15
          );
          color: #ff7070;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .delete-confirm-button:hover {
          background: rgba(
            150,
            35,
            35,
            0.25
          );
        }

        @media (max-width: 800px) {

          .networking-page {
            padding: 30px 18px 70px;
          }

          .create-meeting {
            padding: 28px 20px;
          }

          .meeting-card {
            padding: 28px 20px;
          }

          .meeting-card-top {
            flex-direction: column;
          }

          .meeting-card-actions {
            width: 100%;
            justify-content: space-between;
          }

          .meeting-info {
            grid-template-columns: 1fr;
          }

          .meeting-actions {
            flex-wrap: wrap;
          }

          .qr-button,
          .secondary-button {
            flex: 1;
          }

          .networking-toast {
            left: 18px;
            right: 18px;
            top: 18px;
          }
        }

        @media (max-width: 500px) {

          .networking-header h1 {
            font-size: 48px;
          }

          .section-heading h2 {
            font-size: 28px;
          }

          .meeting-card h3 {
            font-size: 28px;
          }

          .modal-backdrop {
            padding: 15px;
          }

          .edit-modal,
          .delete-modal {
            padding: 25px 20px;
          }

          .modal-actions {
            flex-direction: column-reverse;
          }

          .modal-actions
            .secondary-button,
          .modal-actions .create-button,
          .delete-confirm-button {
            width: 100%;
          }

        }

      `}</style>

    </main>
  );
}