import { extractFromImage } from "../services/visionService.js";
import { formatCurrency } from "../utils/formatter.js";

const pendingMap = new Map();
const pendingTimers = new Map();

function getPendingTimeout() {
  const timeout = Number(process.env.PENDING_TIMEOUT_MS || 300000);
  return Number.isNaN(timeout) ? 300000 : timeout;
}

function buildConfirmationMessage(data) {
  return [
    "🧾 Please confirm this transaction:",
    "--------------------------------",
    `💸 Amount: ${formatCurrency(data.amount, data.currency)}`,
    `🏪 Merchant: ${data.merchant || "-"}`,
    `🏷️ Category: ${data.category}`,
    `📅 Date: ${data.date || "-"}`,
    `📝 Description: ${data.description || "-"}`,
    `📌 Type: ${data.type}`,
    `🎯 Confidence: ${data.confidence}`,
    "",
    "Reply with:",
    "- yes (save)",
    "- no (discard)",
    "- edit [field] [value] (update and review)"
  ].join("\n");
}

function clearPending(phoneNumber) {
  const timer = pendingTimers.get(phoneNumber);
  if (timer) {
    clearTimeout(timer);
    pendingTimers.delete(phoneNumber);
  }
  pendingMap.delete(phoneNumber);
}

function setPending(phoneNumber, data, message) {
  clearPending(phoneNumber);
  pendingMap.set(phoneNumber, data);
  const timer = setTimeout(async () => {
    pendingMap.delete(phoneNumber);
    pendingTimers.delete(phoneNumber);
    try {
      await message.reply("⏱️ Pending transaction expired. Send the image again to continue.");
    } catch {
      // Ignore send failures on timeout cleanup.
    }
  }, getPendingTimeout());
  pendingTimers.set(phoneNumber, timer);
}

export function hasPending(phoneNumber) {
  return pendingMap.has(phoneNumber);
}

export function clearPendingFor(phoneNumber) {
  clearPending(phoneNumber);
}

export function updatePendingField(phoneNumber, field, value) {
  const current = pendingMap.get(phoneNumber);
  if (!current) {
    return null;
  }

  if (!(field in current)) {
    return { error: `Unknown field: ${field}` };
  }

  let nextValue = value;
  if (field === "amount") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isNaN(parsed) || parsed <= 0) {
      return { error: "Amount must be a valid positive number." };
    }
    nextValue = parsed;
  } else if (field === "merchant" || field === "date") {
    nextValue = value === "null" ? null : value;
  }

  const updated = { ...current, [field]: nextValue };
  pendingMap.set(phoneNumber, updated);
  return { data: updated };
}

export function getPending(phoneNumber) {
  return pendingMap.get(phoneNumber) || null;
}

export async function handleMedia(message) {
  const media = await message.downloadMedia();
  if (!media) {
    throw new Error("Unable to download media from message.");
  }

  if (!media.mimetype?.startsWith("image/")) {
    return "Please send an image receipt or bank alert screenshot.";
  }

  const extracted = await extractFromImage(media.data, media.mimetype);
  setPending(message.from, extracted, message);
  return buildConfirmationMessage(extracted);
}

export function buildPendingCard(phoneNumber) {
  const data = pendingMap.get(phoneNumber);
  if (!data) {
    return null;
  }
  return buildConfirmationMessage(data);
}

// Test helpers to avoid relying on external APIs during unit tests.
export function __setPendingForTest(phoneNumber, data) {
  clearPending(phoneNumber);
  pendingMap.set(phoneNumber, data);
}

export function __resetPendingForTest() {
  for (const [phoneNumber, timer] of pendingTimers.entries()) {
    clearTimeout(timer);
    pendingTimers.delete(phoneNumber);
    pendingMap.delete(phoneNumber);
  }
  for (const phoneNumber of pendingMap.keys()) {
    pendingMap.delete(phoneNumber);
  }
}
