import type { NextRequest } from "next/server";
import { contextFor, readJson, serverError, toResponse } from "@/lib/api";
import { listLeaderboard, publishResult } from "@/lib/quiz-service";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const result = await listLeaderboard(
      {
        limit: params.get("limit") ?? undefined,
        offset: params.get("offset") ?? undefined,
      },
      contextFor(request),
    );
    // Short shared cache keeps free-tier load low (PRD §13).
    return toResponse(result, {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    return toResponse(
      await publishResult(await readJson(request), contextFor(request)),
    );
  } catch (error) {
    return serverError(error);
  }
}
