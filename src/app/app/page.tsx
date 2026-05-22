import { NextIntlClientProvider } from "@/i18n/compat/client";
import { ReactNode } from "react";
import { getLocale, getMessages } from "@/i18n/compat/server";
import Document from "@/components/Document";
import { Providers } from "@/app/providers";

type Props = {
  children: ReactNode;
  params: { locale: string };
};

export default async function LocaleLayout({ children }: Props) {
  const locale = await getLocale();

  const messages = await getMessages();

  return (
    <Document locale={locale}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Providers>{children}</Providers>
      </NextIntlClientProvider>
    </Document>
  );
}
