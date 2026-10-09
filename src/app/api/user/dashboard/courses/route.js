import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/userGuard";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const guard = await requireUser();

  if (guard.error) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.status }
    );
  }

  const userId = guard.user.id;
  const service = createServiceClient();

  // Kerakli ma'lumotlarni parallel olamiz
  const [
    { data: courses, error: coursesError },
    { data: lessons, error: lessonsError },
    { data: enrollments, error: enrollmentsError },
    { data: progress, error: progressError },
  ] = await Promise.all([
    service
      .from("courses")
      .select(
        "id, title, description, category, content_type, recommended_for_new_users, is_new"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false }),

    service
      .from("lessons")
      .select("id, course_id"),

    service
      .from("enrollments")
      .select("course_id")
      .eq("user_id", userId),

    service
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", userId),
  ]);

  // Xatoliklarni tekshirish
  if (
    coursesError ||
    lessonsError ||
    enrollmentsError ||
    progressError
  ) {
    console.error("Courses dashboard xatoligi:", {
      coursesError,
      lessonsError,
      enrollmentsError,
      progressError,
    });

    return NextResponse.json(
      { error: "Kurslarni yuklashda xatolik yuz berdi." },
      { status: 500 }
    );
  }

  // =========================
  // KURSLAR BO'YICHA DARS SONI
  // =========================

  const lessonsByCourse = new Map();
  const courseOfLesson = new Map();

  (lessons || []).forEach((lesson) => {
    lessonsByCourse.set(
      lesson.course_id,
      (lessonsByCourse.get(lesson.course_id) || 0) + 1
    );

    courseOfLesson.set(
      lesson.id,
      lesson.course_id
    );
  });

  // =========================
  // BAJARILGAN DARSLAR
  // =========================

  const doneByCourse = new Map();

  (progress || []).forEach((item) => {
    const courseId = courseOfLesson.get(item.lesson_id);

    if (courseId) {
      doneByCourse.set(
        courseId,
        (doneByCourse.get(courseId) || 0) + 1
      );
    }
  });

  // =========================
  // ENROLLED KURSLAR
  // =========================

  const enrolledIds = new Set(
    (enrollments || []).map(
      (item) => item.course_id
    )
  );

  // Faqat enrolled kurslar
  const enrolled = (courses || [])
    .filter((course) => enrolledIds.has(course.id))
    .map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      content_type: course.content_type,
      recommended_for_new_users:
        course.recommended_for_new_users,

      totalLessons:
        lessonsByCourse.get(course.id) || 0,

      doneLessons:
        doneByCourse.get(course.id) || 0,

      isEnrolled: true,
    }));

  return NextResponse.json({
    courses: enrolled,
  });
}