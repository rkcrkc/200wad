"use client";

import { useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from "recharts";
import type { ChartServerData } from "@/lib/queries/stats";
import {
  type ChartMetric,
  type ChartInterval,
  METRIC_OPTIONS,
  DATE_RANGE_PRESETS,
  transformChartData,
  suggestInterval,
} from "@/lib/utils/chart";

interface LearningChartProps {
  data: ChartServerData;
}

// Legend config per metric
const LEGEND_CONFIG: Record<
  ChartMetric,
  { items: { color: string; label: string }[] }
> = {
  vocabulary: {
    items: [
      { color: "#0b6cff", label: "Total vocabulary" },
      { color: "#00c950", label: "Total mastered" },
    ],
  },
  dailyLearning: {
    items: [
      { color: "#ff9224", label: "Started learning" },
      { color: "#00c950", label: "Mastered today" },
    ],
  },
  performance: {
    items: [
      { color: "#00c950", label: "Course completion % (right axis)" },
      { color: "#0b6cff", label: "Words per day rate (left axis)" },
    ],
  },
};

export function LearningChart({ data }: LearningChartProps) {
  const [metric, setMetric] = useState<ChartMetric>("performance");
  const [interval, setInterval] = useState<ChartInterval>("daily");
  const [rangePreset, setRangePreset] = useState("all");

  // Compute date range from preset
  const { startDate, endDate } = useMemo(() => {
    const preset = DATE_RANGE_PRESETS.find((p) => p.id === rangePreset);
    if (!preset || preset.days === null) {
      return { startDate: null, endDate: null };
    }
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);
    start.setDate(start.getDate() - preset.days + 1);
    const toStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    return { startDate: toStr(start), endDate: toStr(end) };
  }, [rangePreset]);

  const chartPoints = useMemo(
    () =>
      transformChartData(
        data.dailyRows,
        data.totalCourseWords,
        metric,
        interval,
        startDate,
        endDate
      ),
    [data, metric, interval, startDate, endDate]
  );

  const handleRangeChange = useCallback((presetId: string) => {
    setRangePreset(presetId);
    setInterval(suggestInterval(presetId));
  }, []);

  const isEmpty = data.dailyRows.length === 0;
  const hasPoints = chartPoints.length > 0;

  // Thin out X-axis labels so they don't overlap
  const tickInterval =
    chartPoints.length <= 10 ? 0 : Math.floor(chartPoints.length / 8);

  // Custom tooltip
  const legendItems = LEGEND_CONFIG[metric].items;
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const v1 = payload.find((p) => p.dataKey === "value")?.value ?? 0;
    const v2 = payload.find((p) => p.dataKey === "value2")?.value ?? 0;
    return (
      <div className="rounded-lg bg-foreground px-3 py-2 text-sm text-white shadow-lg">
        <p className="font-medium">{label}</p>
        <p>
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: legendItems[0].color }}
          />
          {legendItems[0].label}: {metric === "performance" ? `${v1}%` : v1}
        </p>
        <p>
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: legendItems[1].color }}
          />
          {legendItems[1].label}: {v2}
        </p>
      </div>
    );
  };

  const intervalTabs: { id: ChartInterval; label: string }[] = [
    { id: "daily", label: "D" },
    { id: "weekly", label: "W" },
    { id: "monthly", label: "M" },
  ];

  // Shared X-axis props
  const xAxisProps = {
    dataKey: "label" as const,
    tick: { fontSize: 12, fill: "#888" },
    tickLine: false,
    axisLine: false,
    interval: tickInterval,
    padding: { left: 8, right: 8 } as const,
  };

  const yAxisProps = {
    tick: { fontSize: 12, fill: "#888" },
    tickLine: false,
    axisLine: false,
    width: 40,
  };

  const renderChart = () => {
    if (isEmpty) {
      return (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          Start studying to see your progress chart
        </div>
      );
    }
    if (!hasPoints) {
      return (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          No data for this date range
        </div>
      );
    }

    if (metric === "vocabulary") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartPoints}>
            <defs>
              <linearGradient id="gradient-vocab" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0b6cff" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#0b6cff" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradient-mastered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00c950" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#00c950" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0b6cff"
              strokeWidth={2}
              fill="url(#gradient-vocab)"
              dot={chartPoints.length <= 31}
            />
            <Area
              type="monotone"
              dataKey="value2"
              stroke="#00c950"
              strokeWidth={2}
              fill="url(#gradient-mastered)"
              dot={chartPoints.length <= 31}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (metric === "dailyLearning") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartPoints}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#ff9224"
              strokeWidth={2}
              dot={chartPoints.length <= 31}
              activeDot={{ r: 5, fill: "#ff9224" }}
            />
            <Line
              type="monotone"
              dataKey="value2"
              stroke="#00c950"
              strokeWidth={2}
              dot={chartPoints.length <= 31}
              activeDot={{ r: 5, fill: "#00c950" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    // performance: dual Y-axis — WPD on left, completion % on right
    return (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartPoints}>
          <XAxis {...xAxisProps} />
          <YAxis
            yAxisId="left"
            domain={[0, 250]}
            ticks={[0, 50, 100, 150, 200, 250]}
            {...yAxisProps}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tickFormatter={(v: number) => `${v}%`}
            {...yAxisProps}
          />
          <RechartsTooltip content={<CustomTooltip />} />
          {/* Grid lines — CartesianGrid doesn't work with dual Y-axes */}
          {[50, 100, 150, 200].map((v) => (
            <ReferenceLine
              key={v}
              yAxisId="left"
              y={v}
              stroke="#e5e5e5"
              strokeDasharray="3 3"
            />
          ))}
          {/* Course completion as a line with green fill below */}
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="value"
            fill="#00c950"
            fillOpacity={0.15}
            stroke="#00c950"
            strokeWidth={2}
            dot={chartPoints.length <= 31}
            activeDot={{ r: 5, fill: "#00c950" }}
            isAnimationActive={false}
          />
          <ReferenceLine
            yAxisId="left"
            y={200}
            stroke="#0b6cff"
            strokeWidth={2}
            strokeDasharray="2 4"
            strokeLinecap="round"
            label={{
              value: "200 words/day",
              position: "insideTopLeft",
              fill: "#0b6cff",
              fontSize: 11,
              fontWeight: 500,
            }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="value2"
            stroke="#0b6cff"
            strokeWidth={2}
            dot={chartPoints.length <= 31}
            activeDot={{ r: 5, fill: "#0b6cff" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      {/* Controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Metric selector */}
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as ChartMetric)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
        >
          {METRIC_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          {/* Interval toggle */}
          <div className="flex rounded-lg bg-[#F5F1EB] p-0.5">
            {intervalTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInterval(tab.id)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  interval === tab.id
                    ? "bg-white text-foreground shadow-sm"
                    : "text-foreground/50 hover:text-foreground/75"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date range presets */}
          <div className="flex rounded-lg bg-[#F5F1EB] p-0.5">
            {DATE_RANGE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleRangeChange(preset.id)}
                className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
                  rangePreset === preset.id
                    ? "bg-white text-foreground shadow-sm"
                    : "text-foreground/50 hover:text-foreground/75"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {renderChart()}

      {/* Legend */}
      {!isEmpty && hasPoints && (
        <div className="mt-3 flex items-center gap-5">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
