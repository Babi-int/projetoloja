/**
 * Proxy same-origin /api/* → backend (evita CORS no browser).
 * No painel da Vercel defina VERCEL_BACKEND_URL (ex.: https://seu-app.onrender.com), sem /api no final.
 * Marque a variável para estar disponível em Edge Middleware (ambientes Production / Preview).
 * Alternativa: build com VITE_API_URL=https://.../api e FRONTEND_URL na API apontando para este site.
 */
export const config = {
  matcher: ["/api", "/api/:path*"]
};

export default async function middleware(request) {
  const backendRaw = process.env.VERCEL_BACKEND_URL?.trim();
  if (!backendRaw) {
    return new Response(
      JSON.stringify({
        message:
          "Configure VERCEL_BACKEND_URL na Vercel (Edge), ex.: https://seu-api.onrender.com, ou use build com VITE_API_URL=https://.../api."
      }),
      {
        status: 503,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      }
    );
  }

  const base = backendRaw.replace(/\/+$/, "").replace(/\/api$/i, "");
  const url = new URL(request.url);
  const targetUrl = `${base}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const hasBody = !["GET", "HEAD"].includes(request.method);

  /** @type {RequestInit} */
  const init = {
    method: request.method,
    headers,
    redirect: "follow",
    ...(hasBody && { body: request.body, duplex: "half" })
  };

  try {
    const upstream = await fetch(targetUrl, init);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ message: "Falha ao contatar a API", detail: msg }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
}
