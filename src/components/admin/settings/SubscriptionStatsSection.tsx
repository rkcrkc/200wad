"use client";

import { Users, UserCheck, UserX, DollarSign } from "lucide-react";

interface SubscriptionStatsSectionProps {
  stats: {
    totalActive: number;
    totalCancelled: number;
    totalExpired: number;
    totalRevenueCents: number;
  };
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function SubscriptionStatsSection({
  stats,
}: SubscriptionStatsSectionProps) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Subscription Overview
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<UserCheck className="h-5 w-5 text-green-600" />}
          label="Active"
          value={stats.totalActive.toLocaleString("en-US")}
          color="bg-green-50"
        />
        <StatCard
          icon={<UserX className="h-5 w-5 text-orange-500" />}
          label="Cancelled"
          value={stats.totalCancelled.toLocaleString("en-US")}
          color="bg-orange-50"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-gray-500" />}
          label="Expired"
          value={stats.totalExpired.toLocaleString("en-US")}
          color="bg-gray-50"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-primary" />}
          label="Total Revenue"
          value={formatPrice(stats.totalRevenueCents)}
          color="bg-blue-50"
        />
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-card">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${color}`}>{icon}</div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
