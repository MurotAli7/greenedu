import { redirect } from "next/navigation";

// Eski havolalar yangi, soddalashtirilgan admin bo'limiga yo'naltiriladi.
export default function AdminDashboardRedirect() {
  redirect("/admin/courses");
}
