import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
    args: {
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let q = ctx.db.query("complaints");
        if (args.status) {
            q = q.filter((f) => f.eq(f.field("status"), args.status));
        }
        return await q.order("desc").collect();
    },
});

export const create = mutation({
    args: {
        complaint_id: v.string(),
        complaint_type: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        area_name: v.optional(v.string()),
        bin_id: v.optional(v.string()),
        description: v.optional(v.string()),
        urgency: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("complaints", {
            ...args,
            timestamp: Date.now(),
            status: "open",
        });
    },
});

export const resolve = mutation({
    args: {
        complaint_id: v.string(),
        citizen_rating: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const complaint = await ctx.db
            .query("complaints")
            .withIndex("by_complaint_id", (q) => q.eq("complaint_id", args.complaint_id))
            .unique();
        if (!complaint) throw new Error("Complaint not found");

        const resolved_at = Date.now();
        const resolution_hours = (resolved_at - complaint.timestamp) / (1000 * 60 * 60);

        await ctx.db.patch(complaint._id, {
            status: "resolved",
            resolved_at,
            resolution_hours,
            citizen_rating: args.citizen_rating,
        });
    },
});
