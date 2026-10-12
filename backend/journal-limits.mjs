export const JOURNAL_LIMITS = Object.freeze({
  max_photos: 6,
  max_original_photo_bytes: 10 * 1024 * 1024,
  max_entry_bytes: 1024 * 1024
});

export function validateJournalEntry(entry) {
  if (entry.photos != null && (!Array.isArray(entry.photos) || entry.photos.some(photo => typeof photo !== "string"))) {
    return { status: 400, error: "照片内容无效", code: "JOURNAL_PHOTOS_INVALID" };
  }
  if ((entry.photos || []).length > JOURNAL_LIMITS.max_photos) {
    return { status: 413, error: `单日游记最多${JOURNAL_LIMITS.max_photos}张照片，请减少后重试`, code: "JOURNAL_PHOTOS_TOO_MANY" };
  }
  if (Buffer.byteLength(JSON.stringify(entry), "utf8") > JOURNAL_LIMITS.max_entry_bytes) {
    return { status: 413, error: "单日文字与照片合计不能超过1MB，请减少照片或文字后重试", code: "JOURNAL_TOO_LARGE" };
  }
  return null;
}
