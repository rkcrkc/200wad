"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmSubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  name: string;
  billingModel: string;
  amountCents: number;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getBillingLabel(model: string): string {
  if (model === "monthly") return "Monthly";
  if (model === "annual") return "Annual";
  if (model === "lifetime") return "Lifetime";
  return model;
}

function getBillingSuffix(model: string): string {
  if (model === "monthly") return "/month";
  if (model === "annual") return "/year";
  if (model === "lifetime") return " one-time";
  return "";
}

export function ConfirmSubscriptionDialog({
  isOpen,
  onClose,
  onConfirm,
  name,
  billingModel,
  amountCents,
}: ConfirmSubscriptionDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-large-semibold">Add to Cart</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-gray-100 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Add <strong>{name}</strong> {getBillingLabel(billingModel)} subscription to
          your cart?
        </p>

        <div className="mb-6 rounded-xl bg-gray-50 px-4 py-3 text-center">
          <span className="text-xl-semibold">
            {formatPrice(amountCents)}
          </span>
          <span className="text-sm text-muted-foreground">
            {getBillingSuffix(billingModel)}
          </span>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="flex-1">
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
