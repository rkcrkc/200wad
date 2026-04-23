"use client";

import { useState } from "react";
import { PrimaryButton } from "@/components/ui/primary-button";
import { cn } from "@/lib/utils";
import {
  TestType,
  TEST_TYPE_LABELS,
  TEST_TYPE_DESCRIPTIONS,
  DEFAULT_TEST_TYPE,
} from "@/types/test";
import { Check, Image, X } from "lucide-react";

// Map language names to flag emojis
const LANGUAGE_FLAGS: Record<string, string> = {
  "Italian": "🇮🇹",
  "Spanish": "🇪🇸",
  "French": "🇫🇷",
  "German": "🇩🇪",
  "Portuguese": "🇵🇹",
  "Dutch": "🇳🇱",
  "Polish": "🇵🇱",
  "Russian": "🇷🇺",
  "Japanese": "🇯🇵",
  "Chinese": "🇨🇳",
  "Korean": "🇰🇷",
};

const ENGLISH_FLAG = "🇬🇧";

interface StartTestModalProps {
  languageName: string;
  lessonTitle: string;
  wordCount: number;
  /** Number of words that have memory trigger images (for picture-only mode) */
  wordsWithImages: number;
  defaultTestType?: TestType;
  onStart: (testType: TestType, testTwice: boolean) => void;
  onCancel: () => void;
}

export function StartTestModal({
  languageName,
  lessonTitle,
  wordCount,
  wordsWithImages,
  defaultTestType = DEFAULT_TEST_TYPE,
  onStart,
  onCancel,
}: StartTestModalProps) {
  const [selectedType, setSelectedType] = useState<TestType>(defaultTestType);
  const [testTwice, setTestTwice] = useState(false);

  // Picture-only mode is only available if there are words with images
  const pictureOnlyAvailable = wordsWithImages > 0;

  // Calculate total questions based on test type and test twice setting
  const effectiveWordCount = selectedType === "picture-only" ? wordsWithImages : wordCount;
  const totalQuestions = testTwice ? effectiveWordCount * 2 : effectiveWordCount;

  const foreignFlag = LANGUAGE_FLAGS[languageName] || "🌍";

  const testTypes: { type: TestType; icon: React.ReactNode }[] = [
    {
      type: "english-to-foreign",
      icon: <span className="text-xl">{foreignFlag}</span>,
    },
    {
      type: "foreign-to-english",
      icon: <span className="text-xl">{ENGLISH_FLAG}</span>,
    },
    {
      type: "picture-only",
      icon: <Image className="h-5 w-5" />,
    },
  ];

  // Replace "Foreign" with actual language name in labels
  const getLabel = (type: TestType) => {
    return TEST_TYPE_LABELS[type].replace("Foreign", languageName);
  };

  const getDescription = (type: TestType) => {
    return TEST_TYPE_DESCRIPTIONS[type].replace(/Foreign/g, languageName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        {/* Title row with close button */}
        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 className="text-xl-semibold text-foreground">{lessonTitle}</h2>
          <button
            onClick={onCancel}
            className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-gray-100 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-regular text-muted-foreground mb-6">
          {totalQuestions} questions
        </p>

        {/* Test type selection */}
        <div className="mb-6 space-y-3">
            {testTypes.map(({ type, icon }) => {
              const isDisabled = type === "picture-only" && !pictureOnlyAvailable;
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  onClick={() => !isDisabled && setSelectedType(type)}
                  disabled={isDisabled}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors",
                    isSelected
                      ? "bg-primary/5"
                      : "hover:bg-gray-50",
                    isDisabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      isSelected ? "bg-primary text-white" : "bg-gray-100 text-foreground"
                    )}
                  >
                    {icon}
                  </div>
                  <div className="flex-1">
                    <div className={cn(
                      "text-lg font-medium",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {getLabel(type)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getDescription(type)}
                    </div>
                    {type === "picture-only" && !pictureOnlyAvailable && (
                      <div className="text-small text-orange-500">
                        No words with images in this lesson
                      </div>
                    )}
                  </div>
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
        </div>

        {/* Divider */}
        <div className="mb-4 border-t border-gray-200" />

        {/* Test settings */}
        <label className="mb-6 flex cursor-pointer items-center gap-3 rounded-xl p-3 hover:bg-gray-50">
          <div
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
              testTwice ? "border-primary bg-primary" : "border-gray-300 bg-white"
            )}
            onClick={() => setTestTwice(!testTwice)}
          >
            {testTwice && <Check className="h-3 w-3 text-white" />}
          </div>
          <div>
            <span className="text-base font-medium text-foreground">Test twice</span>
            <p className="text-xs text-muted-foreground">Test each word twice for extra practice</p>
          </div>
        </label>

        {/* Actions */}
        <PrimaryButton fullWidth onClick={() => onStart(selectedType, testTwice)}>
          Start Test
        </PrimaryButton>
      </div>
    </div>
  );
}
