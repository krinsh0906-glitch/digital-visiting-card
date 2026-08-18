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

/* =========================================================
   DATE HELPERS
========================================================= */

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


/* =========================================================
   SAFE JSON READER
========================================================= */

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


/* =========================================================
   PAGE
========================================================= */

export default function NetworkingPage() {

  const createSectionRef =
    useRef<HTMLElement | null>(null);


  /* =======================================================
     MEETINGS
  ======================================================= */

  const [meetings, setMeetings] =
    useState<Meeting[]>([]);

  const [loading, setLoading] =
    useState(true);


  /* =======================================================
     CREATE
  ======================================================= */

  const [creating, setCreating] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [sessionDate, setSessionDate] =
    useState(getTodayDate());


  /* =======================================================
     EDIT
  ======================================================= */

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [editingMeeting, setEditingMeeting] =
    useState<Meeting | null>(null);

  const [editTitle, setEditTitle] =
    useState("");

  const [editLocation, setEditLocation] =
    useState("");

  const [editSessionDate, setEditSessionDate] =
    useState(getTodayDate());


  /* =======================================================
     DELETE
  ======================================================= */

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<Meeting | null>(null);


  /* =======================================================
     MENU
  ======================================================= */

  const [openMenuId, setOpenMenuId] =
    useState<string | null>(null);


  /* =======================================================
     MESSAGES
  ======================================================= */

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


  /* =======================================================
     CURRENT DATE

     This updates every minute.

     Therefore a meeting automatically changes
     visually from ACTIVE → CLOSED when its
     meeting date passes.
  ======================================================= */

  const [todayDate, setTodayDate] =
    useState(getTodayDate());


  useEffect(() => {

    const interval =
      window.setInterval(() => {

        setTodayDate(
          getTodayDate()
        );

      }, 60 * 1000);

    return () => {
      window.clearInterval(interval);
    };

  }, []);


  /* =======================================================
     TOAST
  ======================================================= */

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


  /* =======================================================
     CHECK MEETING STATUS

     A meeting is considered active only if:

     1. Database says it is active
     2. Meeting date is today or in the future

     If the date has passed, UI shows CLOSED.
  ======================================================= */

  const isMeetingActive = (
    meeting: Meeting
  ) => {

    if (!meeting.is_active) {
      return false;
    }

    return (
      meeting.session_date >= todayDate
    );
  };


  /* =======================================================
     LOAD MEETINGS
  ======================================================= */

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
        Array.isArray(
          data?.meetings
        )
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


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {

    void loadMeetings();

  }, []);


  /* =======================================================
     SCROLL TO CREATE
  ======================================================= */

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


  /* =======================================================
     CREATE MEETING
  ======================================================= */

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


  /* =======================================================
     OPEN EDIT
  ======================================================= */

  const openEdit = (
    meeting: Meeting
  ) => {

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


  /* =======================================================
     CLOSE EDIT
  ======================================================= */

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


  /* =======================================================
     SAVE EDIT
  ======================================================= */

  const saveEdit = async () => {

    if (!editingMeeting) {
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


  /* =======================================================
     ASK DELETE
  ======================================================= */

  const askDelete = (
    meeting: Meeting
  ) => {

    setOpenMenuId(null);

    setDeleteTarget(meeting);
  };


  /* =======================================================
     DELETE MEETING
  ======================================================= */

  const deleteMeeting = async () => {

    if (!deleteTarget) {
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


  /* =======================================================
     MEETING URL
  ======================================================= */

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


  /* =======================================================
     QR
  ======================================================= */

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


  /* =======================================================
     COPY LINK
  ======================================================= */

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


  /* =======================================================
     CLOSE MENUS
  ======================================================= */

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


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="networking-page">


      {/* =====================================================
          TOAST
      ===================================================== */}

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


      {/* =====================================================
          HEADER
      ===================================================== */}

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


      {/* =====================================================
          CREATE MEETING
      ===================================================== */}

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


      {/* =====================================================
          MEETINGS
      ===================================================== */}

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
                (meeting) => {

                  const active =
                    isMeetingActive(
                      meeting
                    );

                  return (

                    <article
                      className={`meeting-card ${
                        active
                          ? ""
                          : "is-closed"
                      }`}
                      key={meeting.id}
                    >


                      {/* CARD TOP */}

                      <div className="meeting-card-top">

                        <div>

                          <span
                            className={`active-badge ${
                              active
                                ? ""
                                : "closed"
                            }`}
                          >

                            {active
                              ? "ACTIVE"
                              : "CLOSED"}

                          </span>

                          <h3>
                            {meeting.title}
                          </h3>

                        </div>


                        {/* CODE + MENU */}

                        <div className="meeting-card-actions">

                          <span className="meeting-code">
                            {meeting.session_code}
                          </span>


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

                  );
                }
              )}

            </div>
          )}

      </section>


      {/* =====================================================
          EDIT MODAL
      ===================================================== */}

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


            {/* MODAL HEADER */}

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
                aria-label="Close"
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


            {/* =================================================
                EDIT ACTIONS

                IMPORTANT:
                These buttons use completely separate classes.

                This prevents .create-button from making
                Save Changes larger than Cancel.
            ================================================= */}

            <div className="modal-actions edit-actions">

              <button
                type="button"
                className="edit-cancel-button"
                onClick={closeEdit}
                disabled={savingEdit}
              >
                Cancel
              </button>


              <button
                type="button"
                className="edit-save-button"
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


      {/* =====================================================
          DELETE MODAL
      ===================================================== */}

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

    </main>
  );
}