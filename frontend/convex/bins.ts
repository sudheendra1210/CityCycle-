import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("bins").collect();
    },
});

export const getWithReadings = query({
    args: {},
    handler: async (ctx) => {
        const bins = await ctx.db.query("bins").collect();
        return await Promise.all(
            bins.map(async (bin) => {
                const latestReading = await ctx.db
                    .query("bin_readings")
                    .withIndex("by_bin_id", (q) => q.eq("bin_id", bin.bin_id))
                    .order("desc")
                    .first();
                return {
                    ...bin,
                    current_fill_level: latestReading?.fill_level_percent ?? 0,
                };
            })
        );
    },
});

export const getById = query({
    args: { bin_id: v.string() },
    handler: async (ctx, args) => {
        const bin = await ctx.db
            .query("bins")
            .withIndex("by_bin_id", (q) => q.eq("bin_id", args.bin_id))
            .unique();
        if (!bin) return null;

        const latestReading = await ctx.db
            .query("bin_readings")
            .withIndex("by_bin_id", (q) => q.eq("bin_id", args.bin_id))
            .order("desc")
            .first();

        return {
            ...bin,
            current_fill_level: latestReading?.fill_level_percent ?? 0,
        };
    },
});

export const create = mutation({
    args: {
        bin_id: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        area_name: v.optional(v.string()),
        capacity_liters: v.number(),
        bin_type: v.string(),
        sensor_type: v.optional(v.string()),
        zone: v.optional(v.string()),
        ward: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("bins", {
            ...args,
            status: "active",
            installation_date: Date.now(),
        });
    },
});

export const addReading = mutation({
    args: {
        bin_id: v.string(),
        fill_level_percent: v.number(),
        weight_kg: v.optional(v.number()),
        temperature_c: v.optional(v.number()),
        battery_percent: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const bin = await ctx.db
            .query("bins")
            .withIndex("by_bin_id", (q) => q.eq("bin_id", args.bin_id))
            .unique();
        if (!bin) throw new Error("Bin not found");

        await ctx.db.insert("bin_readings", {
            ...args,
            timestamp: Date.now(),
        });

        // Optionally update the bin status if it's full
        if (args.fill_level_percent >= 90) {
            // In a real app, this might trigger a notification via an action
        }
    },
});
export const getReadingsByBinId = query({
    args: { bin_id: v.string(), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        let q = ctx.db
            .query("bin_readings")
            .withIndex("by_bin_id", (q) => q.eq("bin_id", args.bin_id))
            .order("desc");

        if (args.limit) {
            return await q.take(args.limit);
        }
        return await q.collect();
    },
});
