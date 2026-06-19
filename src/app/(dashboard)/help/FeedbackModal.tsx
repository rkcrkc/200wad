"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { PrimaryButton } from "@/components/ui/primary-button";
import {
  ModalShell,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal-shell";

interface FeedbackModalProps {
  onClose: () => void;
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError("Please enter a message before sending.");
      return;
    }

    setSubmitting(true);
    try {
      // TODO: wire up to feedback submission endpoint.
      // Payload: { message } — sender is the logged-in user's account email.
      await new Promise((resolve) => setTimeout(resolve, 400));
      toast.success("Thanks for your feedback!");
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell maxWidth="md" className="max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <ModalHeader className="relative pt-8 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-xl-semibold mb-2">Give feedback</h1>
          <p className="text-sm text-muted-foreground">
            Spotted a bug or have an idea? Let us know — we read everything.
          </p>
        </ModalHeader>

        <ModalBody className="bg-bone">
          <div className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="feedback-message"
                className="text-small-semibold text-foreground mb-1 block"
              >
                Message
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                placeholder="Your message..."
                className="border-border bg-white text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 block w-full resize-none rounded-lg border px-4 py-3 text-sm transition-colors focus:ring-2 focus:outline-none"
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <div className="flex flex-col items-center gap-3">
            <PrimaryButton type="submit" loading={submitting} fullWidth>
              Send feedback
            </PrimaryButton>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </ModalFooter>
      </form>
    </ModalShell>
  );
}
