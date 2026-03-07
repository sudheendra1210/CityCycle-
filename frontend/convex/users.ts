import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByClerkId = query({
    args: { clerk_id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
            .unique();
    },
});

export const getByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
    },
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("users").collect();
    },
});

export const upsert = mutation({
    args: {
        clerk_id: v.string(),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        phone: v.optional(v.string()),
        role: v.optional(v.string()),
        area: v.optional(v.string()),
        is_phone_verified: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { is_phone_verified, ...other_args } = args;
        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
            .unique();

        if (existing) {
            return await ctx.db.patch(existing._id, {
                ...other_args,
                is_phone_verified: is_phone_verified ?? existing.is_phone_verified
            });
        } else {
            return await ctx.db.insert("users", {
                ...other_args,
                created_at: Date.now(),
                is_phone_verified: is_phone_verified ?? false,
            });
        }
    },
});

export const promoteByEmail = mutation({
    args: {
        email: v.string(),
        role: v.string(),
        name: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();

        if (user) {
            await ctx.db.patch(user._id, {
                role: args.role,
                name: args.name ?? user.name
            });
            return user._id;
        }
        return null;
    }
});
