import createMiddleware from "@/i18n/compat/middleware";

export default createMiddleware();

export const config = {
  matcher: ["/", "/(zh|en)/:path*"]
};
