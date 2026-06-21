import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Retrieve EmailJS configuration (Firestore notifications/emailjs_config with LocalStorage fallback)
export async function getEmailConfig() {
  let config = null;
  try {
    const docRef = doc(db, "notifications", "emailjs_config");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      config = docSnap.data();
    }
  } catch (err) {
    console.warn("Failed to read email config from Firestore, trying LocalStorage fallback:", err);
  }

  if (!config) {
    try {
      const local = localStorage.getItem("crownridge_emailjs_config");
      if (local) {
        config = JSON.parse(local);
      }
    } catch (e) {
      console.error("Failed to parse LocalStorage email config:", e);
    }
  }

  return config || { serviceId: "", templateId: "", publicKey: "", recipientOverride: "" };
}

// Save EmailJS configuration
export async function saveEmailConfig(config) {
  // Save to LocalStorage first
  try {
    localStorage.setItem("crownridge_emailjs_config", JSON.stringify(config));
  } catch (e) {
    console.error("Failed to write email config to LocalStorage:", e);
  }

  // Save to Firestore
  try {
    const docRef = doc(db, "notifications", "emailjs_config");
    await setDoc(docRef, {
      ...config,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error("Failed to write email config to Firestore:", err);
    throw new Error("Local settings updated, but Firestore save was blocked: " + err.message);
  }
}

// Send real email via EmailJS REST API
export async function sendEmailViaEmailJS({ to_email, subject, message }) {
  const config = await getEmailConfig();
  if (!config || !config.serviceId || !config.templateId || !config.publicKey) {
    throw new Error(
      "EmailJS configuration is missing or incomplete. Please go to the Messaging -> Configuration tab to set up your credentials."
    );
  }

  // Route email to the override address if set (for testing purposes)
  const finalEmail = config.recipientOverride || to_email;
  if (!finalEmail) {
    throw new Error("No recipient email address specified.");
  }

  const payload = {
    service_id: config.serviceId,
    template_id: config.templateId,
    user_id: config.publicKey,
    template_params: {
      to_email: finalEmail,
      subject: subject,
      message: message,
    },
  };

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `EmailJS responded with status ${response.status}`);
  }

  return { success: true, timestamp: new Date() };
}

// Log manual or automated email sends to the messages collection
export async function logEmailMessage({ to_email, subject, message, status, errorMsg = "" }) {
  try {
    const payload = {
      type: "email",
      title: subject,
      message: message,
      recipient: to_email,
      status: status, // "Sent" or "Failed"
      createdAt: serverTimestamp(),
    };
    if (errorMsg) {
      payload.error = errorMsg;
    }
    await addDoc(collection(db, "messages"), payload);
  } catch (err) {
    console.error("Error logging email message to Firestore:", err);
  }
}
