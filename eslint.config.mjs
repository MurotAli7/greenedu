import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      /**
       * O'zbek tilida apostrof ("o'quvchi", "ta'lim") deyarli har jumlada
       * uchraydi. Ularni &apos; ga aylantirish matnni o'qib bo'lmas holga
       * keltiradi. Apostrof JSX matnida xavfsiz render bo'ladi.
       */
      "react/no-unescaped-entities": "off",

      /**
       * React Compiler qoidasi effekt ichida setState chaqirishdan ogohlantiradi.
       * Bizdagi holat — "mount bo'lganda ma'lumot yuklash" andozasi: setState
       * `await` dan KEYIN, ya'ni asinxron ishlaydi va kaskadli render
       * keltirib chiqarmaydi. Qoidani butunlay chetlab o'tmaslik uchun u
       * ogohlantirish darajasiga tushirildi.
       */
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
