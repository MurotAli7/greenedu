import { SITE, SITE_URL, canonical } from "./config";

/**
 * Schema.org (JSON-LD) tuzilmalari.
 * Qidiruv tizimlari saytni "ta'lim tashkiloti" sifatida tushunishi uchun.
 */

export function organizationSchema() {
  return {
    "@type": "EducationalOrganization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE.name,
    url: SITE_URL,
    description: SITE.description,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon.png`,
    },
    areaServed: {
      "@type": "Country",
      name: "Uzbekistan",
    },
    knowsLanguage: ["uz"],
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE.name,
    description: SITE.description,
    inLanguage: SITE.language,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

/** Bosh sahifa uchun kurslar ro'yxati */
export function courseListSchema(courses = []) {
  return {
    "@type": "ItemList",
    "@id": `${SITE_URL}/#courses`,
    name: "GreenEdu kurslari",
    itemListElement: courses.map((course, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Course",
        name: course.name,
        description: course.description,
        url: canonical(course.path || "/"),
        inLanguage: SITE.language,
        provider: { "@id": `${SITE_URL}/#organization` },
        isAccessibleForFree: true,
        educationalLevel: "Secondary school",
        teaches: course.teaches,
      },
    })),
  };
}

export function breadcrumbSchema(items = []) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  };
}

/** Bir nechta sxemani bitta @graph ichida birlashtiradi */
export function jsonLdGraph(...nodes) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  };
}
