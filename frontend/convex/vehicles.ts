import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("vehicles").collect();
    },
});

export const getById = query({
    args: { vehicle_id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("vehicles")
            .withIndex("by_vehicle_id", (q) => q.eq("vehicle_id", args.vehicle_id))
            .unique();
    },
});

export const create = mutation({
    args: {
        vehicle_id: v.string(),
        vehicle_type: v.string(),
        capacity_kg: v.number(),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("vehicles", args);
    },
});

export const updateLocation = mutation({
    args: {
        vehicle_id: v.string(),
        latitude: v.number(),
        longitude: v.number(),
    },
    handler: async (ctx, args) => {
        const vehicle = await ctx.db
            .query("vehicles")
            .withIndex("by_vehicle_id", (q) => q.eq("vehicle_id", args.vehicle_id))
            .unique();
        if (!vehicle) throw new Error("Vehicle not found");

        await ctx.db.patch(vehicle._id, {
            current_latitude: args.latitude,
            current_longitude: args.longitude,
        });
    },
});
