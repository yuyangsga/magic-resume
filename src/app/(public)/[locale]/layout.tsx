import { ReactNode } from "react";
import { notFound } from "@/lib/navigation";
import { NextIntlClientProvider } from "@/i18n/compat/client";
import { getMessages, setRequestLocale } from "@/i18n/compat/server";
import Document from "@/components/Document";
import { locales, type Locale } from "@/i18n/config";
import { Providers } from "@/app/providers";

type Props = {
  children: ReactNode;
  params: { locale: string };
};

const resolveLocale = (value: string): Locale | null =>
  locales.includes(value as Locale) ? (value as Locale) : null;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale: rawLocale }
}: Props) {
  const locale = resolveLocale(rawLocale);

  if (!locale) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages({ locale });

  return (
    <Document locale={locale}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Providers>{children}</Providers>
      </NextIntlClientProvider>
    </Document>
  );
}
