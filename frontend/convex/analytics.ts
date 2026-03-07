import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDashboardStats = query({
    args: { area_name: v.optional(v.string()) },
    handler: async (ctx, args) => {
        let binsQuery = ctx.db.query("bins");
        if (args.area_name) {
            binsQuery = binsQuery.filter((q) => q.eq(q.field("area_name"), args.area_name));
        }
        const bins = await binsQuery.collect();

        let complaintsQuery = ctx.db.query("complaints");
        if (args.area_name) {
            complaintsQuery = complaintsQuery.filter((q) => q.eq(q.field("area_name"), args.area_name));
        }
        const activeComplaints = await complaintsQuery
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "open"),
                    q.eq(q.field("status"), "in_progress")
                )
            )
            .collect();

        const binStats = await Promise.all(
            bins.map(async (bin) => {
                const latestReading = await ctx.db
                    .query("bin_readings")
                    .withIndex("by_bin_id", (q) => q.eq("bin_id", bin.bin_id))
                    .order("desc")
                    .first();
                return {
                    fillLevel: latestReading?.fill_level_percent ?? 0,
                };
            })
        );

        const totalBins = bins.length;
        const highFillBins = binStats.filter((s) => s.fillLevel >= 80).length;
        const avgFillLevel = totalBins > 0
            ? binStats.reduce((acc, s) => acc + s.fillLevel, 0) / totalBins
            : 0;

        return {
            total_bins: totalBins,
            bins_needing_collection: highFillBins,
            waste_collected_today_kg: 0, // Placeholder
            active_complaints: activeComplaints.length,
            average_fill_level: Math.round(avgFillLevel * 10) / 10,
        };
    },
});

export const getFillLevelTrends = query({
    args: { area_name: v.optional(v.string()), days: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const days = args.days ?? 7;
        const since = Date.now() - days * 24 * 60 * 60 * 1000;

        let readingsQuery = ctx.db.query("bin_readings");
        // Note: Filtering by area would require joining with bins, 
        // which is complex in a single query without a denormalized field.
        // For simplicity, we'll get all readings and group them.

        const readings = await readingsQuery
            .filter((q) => q.gte(q.field("timestamp"), since))
            .collect();

        // Group by date (very simplified)
        const groups: Record<string, { total: number; count: number }> = {};
        readings.forEach((r) => {
            const date = new Date(r.timestamp).toISOString().split('T')[0];
            if (!groups[date]) groups[date] = { total: 0, count: 0 };
            groups[date].total += r.fill_level_percent;
            groups[date].count += 1;
        });

        return Object.entries(groups).map(([date, data]) => ({
            date,
            avg_fill_level: Math.round((data.total / data.count) * 10) / 10,
        })).sort((a, b) => a.date.localeCompare(b.date));
    },
});
