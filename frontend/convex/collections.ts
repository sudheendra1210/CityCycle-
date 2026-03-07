import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
    args: { bin_id: v.optional(v.string()), vehicle_id: v.optional(v.string()) },
    handler: async (ctx, args) => {
        let q = ctx.db.query("collections");
        if (args.bin_id) {
            q = q.filter((f) => f.eq(f.field("bin_id"), args.bin_id));
        }
        if (args.vehicle_id) {
            q = q.filter((f) => f.eq(f.field("vehicle_id"), args.vehicle_id));
        }
        return await q.collect();
    },
});

export const create = mutation({
    args: {
        collection_id: v.string(),
        bin_id: v.string(),
        vehicle_id: v.string(),
        collection_timestamp: v.number(),
        waste_collected_kg: v.number(),
        organic_percent: v.optional(v.number()),
        plastic_percent: v.optional(v.number()),
        paper_percent: v.optional(v.number()),
        metal_percent: v.optional(v.number()),
        glass_percent: v.optional(v.number()),
        other_percent: v.optional(v.number()),
        duration_minutes: v.optional(v.number()),
        crew_size: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("collections", args);
    },
});

export const getStats = query({
    args: { days: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const days = args.days || 7;
        const since = Date.now() - (days * 24 * 60 * 60 * 1000);

        const collections = await ctx.db
            .query("collections")
            .filter((f) => f.gte(f.field("collection_timestamp"), since))
            .collect();

        // Group by date
        const daily: Record<string, any> = {};
        let totals = { organic: 0, plastic: 0, paper: 0, metal: 0, glass: 0, other: 0, count: 0 };

        for (const c of collections) {
            const date = new Date(c.collection_timestamp).toISOString().split('T')[0];
            if (!daily[date]) {
                daily[date] = { total_collections: 0, total_waste_kg: 0, total_duration: 0 };
            }
            daily[date].total_collections++;
            daily[date].total_waste_kg += c.waste_collected_kg;
            daily[date].total_duration += c.duration_minutes || 0;

            // Composition totals (check if values exist)
            if (c.organic_percent !== undefined) { totals.organic += c.organic_percent; totals.count++; }
            if (c.plastic_percent !== undefined) totals.plastic += c.plastic_percent;
            if (c.paper_percent !== undefined) totals.paper += c.paper_percent;
            if (c.metal_percent !== undefined) totals.metal += c.metal_percent;
            if (c.glass_percent !== undefined) totals.glass += c.glass_percent;
            if (c.other_percent !== undefined) totals.other += c.other_percent;
        }

        const avg_count = collections.length || 1;
        const composition = {
            organic: totals.organic / avg_count,
            plastic: totals.plastic / avg_count,
            paper: totals.paper / avg_count,
            metal: totals.metal / avg_count,
            glass: totals.glass / avg_count,
            other: totals.other / avg_count
        };

        return {
            daily: Object.entries(daily).map(([date, stats]) => ({
                date,
                ...stats,
                avg_duration: stats.total_collections > 0 ? stats.total_duration / stats.total_collections : 0
            })),
            composition
        };
    },
});
