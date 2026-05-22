import { defaultLocale } from "./config";

const COOKIE_NAME = "NEXT_LOCALE";

export async function getUserLocale() {
  if (typeof document === "undefined") {
    return defaultLocale;
  }

  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE_NAME}=`))
      ?.split("=")[1] || defaultLocale
  );
}

export async function setUserLocale(locale: string) {
  if (typeof document !== "undefined") {
    document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=31536000`;
  }
}
