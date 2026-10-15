import type { MetadataRoute } from "next";
import { isDeploymentPreview, publicSiteOrigin } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicSiteOrigin();
  return !origin || isDeploymentPreview ? [] : [{ url: origin.href }];
}
