/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type Runtime = import('@astrojs/cloudflare').Runtime<{
  DB: D1Database;
  INFRA_SECRETS: KVNamespace;
}>;

declare namespace App {
  interface Locals extends Runtime {}
}
