import { NextRequest, NextResponse } from 'next/server';

const SERVICE_LTS_URL = process.env.SERVICE_LTS_URL ?? 'http://localhost:3000';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const url = new URL(request.url);
  const target = new URL(path.join('/'), SERVICE_LTS_URL.endsWith('/') ? SERVICE_LTS_URL : `${SERVICE_LTS_URL}/`);
  target.search = url.search;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : await request.text();

  const response = await fetch(target, {
    method: request.method,
    headers,
    body,
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('transfer-encoding');

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
