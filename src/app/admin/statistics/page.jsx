import { redirect } from "next/navigation";

export default function AdminStatisticsRedirect() {
  redirect("/admin/courses");
}
