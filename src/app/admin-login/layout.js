import { buildMetadata } from "@/lib/seo/config";

export const metadata = buildMetadata({
  title: "Admin panel",
  path: "/admin-login",
  noIndex: true,
});

export default function AdminLoginLayout({ children }) {
  return children;
}
