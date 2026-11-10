import "server-only";
import { getClientIp, hashIp } from "./security";
import type { ServiceContext, ServiceResult } from "./quiz-service";
import { getStore } from "./store";

/** Builds the service context for a Route Handler request. */
export function contextFor(request: Request): ServiceContext {
  const ip = getClientIp(request.headers);
  return {
    store: getStore(),
    ipHash: ip === "unknown" ? null : hashIp(ip),
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined; // fails schema validation → 400
  }
}

const NO_STORE = { "Cache-Control": "no-store" };

export function toResponse<T>(
  result: ServiceResult<T>,
  headers: HeadersInit = NO_STORE,
) {
  if (result.ok)
    return Response.json(result.data, { status: result.status, headers });
  return Response.json(
    { error: { code: result.code, message: result.message } },
    { status: result.status, headers: NO_STORE },
  );
}

export function serverError(error: unknown) {
  console.error(error);
  return Response.json(
    { error: { code: "server_error", message: "Unexpected error." } },
    { status: 500, headers: NO_STORE },
  );
}
