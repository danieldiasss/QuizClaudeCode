import type { NextRequest } from "next/server";
import { contextFor, serverError, toResponse } from "@/lib/api";
import { getResult } from "@/lib/quiz-service";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/quiz/result/[sessionId]">,
) {
  try {
    const { sessionId } = await ctx.params;
    const locale = request.nextUrl.searchParams.get("locale");
    return toResponse(await getResult(sessionId, locale, contextFor(request)));
  } catch (error) {
    return serverError(error);
  }
}
