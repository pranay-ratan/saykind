"use client";

import { useState } from "react";
import { getLog, logEvent } from "../log";
import { useSettings } from "../settings";
import { buildHelpSummary } from "../summary";

/**
 * CONTACT-CAREGIVER CONTROLLER. Two things, both started by the person and both handed to the phone itself:
 *   callCaregiver()  -> a tel: link; the phone shows its call screen (nothing is dialled until they press call)
 *   openMessage()    -> an sms: link with the summary text they have read and may have edited
 *
 * IMPORTANT: Saykind cannot place the call, send the message, or learn whether either happened, and must never claim it
 * did. Showing the summary first and letting the person edit or discard it IS the "approve what is shared" step.
 * Real delivery (alerts without the person pressing send) would need a server, caregiver accounts and consent records.
 */
function openExternal(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const digits = (phone: string) => phone.replace(/[^\d+]/g, "");

export function useCaregiverContact() {
  const settings = useSettings();
  const [generated, setGenerated] = useState("");
  const [edited, setEdited] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const phone = digits(settings.caregiverPhone);
  const summary = edited ?? generated;

  return {
    caregiver: { name: settings.caregiverName.trim() || "my caregiver", phone, hasPhone: phone.length > 0 },
    /** The message the person will read and may edit before sending. */
    summary,
    /** Plain text about what happened, as a status for the UI ("Opened your call screen", and so on). Never claims delivery. */
    note,
    canShare: typeof navigator !== "undefined" && typeof navigator.share === "function",

    /** Call when the contact UI opens: drafts a fresh summary from recent, authorized practice. */
    refreshSummary: () => {
      setGenerated(buildHelpSummary(getLog()));
      setEdited(null);
      setNote("");
    },
    setSummary: setEdited,
    clearNote: () => setNote(""),

    callCaregiver: () => {
      logEvent({ type: "help_request", ts: Date.now(), action: "call-started" });
      openExternal(`tel:${phone}`);
      setNote("Your phone's call screen should open. Press call there to ring.");
    },
    openMessage: () => {
      logEvent({ type: "help_request", ts: Date.now(), action: "summary-opened" });
      openExternal(`sms:${phone}?&body=${encodeURIComponent(summary)}`);
      setNote("Your messaging app should open with this message ready. Nothing is sent until you press send there.");
    },
    copySummary: async () => {
      try {
        await navigator.clipboard.writeText(summary);
        logEvent({ type: "help_request", ts: Date.now(), action: "summary-copied" });
        setNote("Copied. You can paste it into any app.");
      } catch {
        setNote("Couldn't copy. You can select the text and copy it yourself.");
      }
    },
    shareSummary: async () => {
      if (!navigator.share) return setNote("Sharing isn't available in this browser. Try Open in Messages or Copy.");
      try {
        await navigator.share({ text: summary });
        logEvent({ type: "help_request", ts: Date.now(), action: "summary-shared" });
        setNote("Your share menu was opened. Saykind can't tell whether it was sent.");
      } catch {
        // the person cancelled
      }
    },
  };
}
