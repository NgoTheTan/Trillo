package com.example.trillo.dto.response;

import java.util.List;
import java.util.Map;

public record DashboardStatsResponse(
        // Overview
        long totalBoards,
        long totalCards,
        long completedCards,
        long totalMembers,

        // Chart 1: Cards by list/status (Pie or Bar chart)
        List<ChartDataPoint> cardsByList,

        // Chart 2: Cards by member workload (Bar chart)
        List<ChartDataPoint> cardsByMember,

        // Chart 3: Progress over time (Line chart) - cards created per day (last 30 days)
        List<TimeSeriesPoint> progressOverTime,

        // Chart 4: Completion rate
        double completionRate
) {
    public record ChartDataPoint(String label, long value) {}
    public record TimeSeriesPoint(String date, long count) {}
}
