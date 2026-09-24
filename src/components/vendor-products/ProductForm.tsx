"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Image,
  Upload,
  Trash2,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Package,
  Tag,
  DollarSign,
  Settings,
  Globe,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { cn, formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ProductVariantGroup, ProductVariant, ProductVariantOption } from "@/types";
import { uploadFileDirect } from "@/services/media";
import { getCategoriesForVendorApi, getCampusesForVendorApi } from "@/services/vendor-products";
import type { Product, ProductCondition } from "@/types";
import { useUnsavedChangesWarning } from "./useUnsavedChanges";

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm resize-none focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20", className)} {...props} />;
}

function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-xs font-medium text-kampmax-text-secondary mb-1.5", className)} {...props}>{children}</label>;
}

function Checkbox({ className, checked, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={cn("h-4 w-4 rounded border-kampmax-border text-kampmax-blue focus:ring-kampmax-blue/20", className)} checked={checked} onChange={onChange} {...props} />;
}

function Switch({ className, checked, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("relative inline-flex items-center cursor-pointer", className)}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={onChange}
        {...props}
      />
      <div className={cn("w-11 h-6 rounded-full peer-focus:ring-2 peer-focus:ring-kampmax-blue peer-focus:ring-offset-2 transition-colors", checked ? "bg-kampmax-blue" : "bg-kampmax-border")} />
      <span className={cn("absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
    </label>
  );
}

interface ProductFormProps {
  initialData?: Product;
  onSave: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface ProductFormData {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  categoryId: string;
  campusId: string;
  condition: ProductCondition;
  images: string[];
  location?: string;
  tags: string[];
  stock: number;
  lowStockThreshold: number;
  costPrice?: number;
  sku?: string;
  hasVariants: boolean;
  variants?: ProductVariant[];
  variantGroups?: ProductVariantGroup[];
  publishedStatus: "draft" | "pending_review" | "active" | "inactive" | "rejected" | "archived";
  allowDelivery: boolean;
  allowPickup: boolean;
  deliveryFee?: number;
}

const CONDITIONS: ProductCondition[] = ["New", "Used", "Fair"];

const PUBLISH_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active (Visible on storefront)" },
  { value: "inactive", label: "Inactive (Hidden)" },
] as const;

function SectionHeader({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children?: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-kampmax-border rounded-xl bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-kampmax-blue" />
          <h3 className="text-sm font-semibold text-kampmax-text">{title}</h3>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-kampmax-text-secondary transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-4 pb-4 border-t border-kampmax-border">{children}</div>}
    </div>
  );
}

function DragHandle() {
  return (
    <button type="button" className="p-1 text-kampmax-text-secondary hover:text-kampmax-text" aria-label="Drag to reorder">
      <GripVertical className="h-5 w-5" />
    </button>
  );
}

export function ProductForm({ initialData, onSave, onCancel, isLoading }: ProductFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [formData, setFormData] = useState<ProductFormData>({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    price: initialData?.price ?? 0,
    originalPrice: initialData?.originalPrice,
    categoryId: initialData?.categoryId ?? "",
    campusId: initialData?.campusId ?? "rugipo",
    condition: initialData?.condition ?? "New",
    images: initialData?.images?.length ? [...initialData.images] : ["/placeholder-product.svg"],
    location: initialData?.location ?? "",
    tags: initialData?.tags ?? [],
    stock: initialData?.stock ?? 1,
    lowStockThreshold: initialData?.lowStockThreshold ?? 5,
    costPrice: initialData?.costPrice,
    sku: initialData?.sku?.toUpperCase() ?? "",
    hasVariants: initialData?.hasVariants ?? false,
    variants: initialData?.variants ? [...initialData.variants] : [],
    variantGroups: initialData?.variantGroups ? [...initialData.variantGroups] : [],
    publishedStatus: (initialData?.publishedStatus as ProductFormData["publishedStatus"]) ?? "draft",
    allowDelivery: initialData?.allowDelivery ?? true,
    allowPickup: initialData?.allowPickup ?? true,
    deliveryFee: initialData?.deliveryFee,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ProductFormData, boolean>>>({});
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    getCategoriesForVendorApi().then(setCategories).catch(() => {});
    getCampusesForVendorApi().then(setCampuses).catch(() => {});
  }, []);
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);

  const isDirty = useFormDirty(formData, initialData);
  useUnsavedChangesWarning(isDirty);

  function useFormDirty(current: ProductFormData, initial?: Product) {
    const initialRef = useRef<ProductFormData | null>(null);
    if (!initialRef.current && initial) {
      initialRef.current = {
        title: initial.title ?? "",
        description: initial.description ?? "",
        price: initial.price ?? 0,
        originalPrice: initial.originalPrice,
        categoryId: initial.categoryId ?? "",
        campusId: initial.campusId ?? "rugipo",
        condition: initial.condition ?? "New",
        images: initial.images?.length ? [...initial.images] : ["/placeholder-product.svg"],
        location: initial.location ?? "",
        tags: initial.tags ?? [],
        stock: initial.stock ?? 1,
        lowStockThreshold: initial.lowStockThreshold ?? 5,
        costPrice: initial.costPrice,
        sku: initial.sku?.toUpperCase() ?? "",
        hasVariants: initial.hasVariants ?? false,
        variants: initial.variants ? [...initial.variants] : [],
        variantGroups: initial.variantGroups ? [...initial.variantGroups] : [],
        publishedStatus: (initial.publishedStatus as ProductFormData["publishedStatus"]) ?? "draft",
        allowDelivery: initial.allowDelivery ?? true,
        allowPickup: initial.allowPickup ?? true,
        deliveryFee: initial.deliveryFee,
      };
    }
    if (!initialRef.current) return false;
    const init = initialRef.current;
    return (
      current.title !== init.title ||
      current.description !== init.description ||
      current.price !== init.price ||
      current.originalPrice !== init.originalPrice ||
      current.categoryId !== init.categoryId ||
      current.campusId !== init.campusId ||
      current.condition !== init.condition ||
      JSON.stringify(current.images) !== JSON.stringify(init.images) ||
      current.location !== init.location ||
      JSON.stringify(current.tags) !== JSON.stringify(init.tags) ||
      current.stock !== init.stock ||
      current.lowStockThreshold !== init.lowStockThreshold ||
      current.costPrice !== init.costPrice ||
      current.sku !== init.sku ||
      current.hasVariants !== init.hasVariants ||
      JSON.stringify(current.variants) !== JSON.stringify(init.variants) ||
      JSON.stringify(current.variantGroups) !== JSON.stringify(init.variantGroups) ||
      current.publishedStatus !== init.publishedStatus ||
      current.allowDelivery !== init.allowDelivery ||
      current.allowPickup !== init.allowPickup ||
      current.deliveryFee !== init.deliveryFee
    );
  }

  const validate = useCallback(() => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};
    if (!formData.title.trim()) newErrors.title = "Product name is required";
    if (!formData.price || formData.price <= 0) newErrors.price = "Valid price is required";
    if (!formData.categoryId) newErrors.categoryId = "Category is required";
    if (!formData.campusId) newErrors.campusId = "Campus is required";
    if (!formData.images.length) newErrors.images = "At least one image is required";
    if (formData.stock === undefined || formData.stock < 0) newErrors.stock = "Stock quantity is required";
    if (formData.publishedStatus === "active") {
      if (!formData.title.trim()) newErrors.title = "Product name is required for publishing";
      if (!formData.description.trim()) newErrors.description = "Description is required for publishing";
      if (!formData.price || formData.price <= 0) newErrors.price = "Valid price is required for publishing";
      if (!formData.categoryId) newErrors.categoryId = "Category is required for publishing";
      if (!formData.campusId) newErrors.campusId = "Campus is required for publishing";
      if (!formData.images.length) newErrors.images = "At least one image is required for publishing";
      if (formData.stock === undefined || formData.stock < 0) newErrors.stock = "Stock is required for publishing";
    }
    if (formData.sku && !/^[A-Z0-9-]+$/.test(formData.sku)) {
      newErrors.sku = "SKU must contain only uppercase letters, numbers, and hyphens";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleChange = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleBlur = <K extends keyof ProductFormData>(field: K) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const uploadImages = async (files: File[]) => {
    const isPlaceholder = (src: string) => src.includes("placeholder-product");
    const room = 10 - formData.images.filter((src) => !isPlaceholder(src)).length;
    const batch = files.slice(0, Math.max(0, room));
    if (files.length > batch.length) setImageErrors(["Maximum 10 images allowed"]);
    else setImageErrors([]);
    if (batch.length === 0) return;

    setUploadingCount((n) => n + batch.length);
    const failures: string[] = [];
    await Promise.all(
      batch.map(async (file) => {
        const { data, error } = await uploadFileDirect(file, "product");
        if (error || !data?.url) {
          failures.push(`${file.name}: ${error?.message ?? "upload failed"}`);
        } else {
          const url = data.url;
          setFormData((prev) => ({ ...prev, images: [...prev.images.filter((src) => !isPlaceholder(src)), url] }));
          setTouched((prev) => ({ ...prev, images: true }));
        }
        setUploadingCount((n) => n - 1);
      })
    );
    if (failures.length > 0) setImageErrors(failures);
  };

  const removeImage = (index: number) => {
    if (formData.images.length <= 1) {
      setImageErrors(["At least one image is required"]);
      return;
    }
    handleChange("images", formData.images.filter((_, i) => i !== index));
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const newImages = [...formData.images];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);
    handleChange("images", newImages);
  };

  const addVariantGroup = () => {
    handleChange("variantGroups", [
      ...(formData.variantGroups ?? []),
      {
        id: `vg-${Date.now()}`,
        name: "",
        required: true,
        options: [{ id: `vo-${Date.now()}-1`, value: "", available: true }],
      },
    ]);
    handleChange("hasVariants", true);
  };

  const removeVariantGroup = (groupId: string) => {
    handleChange("variantGroups", (formData.variantGroups ?? []).filter((g) => g.id !== groupId));
    handleChange("variants", (formData.variants ?? []).filter((v) => !v.attributes[groupId]));
  };

  const updateVariantGroup = (groupId: string, updates: Partial<ProductVariantGroup>) => {
    handleChange(
      "variantGroups",
      (formData.variantGroups ?? []).map((g) => (g.id === groupId ? { ...g, ...updates } : g))
    );
  };

  const addVariantOption = (groupId: string) => {
    handleChange(
      "variantGroups",
      (formData.variantGroups ?? []).map((g) =>
        g.id === groupId
          ? { ...g, options: [...(g.options ?? []), { id: `vo-${Date.now()}-${(g.options ?? []).length + 1}`, value: "", available: true }] }
          : g
      )
    );
  };

  const removeVariantOption = (groupId: string, optionId: string) => {
    handleChange(
      "variantGroups",
      (formData.variantGroups ?? []).map((g) =>
        g.id === groupId
          ? { ...g, options: (g.options ?? []).filter((o) => o.id !== optionId) }
          : g
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(
      Object.keys(formData).reduce((acc, k) => ({ ...acc, [k]: true }), {} as Record<string, boolean>)
    );
    if (!validate()) return;
    await onSave(formData);
  };

  const validationSummary = Object.entries(errors).filter(([key]) => touched[key as keyof ProductFormData]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
      {validationSummary.length > 0 && (
        <div className="bg-kampmax-error/10 border border-kampmax-error/20 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-kampmax-error mb-1">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Please fix the following errors:</span>
          </div>
          <ul className="list-disc list-inside text-sm text-kampmax-error space-y-0.5">
            {validationSummary.map(([key, msg]) => (
              <li key={key}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Basic Information */}
      <div className="border border-kampmax-border rounded-xl bg-white p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-kampmax-blue" />
          <h3 className="text-sm font-semibold text-kampmax-text">Basic Information</h3>
        </div>

        <div>
          <Label htmlFor="title">Product Name *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            onBlur={() => handleBlur("title")}
            placeholder="Enter product name"
            className={cn("mt-1", touched.title && errors.title && "border-kampmax-error")}
            aria-invalid={touched.title && !!errors.title}
            aria-describedby={touched.title && errors.title ? "title-error" : undefined}
          />
          {touched.title && errors.title && (
            <p id="title-error" className="mt-1 text-sm text-kampmax-error" role="alert">
              {errors.title}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            onBlur={() => handleBlur("description")}
            rows={3}
            placeholder="Describe your product..."
            className={cn("mt-1", touched.description && errors.description && "border-kampmax-error")}
            aria-invalid={touched.description && !!errors.description}
          />
          {touched.description && errors.description && (
            <p className="mt-1 text-sm text-kampmax-error" role="alert">{errors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="categoryId">Category *</Label>
            <Select
              id="categoryId"
              value={formData.categoryId}
              onChange={(e) => handleChange("categoryId", e.target.value)}
              onBlur={() => handleBlur("categoryId")}
              placeholder="Select category"
              className={cn("mt-1", touched.categoryId && errors.categoryId && "border-kampmax-error")}
              aria-invalid={touched.categoryId && !!errors.categoryId}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {touched.categoryId && errors.categoryId && (
              <p className="mt-1 text-sm text-kampmax-error" role="alert">{errors.categoryId}</p>
            )}
          </div>

          <div>
            <Label htmlFor="campusId">Campus *</Label>
            <Select
              id="campusId"
              value={formData.campusId}
              onChange={(e) => handleChange("campusId", e.target.value)}
              onBlur={() => handleBlur("campusId")}
              placeholder="Select campus"
              className={cn("mt-1", touched.campusId && errors.campusId && "border-kampmax-error")}
              aria-invalid={touched.campusId && !!errors.campusId}
            >
              <option value="">Select campus</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {touched.campusId && errors.campusId && (
              <p className="mt-1 text-sm text-kampmax-error" role="alert">{errors.campusId}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="condition">Condition</Label>
          <Select
            id="condition"
            value={formData.condition}
            onChange={(e) => handleChange("condition", e.target.value as ProductCondition)}
            className="mt-1"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Pricing & Stock */}
      <div className="border border-kampmax-border rounded-xl bg-white p-4 space-y-4">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-kampmax-blue" />
          <h3 className="text-sm font-semibold text-kampmax-text">Pricing & Stock</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="price">Price (₦) *</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="1"
              value={formData.price.toString()}
              onChange={(e) => handleChange("price", Number(e.target.value) || 0)}
              onBlur={() => handleBlur("price")}
              className={cn("mt-1", touched.price && errors.price && "border-kampmax-error")}
              aria-invalid={touched.price && !!errors.price}
            />
            {touched.price && errors.price && (
              <p className="mt-1 text-sm text-kampmax-error" role="alert">{errors.price}</p>
            )}
          </div>

          <div>
            <Label htmlFor="originalPrice">Original Price (₦)</Label>
            <Input
              id="originalPrice"
              type="number"
              min="0"
              step="1"
              value={formData.originalPrice?.toString() ?? ""}
              onChange={(e) => handleChange("originalPrice", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g., 50000"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-kampmax-text-secondary">Shows as strikethrough price</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="stock">Stock Quantity *</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              step="1"
              value={formData.stock.toString()}
              onChange={(e) => handleChange("stock", Number(e.target.value) || 0)}
              onBlur={() => handleBlur("stock")}
              className={cn("mt-1", touched.stock && errors.stock && "border-kampmax-error")}
              aria-invalid={touched.stock && !!errors.stock}
            />
            {touched.stock && errors.stock && (
              <p className="mt-1 text-sm text-kampmax-error" role="alert">{errors.stock}</p>
            )}
          </div>

          <div>
            <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
            <Input
              id="lowStockThreshold"
              type="number"
              min="1"
              step="1"
              value={formData.lowStockThreshold.toString()}
              onChange={(e) => handleChange("lowStockThreshold", Number(e.target.value) || 5)}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-kampmax-text-secondary">Alert when stock reaches this level</p>
          </div>
        </div>

        <div>
          <Label htmlFor="costPrice">Cost Price (₦)</Label>
          <Input
            id="costPrice"
            type="number"
            min="0"
            step="1"
            value={formData.costPrice?.toString() ?? ""}
            onChange={(e) => handleChange("costPrice", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="e.g., 30000"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-kampmax-text-secondary">Internal use only — never shown to customers</p>
        </div>

        <div>
          <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => handleChange("sku", e.target.value.toUpperCase())}
            placeholder="e.g., ADG-IP13PM-256-GRY"
            className={cn("mt-1 font-mono text-sm", touched.sku && errors.sku && "border-kampmax-error")}
            aria-invalid={touched.sku && !!errors.sku}
          />
          {touched.sku && errors.sku && (
            <p className="mt-1 text-sm text-kampmax-error" role="alert">{errors.sku}</p>
          )}
          <p className="mt-1 text-xs text-kampmax-text-secondary">Unique within your store. Uppercase letters, numbers, hyphens only.</p>
        </div>
      </div>

      {/* Images */}
      <div className="border border-kampmax-border rounded-xl bg-white p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Image className="h-5 w-5 text-kampmax-blue" />
          <h3 className="text-sm font-semibold text-kampmax-text">Images</h3>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {formData.images.map((img, idx) => (
            <div key={idx} className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-kampmax-border">
              <img src={img} alt={`Product image ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                aria-label={`Remove image ${idx + 1}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <DragHandle />
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.multiple = true;
              input.onchange = (e) => {
                const files = Array.from((e.target as HTMLInputElement).files ?? []);
                void uploadImages(files);
              };
              input.click();
            }}
            disabled={formData.images.length >= 10 || uploadingCount > 0}
            className="w-24 h-24 flex-shrink-0 rounded-lg border-2 border-dashed border-kampmax-border flex items-center justify-center flex-col gap-1 text-kampmax-text-secondary hover:border-kampmax-blue hover:text-kampmax-blue transition-colors"
          >
            <Upload className="h-6 w-6" />
            <span className="text-xs">{uploadingCount > 0 ? "Uploading..." : "Add"}</span>
          </button>
        </div>

        {imageErrors.length > 0 && (
          <p className="text-sm text-kampmax-error" role="alert">{imageErrors[0]}</p>
        )}
        <p className="text-xs text-kampmax-text-secondary">
          Drag to reorder. First image is the thumbnail. Max 10 images.
        </p>
      </div>

      {/* Variants */}
      <SectionHeader title="Variants" icon={Settings}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 mb-0">
              <input
                type="checkbox"
                checked={formData.hasVariants}
                onChange={(e) => handleChange("hasVariants", e.target.checked)}
                className="h-4 w-4 rounded border-kampmax-border text-kampmax-blue"
              />
              <span className="text-sm font-medium text-kampmax-text">This product has variants (e.g., size, color)</span>
            </Label>
          </div>

          {formData.hasVariants && (
            <div className="space-y-4">
              {(formData.variantGroups ?? []).map((group, gIdx) => (
                <div key={group.id} className="border border-kampmax-border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DragHandle />
                      <Input
                        placeholder="Variant name (e.g., Color, Size)"
                        value={group.name}
                        onChange={(e) => updateVariantGroup(group.id, { name: e.target.value })}
                        className="w-40 text-sm"
                      />
                      <Label className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={group.required}
                          onChange={(e) => updateVariantGroup(group.id, { required: e.target.checked })}
                          className="h-4 w-4 rounded border-kampmax-border text-kampmax-blue"
                        />
                        Required
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariantGroup(group.id)}
                      className="p-1 text-kampmax-text-secondary hover:text-kampmax-error"
                      aria-label={`Remove ${group.name || "variant group"}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {group.options.map((option, oIdx) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <DragHandle />
                        <Input
                          placeholder={`Option ${oIdx + 1} (e.g., Red, Large)`}
                          value={option.value}
                          onChange={(e) =>
                            updateVariantGroup(group.id, {
                              options: group.options.map((o, i) =>
                                i === oIdx ? { ...o, value: e.target.value } : o
                              ),
                            })
                          }
                          className="flex-1 text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Price +₦"
                          value={option.priceModifier?.toString() ?? ""}
                          onChange={(e) =>
                            updateVariantGroup(group.id, {
                              options: group.options.map((o, i) =>
                                i === oIdx ? { ...o, priceModifier: e.target.value ? Number(e.target.value) : undefined } : o
                              ),
                            })
                          }
                          className="w-24 text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Stock"
                          min="0"
                          value={option.stock?.toString() ?? ""}
                          onChange={(e) =>
                            updateVariantGroup(group.id, {
                              options: group.options.map((o, i) =>
                                i === oIdx ? { ...o, stock: e.target.value ? Number(e.target.value) : undefined } : o
                              ),
                            })
                          }
                          className="w-20 text-sm"
                        />
                        <label className="flex items-center gap-1.5 text-sm">
                          <input
                            type="checkbox"
                            checked={option.available ?? true}
                            onChange={(e) =>
                              updateVariantGroup(group.id, {
                                options: group.options.map((o, i) =>
                                  i === oIdx ? { ...o, available: e.target.checked } : o
                                ),
                              })
                            }
                            className="h-4 w-4 rounded border-kampmax-border text-kampmax-blue"
                          />
                          Active
                        </label>
                        <button
                          type="button"
                          onClick={() => removeVariantOption(group.id, option.id)}
                          className="p-1 text-kampmax-text-secondary hover:text-kampmax-error"
                          aria-label="Remove option"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addVariantOption(group.id)}
                      className="text-sm text-kampmax-blue hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Option
                    </button>
                  </div>
                </div>
              ))}
              {(formData.variantGroups ?? []).length === 0 && (
                <p className="text-sm text-kampmax-text-secondary text-center py-4">
                  No variant groups yet. Add your first group below.
                </p>
              )}
              <button
                type="button"
                onClick={addVariantGroup}
                className="w-full py-2 border-2 border-dashed border-kampmax-border rounded-lg text-sm text-kampmax-text-secondary hover:border-kampmax-blue hover:text-kampmax-blue transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-1.5" />
                Add Variant Group
              </button>
            </div>
          )}
        </div>
      </SectionHeader>

      {/* Delivery & Location */}
      <div className="border border-kampmax-border rounded-xl bg-white p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-kampmax-blue" />
          <h3 className="text-sm font-semibold text-kampmax-text">Delivery & Location</h3>
        </div>

        <div className="flex gap-4">
          <Label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={formData.allowPickup} onChange={(e) => handleChange("allowPickup", e.target.checked)} />
            <span className="text-sm text-kampmax-text">Allow Pickup</span>
          </Label>
          <Label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={formData.allowDelivery} onChange={(e) => handleChange("allowDelivery", e.target.checked)} />
            <span className="text-sm text-kampmax-text">Allow Delivery</span>
          </Label>
        </div>

        {formData.allowDelivery && (
          <div>
            <Label htmlFor="deliveryFee">Delivery Fee (₦)</Label>
            <Input
              id="deliveryFee"
              type="number"
              min="0"
              step="1"
              value={formData.deliveryFee?.toString() ?? ""}
              onChange={(e) => handleChange("deliveryFee", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0 = Free delivery"
              className="mt-1"
            />
          </div>
        )}

        <div>
          <Label htmlFor="location">Pickup Location</Label>
          <Input
            id="location"
            value={formData.location ?? ""}
            onChange={(e) => handleChange("location", e.target.value)}
            placeholder="e.g., Adebayo's Gadgets Shop, Engineering Block"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={formData.tags.join(", ")}
            onChange={(e) => handleChange("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
            placeholder="electronics, smartphone, apple, sale"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-kampmax-text-secondary">Helps customers find your product</p>
        </div>
      </div>

      {/* Publishing */}
      <SectionHeader title="Publishing" icon={Globe}>
        <div className="space-y-4">
          <div>
            <Label>Status</Label>
            <div className="flex gap-2 mt-2">
              {PUBLISH_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleChange("publishedStatus", opt.value)}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize",
                    formData.publishedStatus === opt.value
                      ? "bg-kampmax-navy text-white border-kampmax-navy"
                      : "bg-white text-kampmax-text border-kampmax-border"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {formData.publishedStatus === "active" && (
            <div className="bg-kampmax-success/10 border border-kampmax-success/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-kampmax-success flex-shrink-0 mt-0.5" />
                <div className="text-sm text-kampmax-success">
                  <p className="font-medium">Ready to publish</p>
                  <p>This product will be visible on your storefront immediately after saving.</p>
                </div>
              </div>
            </div>
          )}

          {formData.publishedStatus === "draft" && (
            <div className="bg-kampmax-muted/50 border border-kampmax-border rounded-lg p-3">
              <div className="flex items-start gap-2">
                <EyeOff className="h-5 w-5 text-kampmax-text-secondary flex-shrink-0 mt-0.5" />
                <div className="text-sm text-kampmax-text-secondary">
                  <p className="font-medium">Saved as draft</p>
                  <p>This product is not visible on your storefront. Publish when ready.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionHeader>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || uploadingCount > 0} className="flex-1">
          {isLoading ? "Saving..." : isEditing ? "Save Changes" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}