type WebManifestIcon = {
  src: string;
  sizes: string;
  type: string;
};

type WebManifest = {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: "standalone";
  background_color: string;
  theme_color: string;
  icons: WebManifestIcon[];
};

export default function manifest(): WebManifest {
  return {
    name: "Magic Resume",
    short_name: "Magic Resume",
    description: "Magic Resume progressive web app",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
