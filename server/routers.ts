import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getMapSettingsByUserId,
  upsertMapSettings,
  getAllMapFeatures,
  getMapFeatureByKey,
  upsertMapFeature,
  updateMapFeatureEnabled,
  getAllMapStyles,
  getMapStyleById,
  upsertMapStyle,
  getCustomLayersByUserId,
  upsertCustomLayer,
  deleteCustomLayer,
  getPoliceReports,
} from "./db";
import { TRPCError } from "@trpc/server";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      // Only clear cookie if we have Express response (not serverless)
      if (ctx.res && 'clearCookie' in ctx.res) {
        const cookieOptions = getSessionCookieOptions(ctx.req as any);
        (ctx.res as any).clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      }
      return {
        success: true,
      } as const;
    }),
  }),

  mapSettings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getMapSettingsByUserId(ctx.user.id);
      return settings || {
        centerLat: "-25.2744",
        centerLng: "133.7751",
        zoom: 4,
        pitch: 0,
        bearing: 0,
        activeStyleId: "streets",
        layerVisibility: {},
        layerOpacity: {},
      };
    }),
    update: protectedProcedure
      .input(z.object({
        centerLat: z.string().optional(),
        centerLng: z.string().optional(),
        zoom: z.number().optional(),
        pitch: z.number().optional(),
        bearing: z.number().optional(),
        activeStyleId: z.string().optional(),
        layerVisibility: z.record(z.string(), z.boolean()).optional(),
        layerOpacity: z.record(z.string(), z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertMapSettings({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),
  }),

  mapFeatures: router({
    list: publicProcedure.query(async () => {
      return await getAllMapFeatures();
    }),
    getByKey: publicProcedure
      .input(z.object({ featureKey: z.string() }))
      .query(async ({ input }) => {
        return await getMapFeatureByKey(input.featureKey);
      }),
    upsert: adminProcedure
      .input(z.object({
        featureKey: z.string(),
        featureName: z.string(),
        description: z.string().optional(),
        enabled: z.boolean(),
        category: z.enum(["plugin", "control", "layer", "example"]),
        config: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ input }) => {
        await upsertMapFeature(input);
        return { success: true };
      }),
    toggleEnabled: adminProcedure
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
    upsert: adminProcedure
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

  customLayers: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getCustomLayersByUserId(ctx.user.id);
    }),
    upsert: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        layerId: z.string(),
        layerName: z.string(),
        description: z.string().optional(),
        layerType: z.enum(["geojson", "raster", "vector", "heatmap", "cluster"]),
        dataSource: z.string().optional(),
        styleConfig: z.record(z.string(), z.unknown()).optional(),
        visible: z.boolean().optional(),
        opacity: z.number().optional(),
        zIndex: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertCustomLayer({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCustomLayer(input.id);
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
  }),
});

export type AppRouter = typeof appRouter;
