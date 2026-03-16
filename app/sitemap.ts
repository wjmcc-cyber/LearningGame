import type { MetadataRoute } from "next";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

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
