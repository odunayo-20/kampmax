"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Archive,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  Package,
  Tag,
  DollarSign,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { cn, formatNaira, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ProductPublishBadge, ProductStockBadge, getProductDisplayStatus } from "./product-meta";
import type { Product } from "@/types";
import type { ProductPublishStatus } from "@/types/vendor-products";
import { getProductPublishAvailability } from "@/types/vendor-products";
import {
  ProductGallery,
  ProductInfoHeader,
  ProductSpecs,
  ProductDescription,
  VendorCard,
  CampusDelivery,
  getVariantGroups,
  getPersonalizationFields,
  getSpecs,
} from "@/components/marketplace";
import { EMPTY_CAMPUS, getCampuses } from "@/services/campus";
import { getVendorById } from "@/services/users";
import { getCategoryById, fetchCategories } from "@/services/categories";

interface ProductDetailProps {
  product: Product;
  onEdit: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onInventory: () => void;
}

export function ProductDetail({
  product,
  onEdit,
  onPublish,
  onUnpublish,
  onArchive,
  onRestore,
  onDelete,
  onInventory,
}: ProductDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"preview" | "details" | "inventory">("preview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const vendor = getVendorById(product.vendorId);
  const campus = getCampuses().find((c) => c.id === product.campusId) ?? EMPTY_CAMPUS;
  // Category names live in a fetched cache; load it so the id never shows through.
  const [, setCategoriesLoaded] = useState(false);
  useEffect(() => {
    fetchCategories({ limit: 100 }).then(() => setCategoriesLoaded(true));
  }, []);
  const category = getCategoryById(product.categoryId);

  const gallery = product.images.length > 0
    ? product.images
    : ["/placeholder-product.svg"];

  const variantGroups = getVariantGroups(product.id, product.categoryId);
  const personalizationFields = getPersonalizationFields(product.id, product.categoryId);
  const specs = getSpecs(product.id, product.categoryId);

  const { publishStatus, stockStatus, availabilityStatus } = getProductDisplayStatus(product);
  const availability = getProductPublishAvailability(publishStatus);

  const hasVariants = variantGroups.length > 0;
  const effectivePrice = product.price;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-kampmax-text" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-kampmax-text truncate max-w-[300px]">{product.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <ProductPublishBadge status={publishStatus} />
              <ProductStockBadge status={stockStatus} />
              {product.sku && (
                <span className="font-mono text-[11px] text-kampmax-text-secondary">{product.sku}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onInventory} className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Inventory
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
          <div className="relative">
            <button
              type="button"
              className="w-9 h-9 rounded-lg bg-kampmax-error/10 text-kampmax-error flex items-center justify-center"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Delete product"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {publishStatus === "draft" && (
        <div className="bg-kampmax-muted/50 border border-kampmax-border rounded-lg p-3">
          <div className="flex items-center gap-2">
            <EyeOff className="h-5 w-5 text-kampmax-text-secondary" />
            <div className="text-sm text-kampmax-text-secondary">
              <p className="font-medium">Draft — not visible on storefront</p>
              <p>Publish when ready to make it visible to customers.</p>
            </div>
          </div>
        </div>
      )}

      {publishStatus === "archived" && (
        <div className="bg-kampmax-warning/10 border border-kampmax-warning/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-kampmax-warning" />
            <div className="text-sm text-kampmax-warning">
              <p className="font-medium">Archived</p>
              <p>This product is hidden from storefront. Restore to make it editable again.</p>
            </div>
          </div>
        </div>
      )}

      {publishStatus === "rejected" && (
        <div className="bg-kampmax-error/10 border border-kampmax-error/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-kampmax-error" />
            <div className="text-sm text-kampmax-error">
              <p className="font-medium">Rejected</p>
              <p>This product was rejected during review. Edit and resubmit for approval.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-kampmax-border">
        <nav className="flex gap-1" role="tablist" aria-label="Product detail sections">
          <TabButton
            active={activeTab === "preview"}
            onClick={() => setActiveTab("preview")}
            label="Storefront Preview"
            icon={<Eye className="h-4 w-4" />}
          />
          <TabButton
            active={activeTab === "details"}
            onClick={() => setActiveTab("details")}
            label="Details"
            icon={<Tag className="h-4 w-4" />}
          />
          <TabButton
            active={activeTab === "inventory"}
            onClick={() => setActiveTab("inventory")}
            label="Inventory"
            icon={<Package className="h-4 w-4" />}
          />
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === "preview" && (
        <ProductPreview
          product={product}
          gallery={gallery}
          vendor={vendor}
          campus={campus}
          variantGroups={variantGroups}
          personalizationFields={personalizationFields}
          specs={specs}
          effectivePrice={effectivePrice}
          hasVariants={hasVariants}
          publishStatus={publishStatus}
          stockStatus={stockStatus}
          availabilityStatus={availabilityStatus}
        />
      )}

      {activeTab === "details" && (
        <ProductDetailsPanel product={product} category={category} vendor={vendor} campus={campus} />
      )}

      {activeTab === "inventory" && (
        <ProductInventorySummary product={product} stockStatus={stockStatus} />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <h3 className="text-base font-bold text-kampmax-text mb-2">Delete Product?</h3>
            <p className="text-sm text-kampmax-text-secondary mb-4">
              This action cannot be undone. The product will be permanently removed.
              {product.soldCount && product.soldCount > 0 && (
                <span className="text-kampmax-warning"> This product has order history and will be archived instead.</span>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => { onDelete(); setShowDeleteConfirm(false); }} className="flex-1">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
        active
          ? "border-kampmax-blue text-kampmax-blue"
          : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text hover:border-kampmax-border"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ProductPreview({
  product,
  gallery,
  vendor,
  campus,
  variantGroups,
  personalizationFields,
  specs,
  effectivePrice,
  hasVariants,
  publishStatus,
  stockStatus,
  availabilityStatus,
}: {
  product: Product;
  gallery: string[];
  vendor: any;
  campus: any;
  variantGroups: any[];
  personalizationFields: any;
  specs: any[];
  effectivePrice: number;
  hasVariants: boolean;
  publishStatus: ProductPublishStatus;
  stockStatus: string;
  availabilityStatus: Product["status"];
}) {
  const isSold = availabilityStatus === "sold";
  const isRemoved = availabilityStatus === "removed";
  const isUnavailable = isSold || isRemoved || publishStatus !== "active";
  const inStock = stockStatus !== "out_of_stock" && !isUnavailable;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-kampmax-border bg-white overflow-hidden">
        <ProductGallery
          images={gallery}
          title={product.title}
          hasDiscount={!!product.originalPrice && product.originalPrice > effectivePrice}
          discountPct={product.originalPrice && product.originalPrice > effectivePrice
            ? Math.round(((product.originalPrice - effectivePrice) / product.originalPrice) * 100)
            : 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ProductInfoHeader
            product={product}
            effectivePrice={effectivePrice}
            inStock={inStock}
            lowStock={stockStatus === "low_stock"}
            variantStock={product.stock ?? 0}
            isSold={isSold}
            isRemoved={isRemoved}
            hasDiscount={!!product.originalPrice && product.originalPrice > effectivePrice}
            discountPct={product.originalPrice && product.originalPrice > effectivePrice
              ? Math.round(((product.originalPrice - effectivePrice) / product.originalPrice) * 100)
              : 0}
          />

          {hasVariants && (
            <div className="bg-white rounded-xl border border-kampmax-border p-4">
              <h3 className="text-sm font-semibold text-kampmax-text mb-3">Variants (Preview)</h3>
              <div className="space-y-2">
                {variantGroups.map((group) => (
                  <div key={group.id}>
                    <label className="block text-xs font-medium text-kampmax-text-secondary mb-1">{group.name} {group.required && <span className="text-kampmax-error">*</span>}</label>
                    <select className="w-full px-3 py-2 rounded-lg border border-kampmax-border text-sm bg-white">
                      <option value="">Select {group.name}</option>
                      {group.options.map((opt: any) => (
                        <option key={opt.id} value={opt.id} disabled={!opt.available}>
                          {opt.value} {opt.priceModifier && `(+₦${opt.priceModifier.toLocaleString()})`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {personalizationFields && (
            <div className="bg-white rounded-xl border border-kampmax-border p-4">
              <h3 className="text-sm font-semibold text-kampmax-text mb-3">Personalization (Preview)</h3>
              <div className="space-y-2">
                {personalizationFields.map((field: any) => (
                  <div key={field.id}>
                    <label className="block text-xs font-medium text-kampmax-text-secondary mb-1">{field.label} {field.required && <span className="text-kampmax-error">*</span>}</label>
                    {field.type === "text" && (
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 rounded-lg border border-kampmax-border text-sm bg-white"
                        disabled
                      />
                    )}
                    {field.type === "textarea" && (
                      <textarea
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 rounded-lg border border-kampmax-border text-sm bg-white resize-none"
                        disabled
                      />
                    )}
                    {field.type === "select" && (
                      <select className="w-full px-3 py-2 rounded-lg border border-kampmax-border text-sm bg-white" disabled>
                        <option value="">Select</option>
                        {field.options?.map((opt: any) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <ProductDescription description={product.description} />
          <ProductSpecs specs={specs} productId={product.id} createdAt={product.createdAt} tags={product.tags} />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-kampmax-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-kampmax-text">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant={publishStatus === "active" ? "outline" : "primary"} className="w-full justify-start gap-2" onClick={() => {}}>
                {publishStatus === "active" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {publishStatus === "active" ? "Unpublish" : "Publish"}
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => {}}>
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            </div>
          </div>

          <VendorCard vendor={vendor} campusName={campus.name} productLocation={product.location} />
          <CampusDelivery campus={campus} productLocation={product.location} />
        </div>
      </div>
    </div>
  );
}

function ProductDetailsPanel({
  product,
  category,
  vendor,
  campus,
}: {
  product: Product;
  category: any;
  vendor: any;
  campus: any;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-kampmax-border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-kampmax-text">Product Information</h3>
        <dl className="space-y-2 text-sm">
          <DetailRow label="Product ID" value={product.id} />
          <DetailRow label="SKU" value={product.sku ?? "—"} />
          <DetailRow label="Category" value={category?.name ?? "—"} />
          <DetailRow label="Condition" value={product.condition} />
          <DetailRow label="Price" value={formatNaira(product.price)} />
          {product.originalPrice && product.originalPrice > product.price && (
            <DetailRow label="Original Price" value={formatNaira(product.originalPrice)} />
          )}
          <DetailRow label="Stock" value={product.stock?.toLocaleString("en-NG") ?? "—"} />
          <DetailRow label="Reserved" value={product.reservedStock?.toLocaleString("en-NG") ?? "0"} />
          <DetailRow label="Low Stock Threshold" value={product.lowStockThreshold?.toString() ?? "5"} />
          {product.costPrice && <DetailRow label="Cost Price (Internal)" value={formatNaira(product.costPrice)} />}
          <DetailRow label="Has Variants" value={product.hasVariants ? "Yes" : "No"} />
          <DetailRow label="Allow Delivery" value={product.allowDelivery ? "Yes" : "No"} />
          <DetailRow label="Allow Pickup" value={product.allowPickup ? "Yes" : "No"} />
          {product.deliveryFee && <DetailRow label="Delivery Fee" value={formatNaira(product.deliveryFee)} />}
          <DetailRow label="Location" value={product.location ?? "—"} />
          <DetailRow label="Tags" value={product.tags?.join(", ") ?? "—"} />
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-kampmax-border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-kampmax-text">Publication & Timestamps</h3>
        <dl className="space-y-2 text-sm">
          <DetailRow label="Published Status" value={
            <ProductPublishBadge status={product.publishedStatus ?? "active"} />
          } />
          <DetailRow label="Availability Status" value={
            <StatusBadge
              variant={product.status === "available" ? "success" : product.status === "sold" ? "error" : "warning"}
              label={product.status}
            />
          } />
          <DetailRow label="Created" value={timeAgo(product.createdAt)} />
          {product.updatedAt && <DetailRow label="Last Updated" value={timeAgo(product.updatedAt)} />}
          {product.archivedAt && <DetailRow label="Archived At" value={timeAgo(product.archivedAt)} />}
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-kampmax-border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-kampmax-text">Vendor & Campus</h3>
        <dl className="space-y-2 text-sm">
          <DetailRow label="Vendor" value={vendor?.storeName ?? product.vendorId} />
          <DetailRow label="Campus" value={campus?.name ?? product.campusId} />
          <DetailRow label="View Count" value={product.viewCount?.toLocaleString("en-NG") ?? "0"} />
          <DetailRow label="Save Count" value={product.saveCount?.toLocaleString("en-NG") ?? "0"} />
          <DetailRow label="Sold Count" value={product.soldCount?.toLocaleString("en-NG") ?? "0"} />
          {product.rating && <DetailRow label="Rating" value={`${product.rating} (${product.ratingCount ?? 0} reviews)`} />}
        </dl>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <dt className="text-kampmax-text-secondary w-full sm:w-40">{label}</dt>
      <dd className="text-kampmax-text font-mono text-sm">{value}</dd>
    </div>
  );
}

function ProductInventorySummary({ product, stockStatus }: { product: Product; stockStatus: string }) {
  const currentStock = product.stock ?? 0;
  const reservedStock = product.reservedStock ?? 0;
  const availableStock = currentStock - reservedStock;
  const threshold = product.lowStockThreshold ?? 5;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-kampmax-border p-4 text-center">
          <p className="text-xs font-medium text-kampmax-text-secondary uppercase tracking-wide">Total Stock</p>
          <p className="text-3xl font-bold text-kampmax-text mt-1">{currentStock.toLocaleString("en-NG")}</p>
        </div>
        <div className="bg-white rounded-xl border border-kampmax-border p-4 text-center">
          <p className="text-xs font-medium text-kampmax-text-secondary uppercase tracking-wide">Reserved</p>
          <p className="text-3xl font-bold text-kampmax-warning mt-1">{reservedStock.toLocaleString("en-NG")}</p>
        </div>
        <div className="bg-white rounded-xl border border-kampmax-border p-4 text-center">
          <p className="text-xs font-medium text-kampmax-text-secondary uppercase tracking-wide">Available</p>
          <p className="text-3xl font-bold text-kampmax-success mt-1">{availableStock.toLocaleString("en-NG")}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-kampmax-border p-4">
        <h3 className="text-sm font-semibold text-kampmax-text mb-3">Stock Status</h3>
        <div className="flex items-center gap-3">
          <ProductStockBadge status={stockStatus as any} />
          <div className="text-sm text-kampmax-text-secondary">
            {stockStatus === "out_of_stock" && "Product is out of stock"}
            {stockStatus === "low_stock" && `Low stock (≤ ${threshold})`}
            {stockStatus === "in_stock" && "In stock"}
          </div>
        </div>
      </div>
    </div>
  );
}