import { buildMetadata } from "@/lib/seo/config";

export const metadata = buildMetadata({
  title: "Parolni tiklash",
  path: "/forgot-password",
  description: "GreenEdu hisobingiz parolini email orqali tiklang.",
  noIndex: true,
});

export default function ForgotPasswordLayout({ children }) {
  return children;
}
