import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

const staticRoutes = [
  "/",
  "/login",
  "/signup",
  "/dashboard",
  "/classrooms/new",
  "/profile",
  "/friends",
  "/messages",
  "/leaderboards/friends",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
  }));
}
