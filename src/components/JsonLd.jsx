/**
 * Schema.org ma'lumotlarini sahifaga qo'shadi.
 * Server komponent — brauzerga qo'shimcha JS yubormaydi.
 */
export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      // Ma'lumot faqat serverdagi statik obyektlardan yasaladi (foydalanuvchi kiritmaydi)
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
