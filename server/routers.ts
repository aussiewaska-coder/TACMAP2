import { systemRouter } from "./_core/systemRouter.js";
import { publicProcedure, router } from "./_core/trpc.js";
import { z } from "zod";
import {
  getAllMapFeatures,
  getMapFeatureByKey,
  upsertMapFeature,
  updateMapFeatureEnabled,
  getAllMapStyles,
  getMapStyleById,
  upsertMapStyle,
  getPoliceReports,
  insertPoliceReports,
} from "./db.js";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,

  mapFeatures: router({
    list: publicProcedure.query(async () => {
      return await getAllMapFeatures();
    }),
    getByKey: publicProcedure
      .input(z.object({ featureKey: z.string() }))
      .query(async ({ input }) => {
        return await getMapFeatureByKey(input.featureKey);
      }),
    upsert: publicProcedure
      .input(z.object({
        featureKey: z.string().max(100),
        featureName: z.string().max(200),
        description: z.string().max(5000).optional(),
        enabled: z.boolean(),
        category: z.enum(["plugin", "control", "layer", "example"]),
        config: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ input }) => {
        await upsertMapFeature(input);
        return { success: true };
      }),
    toggleEnabled: publicProcedure
      .input(z.object({
        featureKey: z.string(),
        enabled: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await updateMapFeatureEnabled(input.featureKey, input.enabled);
        return { success: true };
      }),
  }),

  mapStyles: router({
    list: publicProcedure.query(async () => {
      return await getAllMapStyles();
    }),
    getById: publicProcedure
      .input(z.object({ styleId: z.string() }))
      .query(async ({ input }) => {
        return await getMapStyleById(input.styleId);
      }),
    upsert: publicProcedure
      .input(z.object({
        styleId: z.string(),
        styleName: z.string(),
        description: z.string().optional(),
        styleUrl: z.string(),
        thumbnailUrl: z.string().optional(),
        enabled: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await upsertMapStyle(input);
        return { success: true };
      }),
  }),

  police: router({
    list: publicProcedure
      .input(z.object({ hoursAgo: z.number().optional() }).optional())
      .query(async ({ input }) => {
        let minTimestamp: Date | undefined;
        if (input?.hoursAgo) {
          minTimestamp = new Date(Date.now() - input.hoursAgo * 60 * 60 * 1000);
        }
        try {
          return await getPoliceReports(minTimestamp);
        } catch (error) {
          console.error("Failed to fetch police reports:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch police reports",
            cause: error
          });
        }
      }),

    heatmap: publicProcedure
      .input(z.object({
        hoursAgo: z.number().optional().default(336), // 14 days default
        minLat: z.number().optional(),
        maxLat: z.number().optional(),
        minLon: z.number().optional(),
        maxLon: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const minTimestamp = new Date(Date.now() - (input.hoursAgo || 336) * 60 * 60 * 1000);

        try {
          const reports = await getPoliceReports(minTimestamp);

          // Filter by viewport if provided
          let filtered = reports;
          if (input.minLat && input.maxLat && input.minLon && input.maxLon) {
            filtered = reports.filter((r: any) =>
              r.latitude >= input.minLat! &&
              r.latitude <= input.maxLat! &&
              r.longitude >= input.minLon! &&
              r.longitude <= input.maxLon!
            );
          }

          // Aggregate by rounded lat/lon (0.01 degree precision ~1km)
          const buckets = new Map<string, number>();
          filtered.forEach((r: any) => {
            const lat = Math.round(r.latitude * 100) / 100;
            const lon = Math.round(r.longitude * 100) / 100;
            const key = `${lat},${lon}`;
            buckets.set(key, (buckets.get(key) || 0) + 1);
          });

          // Convert to [lat, lon, count] format
          const data: [number, number, number][] = [];
          buckets.forEach((count, key) => {
            const [lat, lon] = key.split(',').map(Number);
            data.push([lat, lon, count]);
          });

          return {
            count: data.length,
            data: data,
            cameras: [], // Not implemented yet
            camera_summary: { high: 0, medium: 0, low: 0 }
          };
        } catch (error) {
          console.error("Failed to fetch heatmap data:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch heatmap data",
            cause: error
          });
        }
      }),
  }),

  waze: router({
    getAlertsAndJams: publicProcedure
      .input(z.object({
        bottomLeft: z.string().optional(),
        topRight: z.string().optional(),
        center: z.string().optional(),
        radius: z.string().optional(),
        radiusUnits: z.enum(["KM", "MI"]).optional().default("KM"),
        maxAlerts: z.number().optional().default(20),
        maxJams: z.number().optional().default(20),
        alertTypes: z.string().optional(),
        alertSubtypes: z.string().optional(),
      }))
      .mutation(async ({ input }) => { // Changed to mutation since it modifies DB
        const apiKey = process.env.WAZE_API_KEY;
        if (!apiKey) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "WAZE_API_KEY is not configured",
          });
        }

        const params = new URLSearchParams();
        if (input.bottomLeft) params.append("bottom_left", input.bottomLeft);
        if (input.topRight) params.append("top_right", input.topRight);
        if (input.center) params.append("center", input.center);
        if (input.radius) params.append("radius", input.radius);

        params.append("radius_units", input.radiusUnits);
        params.append("max_alerts", input.maxAlerts.toString());
        params.append("max_jams", input.maxJams.toString());

        if (input.alertTypes) params.append("alert_types", input.alertTypes);
        if (input.alertSubtypes) params.append("alert_subtypes", input.alertSubtypes);

        try {
          const response = await fetch(`https://api.openwebninja.com/waze/alerts-and-jams?${params.toString()}`, {
            headers: {
              "x-api-key": apiKey,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Waze API error: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const data = await response.json();
          const alerts = data?.data?.alerts || [];

          if (alerts.length > 0) {
            const mappedAlerts = alerts.map((alert: any) => ({
              alertId: alert.alert_id,
              type: alert.type,
              subtype: alert.subtype,
              latitude: alert.latitude,
              longitude: alert.longitude,
              street: alert.street,
              city: alert.city,
              alertReliability: alert.alert_reliability,
              publishDatetimeUtc: new Date(alert.publish_datetime_utc),
            }));

            await insertPoliceReports(mappedAlerts);
          }

          return {
            success: true,
            count: alerts.length,
            data: data
          };
        } catch (error) {
          console.error("Failed to fetch Waze data:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch Waze data",
            cause: error,
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
