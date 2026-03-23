"use server";

import { z } from "zod";

// Schema for ending a study session
export const endStudySessionSchema = z.object({
  sessionId: z.string().uuid(),
  lessonId: z.string().uuid(),
  stats: z.object({
    wordsStudied: z.number().int().min(0).max(200),
    durationSeconds: z.number().int().min(5).max(14400), // 5s to 4 hours
  }),
  pendingNotes: z.array(z.object({
    wordId: z.string().uuid(),
    userNotes: z.string().max(2000).nullable().optional(),
  })),
});

export type EndStudySessionInput = z.infer<typeof endStudySessionSchema>;

// Schema for completing a test session
export const completeTestSessionSchema = z.object({
  sessionId: z.string().uuid(),
  lessonId: z.string().uuid(),
  stats: z.object({
    totalQuestions: z.number().int().min(1).max(400),
    correctAnswers: z.number().int().min(0),
    pointsEarned: z.number().int().min(0),
    maxPoints: z.number().int().min(0),
    scorePercent: z.number().min(0).max(100),
    durationSeconds: z.number().int().min(2).max(14400),
    newWordsCount: z.number().int().min(0),
    masteredWordsCount: z.number().int().min(0),
  }),
  questionResults: z.array(z.object({
    wordId: z.string().uuid(),
    userAnswer: z.string().max(500),
    correctAnswer: z.string().max(500),
    clueLevel: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    mistakeCount: z.number().int().min(0),
    pointsEarned: z.number().int().min(0).max(3),
    maxPoints: z.number().int().min(0).max(3),
    timeToAnswerMs: z.number().int().min(0).optional(),
  })),
  intendedMilestone: z.string().nullable().optional(),
});

export type CompleteTestSessionInput = z.infer<typeof completeTestSessionSchema>;
