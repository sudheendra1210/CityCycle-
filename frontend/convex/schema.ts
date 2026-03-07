import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        clerk_id: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        phone: v.optional(v.string()),
        role: v.optional(v.string()), // "admin" | "worker" | "user"
        area: v.optional(v.string()),
        is_phone_verified: v.optional(v.boolean()),
        created_at: v.optional(v.number()), // timestamp
    }).index("by_clerk_id", ["clerk_id"])
        .index("by_email", ["email"]),

    bins: defineTable({
        bin_id: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        area_name: v.optional(v.string()),
        capacity_liters: v.number(),
        bin_type: v.string(), // "residential" | "commercial" | "public_space"
        sensor_type: v.optional(v.string()),
        zone: v.optional(v.string()),
        ward: v.optional(v.number()),
        status: v.string(), // "active" | "maintenance" | "inactive"
        installation_date: v.optional(v.number()),
        current_fill_level: v.optional(v.number()),
    }).index("by_bin_id", ["bin_id"]),

    bin_readings: defineTable({
        bin_id: v.string(),
        timestamp: v.number(),
        fill_level_percent: v.number(),
        weight_kg: v.optional(v.number()),
        temperature_c: v.optional(v.number()),
        battery_percent: v.optional(v.number()),
    }).index("by_bin_id", ["bin_id"]),

    vehicles: defineTable({
        vehicle_id: v.string(),
        vehicle_type: v.string(),
        capacity_kg: v.number(),
        status: v.string(), // "available" | "in_transit" | "maintenance"
        current_latitude: v.optional(v.number()),
        current_longitude: v.optional(v.number()),
    }).index("by_vehicle_id", ["vehicle_id"]),

    collections: defineTable({
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
    }).index("by_collection_id", ["collection_id"]),

    complaints: defineTable({
        complaint_id: v.string(),
        timestamp: v.number(),
        complaint_type: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        area_name: v.optional(v.string()),
        bin_id: v.optional(v.string()),
        description: v.optional(v.string()),
        urgency: v.optional(v.string()),
        status: v.string(), // "open" | "in_progress" | "resolved" | "closed"
        resolution_hours: v.optional(v.number()),
        citizen_rating: v.optional(v.number()),
        resolved_at: v.optional(v.number()),
    }).index("by_complaint_id", ["complaint_id"]),
});
