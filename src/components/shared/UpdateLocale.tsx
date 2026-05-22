import { setUserLocale } from "@/i18n/db";

export default async function updateLocale(locale: string) {
  setUserLocale(locale);
}
