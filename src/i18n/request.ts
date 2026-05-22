import { getRequestConfig } from "@/i18n/compat/server";
import { defaultLocale, locales, type Locale } from "./config";
import { getUserLocale } from "./db";

export default getRequestConfig(async ({ requestLocale }) => {
  // Read from potential `[locale]` segment
  let locale = await requestLocale;

  if (!locale) {
    // The user is logged in
    locale = await getUserLocale();
  }

  // Ensure that the incoming locale is valid
  if (!locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default,
  };
});
