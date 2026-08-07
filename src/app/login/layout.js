import { buildMetadata } from "@/lib/seo/config";

export const metadata = buildMetadata({
  title: "Kirish",
  path: "/login",
  description: "GreenEdu hisobingizga kiring va yashil ta'lim darslarini davom ettiring.",
});

export default function LoginLayout({ children }) {
  return children;
}
