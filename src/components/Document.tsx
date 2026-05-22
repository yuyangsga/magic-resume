import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  locale: string;
  bodyClassName?: string;
};

export default function Document({ children, locale, bodyClassName }: Props) {
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico?v=2" />
      </head>
      <body className={bodyClassName}>{children}</body>
    </html>
  );
}
