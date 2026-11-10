import { contextFor, readJson, serverError, toResponse } from "@/lib/api";
import { submitQuiz } from "@/lib/quiz-service";

export async function POST(request: Request) {
  try {
    return toResponse(
      await submitQuiz(await readJson(request), contextFor(request)),
    );
  } catch (error) {
    return serverError(error);
  }
}
