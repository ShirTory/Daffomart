import { collectionRoutes, itemRoutes } from "./crud";
import { db } from "./db";
import { hashPassword } from "./riderAuth";
import { ApiError } from "./http";
import { offerIsLive } from "./services";
import { slugify } from "@/lib/format";
import type { Banner, Category, DeliveryZone, Offer, Product, Rider } from "@/lib/types";
import { bannerSchema, categorySchema, offerSchema, productSchema, riderSchema, zoneSchema } from "@/lib/validators";

const now = () => new Date().toISOString();

async function uniqueSlug(base: string, selfId?: string) {
  const all = await db.list<Product>("products");
  const taken = new Set(all.filter((p) => p.id !== selfId).map((p) => p.slug));
  let s = slugify(base), n = 2;
  while (taken.has(s)) s = `${slugify(base)}-${n++}`;
  return s;
}

export const productCfg = {
  col: "products" as const, schema: productSchema,
  visible: (p: Product) => p.active,
  prepare: async (d: any, prev: Product | null): Promise<Omit<Product, "id">> => ({
    ...d,
    slug: await uniqueSlug(d.slug || d.name, prev?.id),
    images: (d.images ?? []).filter(Boolean),
    sold: prev?.sold ?? 0,
    createdAt: prev?.createdAt ?? now(), updatedAt: now(),
  }),
};

export const categoryCfg = {
  col: "categories" as const, schema: categorySchema,
  visible: (c: Category) => c.active,
  sort: (a: Category, b: Category) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  prepare: (d: any): Omit<Category, "id"> => ({ ...d, slug: slugify(d.slug || d.name) }),
  beforeDelete: async (id: string) => {
    const used = (await db.list<Product>("products")).filter((p) => p.categoryId === id).length;
    if (used) throw new ApiError(409, `This category has ${used} product(s). Move or delete them first.`);
  },
};

export const bannerCfg = {
  col: "banners" as const, schema: bannerSchema,
  visible: (b: Banner) => b.active,
  sort: (a: Banner, b: Banner) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt),
  prepare: (d: any, prev: Banner | null): Omit<Banner, "id"> => ({ ...d, createdAt: prev?.createdAt ?? now() }),
};

export const offerCfg = {
  col: "offers" as const, schema: offerSchema,
  visible: (o: Offer) => offerIsLive(o),
  sort: (a: Offer, b: Offer) => b.createdAt.localeCompare(a.createdAt),
  prepare: async (d: any, prev: Offer | null): Promise<Omit<Offer, "id">> => {
    if (d.code) {
      const dup = (await db.list<Offer>("offers")).find((o) => o.code === d.code && o.id !== prev?.id);
      if (dup) throw new ApiError(409, "This coupon code is already used by another offer");
    }
    return { ...d, createdAt: prev?.createdAt ?? now() };
  },
};

export const zoneCfg = {
  col: "zones" as const, schema: zoneSchema,
  visible: (z: DeliveryZone) => z.active,
  sort: (a: DeliveryZone, b: DeliveryZone) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  prepare: (d: any): Omit<DeliveryZone, "id"> => d,
  beforeDelete: async (id: string) => {
    const all = (await db.list<DeliveryZone>("zones")).filter((z) => z.active && z.id !== id);
    if (!all.length) throw new ApiError(409, "Keep at least one active delivery area so customers can check out.");
  },
};

/** Riders hold phone numbers: never visible to the public (non-admin GET returns an empty list). */
export const riderCfg = {
  col: "riders" as const, schema: riderSchema,
  visible: () => false,
  sort: (a: Rider, b: Rider) => a.name.localeCompare(b.name),
  prepare: async (d: any, prev: Rider | null): Promise<Omit<Rider, "id">> => {
    const { password, ...rest } = d;
    const dup = (await db.list<Rider>("riders")).find((x) => x.phone === d.phone && x.id !== prev?.id);
    if (dup) throw new ApiError(409, "Another rider already uses this phone number (it is the login ID)");
    const passHash = password ? hashPassword(password) : prev?.passHash;
    if (!passHash && !prev) throw new ApiError(400, "Set a login password for the rider (min 6 characters)");
    const live = prev?.locAt ? { lat: prev.lat, lng: prev.lng, locAt: prev.locAt } : {}; // GPS is written by the rider app, never by the admin form
    // application data + review result are written by the apply/review routes only, never by the admin form
    const app: Partial<Rider> = prev ? { status: prev.status, nidNumber: prev.nidNumber, permanentAddress: prev.permanentAddress, presentAddress: prev.presentAddress, referrerName: prev.referrerName, referrerPhone: prev.referrerPhone, referrerRelation: prev.referrerRelation, hasNid: prev.hasNid, appliedAt: prev.appliedAt, reviewedAt: prev.reviewedAt, rejectReason: prev.rejectReason } : { status: "approved" };
    return { ...rest, ...live, ...app, passHash, createdAt: prev?.createdAt ?? now() };
  },
  beforeDelete: async (id: string) => { await db.remove("nid", `${id}-front`); await db.remove("nid", `${id}-back`); },
  present: (r: Rider): Rider => { const { passHash, ...rest } = r; return { ...rest, hasPassword: Boolean(passHash) } as Rider; },
};

export const resource = {
  zones: { c: collectionRoutes<DeliveryZone>(zoneCfg), i: itemRoutes<DeliveryZone>(zoneCfg) },
  riders: { c: collectionRoutes<Rider>(riderCfg), i: itemRoutes<Rider>(riderCfg) },
  products: { c: collectionRoutes<Product>(productCfg), i: itemRoutes<Product>(productCfg) },
  categories: { c: collectionRoutes<Category>(categoryCfg), i: itemRoutes<Category>(categoryCfg) },
  banners: { c: collectionRoutes<Banner>(bannerCfg), i: itemRoutes<Banner>(bannerCfg) },
  offers: { c: collectionRoutes<Offer>(offerCfg), i: itemRoutes<Offer>(offerCfg) },
};
