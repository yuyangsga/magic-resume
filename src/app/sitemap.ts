type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: "daily";
  priority: number;
};

export default function sitemap(): SitemapEntry[] {
  const baseUrl = "https://magicv.art/";

  const routes = ["zh", "en"];

  const sitemap: SitemapEntry[] = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1.0
  }));

  return sitemap;
}
