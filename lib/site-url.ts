function withHttps(hostOrUrl: string) {
  if (hostOrUrl.startsWith("http://") || hostOrUrl.startsWith("https://")) {
    return hostOrUrl;
  }

  return `https://${hostOrUrl}`;
}

export function getSiteUrl() {
  const explicit = process.env.SITE_URL?.trim();

  if (explicit) {
    return withHttps(explicit);
  }

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (vercelProductionUrl) {
    return withHttps(vercelProductionUrl);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    return withHttps(vercelUrl);
  }

  return "http://localhost:3000";
}
