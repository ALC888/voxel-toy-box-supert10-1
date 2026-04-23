// purge all objects across all deploys for this site

import { purgeCache } from "@netlify/functions";

export default async () => {

  console.log("Purging everything");

  await purgeCache();

  return new Response("Purged!", { status: 202 })
};
