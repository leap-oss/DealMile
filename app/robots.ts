import type { MetadataRoute } from "next";
import { isDeploymentPreview, publicSiteOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (isDeploymentPreview) return { rules: { userAgent: "*", disallow: "/" } };
  const origin = publicSiteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/register",
        "/dashboard",
        "/developer",
        "/projects",
        "/settings",
        "/api/",
      ],
    },
    ...(origin ? { sitemap: new URL("/sitemap.xml", origin).href } : {}),
  };
}
