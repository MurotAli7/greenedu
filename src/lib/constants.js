/**
 * Butun loyiha bo'ylab ishlatiladigan doimiy qiymatlar.
 * Avval bir xil ro'yxatlar 4-5 sahifada takrorlangan edi.
 */

export const ROLES = ["student", "teacher", "admin"];

export const ROLE_LABELS = {
  student: "O'quvchi",
  teacher: "O'qituvchi",
  admin: "Administrator",
};

export const ROLE_CHIPS = {
  student: "chip-green",
  teacher: "chip-sky",
  admin: "chip-violet",
};

export const CONTENT_TYPES = ["course", "ar", "vr"];

export const CONTENT_TYPE_LABELS = {
  course: "Kurs",
  ar: "AR",
  vr: "VR",
};

export const COURSE_STATUSES = ["active", "draft", "archived"];

export const STATUS_LABELS = {
  active: "Faol",
  draft: "Qoralama",
  archived: "Arxiv",
};

export const STATUS_CHIPS = {
  active: "chip-green",
  draft: "chip-amber",
  archived: "chip-gray",
};

export const LESSON_TYPES = ["text", "ar", "vr"];

export const LESSON_TYPE_LABELS = {
  text: "Matn",
  ar: "AR",
  vr: "VR",
};

export const ACTIVITY_ACTIONS = [
  "checkin",
  "enroll",
  "lesson_complete",
  "arvr_view",
  "test_submit",
];

export const ACTION_LABELS = {
  checkin: "Saytga kirdi",
  enroll: "Kursga yozildi",
  lesson_complete: "Dars tugatildi",
  arvr_view: "AR/VR ko'rdi",
  test_submit: "Test topshirdi",
};

export const ACTION_CHIPS = {
  checkin: "chip-gray",
  enroll: "chip-sky",
  lesson_complete: "chip-green",
  arvr_view: "chip-amber",
  test_submit: "chip-violet",
};

/** Fayl yuklash qoidalari (server va klient bir xil qoidadan foydalanadi) */
export const UPLOAD_RULES = {
  test: {
    extensions: [".html", ".htm"],
    contentType: "text/html",
    maxBytes: 5 * 1024 * 1024,
    label: "HTML test",
  },
  model: {
    extensions: [".glb", ".gltf"],
    contentType: "model/gltf-binary",
    maxBytes: 120 * 1024 * 1024,
    label: "3D model",
  },
};

export const STORAGE_BUCKETS = {
  content: "content",
  avatars: "avatars",
};

/** Test natijasini qabul qilish uchun xabar turi */
export const TEST_RESULT_MESSAGE = "greenedu:test-result";
