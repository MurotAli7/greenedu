import { buildMetadata } from "@/lib/seo/config";

export const metadata = buildMetadata({
  title: "Ro'yxatdan o'tish",
  path: "/register",
  description:
    "GreenEdu platformasida bepul ro'yxatdan o'ting: AR va VR darslar, XP va nishonlar bilan ekologiyani o'rganing.",
});

export default function RegisterLayout({ children }) {
  return children;
}
