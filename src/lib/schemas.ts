import { z } from "zod";

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const LOCALES = ["pt", "en"] as const;
export const TOPICS = [
  "business",
  "daily-use",
  "configuration",
  "automation",
] as const;

export const QUESTIONS_PER_ROUND = 10;

export const LevelSchema = z.enum(LEVELS);
export const LocaleSchema = z.enum(LOCALES);
export const TopicSchema = z.enum(TOPICS);

export type Level = z.infer<typeof LevelSchema>;
export type Locale = z.infer<typeof LocaleSchema>;
export type Topic = z.infer<typeof TopicSchema>;

const LocalizedTextSchema = z.object({
  pt: z.string().trim().min(1),
  en: z.string().trim().min(1),
});

const ID_PREFIX: Record<Level, string> = {
  beginner: "beg",
  intermediate: "int",
  advanced: "adv",
};

export const QuestionSchema = z
  .object({
    id: z.string().regex(/^(beg|int|adv)-\d{3}$/),
    level: LevelSchema,
    topic: TopicSchema,
    answer: z.boolean(),
    statement: LocalizedTextSchema,
    explanation: LocalizedTextSchema,
    sourceUrl: z.string().regex(/^https:\/\/\S+$/),
    reviewed: z.boolean(),
  })
  .refine((q) => q.id.startsWith(`${ID_PREFIX[q.level]}-`), {
    message: "id prefix must match level",
    path: ["id"],
  });

export type Question = z.infer<typeof QuestionSchema>;
export const QuestionBankSchema = z.array(QuestionSchema);

/** What the client receives during a round: no answer, no explanation. */
export type PublicQuestion = { id: string; statement: string };

// ---- API request bodies ----

export const StartQuizBodySchema = z.object({
  level: LevelSchema,
  locale: LocaleSchema,
});

export const SubmitQuizBodySchema = z.object({
  sessionId: z.uuid(),
  answers: z.record(z.string(), z.boolean()),
});

export const PublishBodySchema = z.object({
  sessionId: z.uuid(),
  nickname: z.string().max(100),
});

export const LeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// ---- API responses ----

export type ReviewItem = {
  id: string;
  statement: string;
  userAnswer: boolean;
  correctAnswer: boolean;
  isCorrect: boolean;
  explanation: string;
  sourceUrl: string;
};

export type QuizResult = {
  sessionId: string;
  level: Level;
  score: number;
  correctCount: number;
  total: number;
  durationMs: number;
  canPublish: boolean;
  published: boolean;
  review: ReviewItem[];
};

export type LeaderboardEntry = {
  rank: number;
  nickname: string;
  level: Level;
  score: number;
  correctCount: number;
  durationMs: number;
  createdAt: string;
  sessionId: string;
};

export type ApiErrorCode =
  | "validation"
  | "not_found"
  | "already_submitted"
  | "already_published"
  | "not_finished"
  | "expired"
  | "too_fast"
  | "invalid_nickname"
  | "rate_limited"
  | "server_error";
