"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Package, 
  Sparkles, 
  DollarSign, 
  Sliders, 
  Image as ImageIcon, 
  Lock, 
  Loader2, 
  Info,
  Calendar,
  AlertCircle,
  Check,
  Sun,
  ShieldCheck
} from "lucide-react";
import { sunglassItemSchema } from "@/utils/validators";
import { createSunglassItemAction } from "@/actions/inventory.actions";
import { offlineDB } from "@/lib/offline/db";
import { enqueueOfflineMutation } from "@/lib/offline/mutation-queue";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { CategoryItem } from "@/services/category.service";
import { InventoryAddCategoryTabs } from "@/components/shop/InventoryAddCategoryTabs";
import { handleEnterKeyNavigation } from "@/utils/form-navigation";
import { checkProductCodeExists } from "@/services/inventory.service";

interface AddSunglassItemFormProps {
  shopId: string;
  categoryDefaults?: CategoryItem | null;
  categories?: CategoryItem[];
}

export function AddSunglassItemForm({ shopId, categoryDefaults, categories }: AddSunglassItemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialCgst = categoryDefaults?.cgstPercent !== undefined ? parseFloat(categoryDefaults.cgstPercent) : 6;
  const initialSgst = categoryDefaults?.sgstPercent !== undefined ? parseFloat(categoryDefaults.sgstPercent) : 6;
  const initialIgst = categoryDefaults?.igstPercent !== undefined ? parseFloat(categoryDefaults.igstPercent) : 12;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(sunglassItemSchema),
    defaultValues: {
      productCode: "",
      productName: "",
      name: "",
      brand: "",
      costPrice: 0,
      price: 0,
      hsnCode: categoryDefaults?.hsnCode || "90041000",
      cgstPercent: initialCgst,
      sgstPercent: initialSgst,
      igstPercent: initialIgst,
      vendorName: "",
      rackLocation: "",
      quantity: 0,
      minQuantity: 5,
      requiresExpiryTracking: false,
      batchNumber: "",
      expiryDate: "",
      imageUrl: "",
      modelNumber: "",
      frameShape: "Aviator",
      frameColor: "Matte Black",
      lensColor: "Green G-15",
      size: "55-14-140",
      gender: "Unisex",
      isPolarized: false,
      uvProtection: "UV400",
      purchaseInvoiceNo: "",
      inwardDate: "",
    },
  });

  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isCodeDuplicate, setIsCodeDuplicate] = useState(false);

  // Watch fields for interactive live SKU preview and validation
  const productCode = watch("productCode");
  const brand = watch("brand");
  const modelNumber = watch("modelNumber");
  const isPolarized = watch("isPolarized");
  const requiresExpiry = watch("requiresExpiryTracking");
  const imageUrl = watch("imageUrl");

  // Real-time debounced uniqueness check for productCode
  useEffect(() => {
    if (!productCode || productCode.trim().length === 0) {
      setIsCodeDuplicate(false);
      setIsCheckingCode(false);
      return;
    }

    setIsCheckingCode(true);
    const timer = setTimeout(async () => {
      try {
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
        if (isOffline) {
          const cached = await offlineDB.cached_inventory
            .where("productCode")
            .equalsIgnoreCase(productCode.trim())
            .first();
          setIsCodeDuplicate(!!cached);
        } else {
          const exists = await checkProductCodeExists(shopId, productCode.trim());
          setIsCodeDuplicate(exists);
        }
      } catch (err) {
        console.error("Error validating product code uniqueness:", err);
      } finally {
        setIsCheckingCode(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [productCode, shopId]);

  // Dynamic Live SKU preview builder
  const getSkuPreview = () => {
    const b = (brand || "GEN")
      .replace(/[^A-Za-z]/g, "")
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, "X");
    const m = (modelNumber || "000000")
      .replace(/[^A-Za-z0-9]/g, "")
      .substring(0, 6)
      .toUpperCase()
      .padEnd(6, "0");
    return `SNG-${b}${m}-###`;
  };

  const onSubmit = async (data: any) => {
    if (isCodeDuplicate) {
      toast.error("Code already exists. Please choose a unique product code.");
      return;
    }

    startTransition(async () => {
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      const activeShopId =
        shopId ||
        (typeof window !== "undefined"
          ? localStorage.getItem("om_active_shop_id") || "active_shop"
          : "active_shop");

      const saveLocally = async () => {
        const b = (data.brand || "GEN")
          .replace(/[^A-Za-z]/g, "")
          .substring(0, 3)
          .toUpperCase()
          .padEnd(3, "X");
        const m = (data.modelNumber || "000")
          .replace(/[^A-Za-z0-9]/g, "")
          .substring(0, 4)
          .toUpperCase();
        const generatedSku = data.productCode || `SNG-${b}${m}-${Math.floor(100 + Math.random() * 900)}`;
        const offlineItemId = `off-inv-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 6)}`;

        const offlineRecord = {
          id: offlineItemId,
          shopId: activeShopId,
          organizationId: "offline_org",
          name: data.productName || data.name || data.productCode,
          productName: data.productName,
          productCode: data.productCode,
          category: "SUNGLASSES",
          brand: data.brand || null,
          model: data.modelNumber || null,
          sku: generatedSku,
          price: (data.price || 0).toFixed(2),
          quantity: data.quantity || 0,
          isActive: true,
          cgstPercent: (data.cgstPercent || 6).toString(),
          sgstPercent: (data.sgstPercent || 6).toString(),
          igstPercent: (data.igstPercent || 12).toString(),
          updatedAt: new Date().toISOString(),
        };

        await offlineDB.cached_inventory.put(offlineRecord);
        await enqueueOfflineMutation(activeShopId, "INVENTORY_CREATE", {
          category: "SUNGLASSES",
          ...data,
          sku: generatedSku,
          offlineItemId,
        });

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("offline-databank-updated", {
              detail: { shopId: activeShopId, timestamp: new Date().toISOString() },
            })
          );
        }

        toast.success("Sunglasses item saved locally (will sync automatically when online).");
        router.push("/shop/inventory");
      };

      if (isOffline) {
        try {
          await saveLocally();
        } catch (err: any) {
          console.error("Local save error:", err);
          toast.error("Failed to save sunglasses locally.");
        }
        return;
      }

      try {
        const result = await createSunglassItemAction(undefined, data);
        if (result?.success) {
          toast.success(result.message || "Sunglasses saved successfully.");
          router.push("/shop/inventory");
        } else {
          toast.error(result?.message || "Failed to save sunglasses.");
        }
      } catch (err: any) {
        try {
          await saveLocally();
        } catch {
          console.error("Save error:", err);
          toast.error("An unexpected error occurred while saving.");
        }
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={(e) => handleEnterKeyNavigation(e)}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => router.push("/shop/inventory")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#2563eb] transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Inventory
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Inventory Management
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#2563eb] border border-blue-200/60">
              <Sun className="w-3 h-3" />
              Sunglasses
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Configure retail sunglasses models, lens tints, polarization, and stock parameters.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/shop/inventory")}
            className="h-9 px-4 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || isCodeDuplicate}
            className="h-9 px-5 text-xs font-semibold bg-[#2563eb] hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Save Sunglasses</span>
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      {categories && categories.length > 0 ? (
        <InventoryAddCategoryTabs
          categories={categories}
          activeCategoryCode="SUNGLASSES"
        />
      ) : (
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/60 max-w-fit">
          <button
            type="button"
            onClick={() => router.push("/shop/inventory/add?category=sunglasses")}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#2563eb] text-white rounded-lg shadow-sm"
          >
            Sunglasses
          </button>
        </div>
      )}

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side Fields: 8 columns */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card: Basic Information */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-[#2563eb] rounded-lg">
                <Info className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Basic Information
              </h2>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Product Code / Barcode <span className="text-rose-500">*</span>
                    </label>
                    {isCheckingCode && (
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                      </span>
                    )}
                    {!isCheckingCode && productCode && productCode.trim().length > 0 && !isCodeDuplicate && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="h-3 w-3" /> Available
                      </span>
                    )}
                  </div>
                  <Input
                    type="text"
                    placeholder="e.g. SG-RB-3025"
                    className={`h-10 border-slate-200 bg-white font-mono font-semibold ${
                      isCodeDuplicate ? "border-rose-500 focus-visible:ring-rose-200" : ""
                    }`}
                    {...register("productCode")}
                  />
                  {isCodeDuplicate && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      Code already exists
                    </p>
                  )}
                  {errors.productCode && !isCodeDuplicate && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.productCode.message as string}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Ray-Ban Aviator Classic Green"
                    className="h-10 border-slate-200 bg-white"
                    {...register("productName")}
                  />
                  {errors.productName && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.productName.message as string}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    SKU Identification (Auto)
                  </label>
                  <Input
                    type="text"
                    disabled
                    value={getSkuPreview()}
                    className="h-10 bg-slate-50 border-dashed border-slate-300 text-[#2563eb] font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Auto-generated using category, brand, and serial index.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Brand
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Ray-Ban, Oakley, Gucci"
                    className="h-10 border-slate-200"
                    {...register("brand")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Sunglasses Specifications (Essential Fields) */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-[#2563eb] rounded-lg">
                  <Sliders className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                    Sunglasses Parameters
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Standard optical sunglass specifications
                  </p>
                </div>
              </div>

              {/* Polarized Quick Toggle */}
              <label className="inline-flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb] w-4 h-4 cursor-pointer"
                  {...register("isPolarized")}
                />
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <ShieldCheck className={`w-3.5 h-3.5 ${isPolarized ? "text-[#2563eb]" : "text-slate-400"}`} />
                  Polarized Lens
                </span>
              </label>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Model Number
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. RB3025"
                    className="h-10 border-slate-200"
                    {...register("modelNumber")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Frame Shape
                  </label>
                  <select
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                    {...register("frameShape")}
                  >
                    <option value="Aviator">Aviator</option>
                    <option value="Wayfarer">Wayfarer</option>
                    <option value="Round">Round</option>
                    <option value="Square">Square</option>
                    <option value="Cat-Eye">Cat-Eye</option>
                    <option value="Rectangle">Rectangle</option>
                    <option value="Hexagonal">Hexagonal</option>
                    <option value="Wrap-around">Wrap-around</option>
                    <option value="Clubmaster">Clubmaster</option>
                    <option value="Oval">Oval</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Frame Color
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Matte Black, Gold, Tortoise"
                    className="h-10 border-slate-200"
                    {...register("frameColor")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Lens Color / Tint
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Green G-15, Grey, Blue Mirror"
                    className="h-10 border-slate-200"
                    {...register("lensColor")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Size
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 55-14-140 or Medium (58mm)"
                    className="h-10 border-slate-200"
                    {...register("size")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Gender / Demographic
                  </label>
                  <select
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                    {...register("gender")}
                  >
                    <option value="Unisex">Unisex</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Kids">Kids</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    UV Protection Rating
                  </label>
                  <select
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                    {...register("uvProtection")}
                  >
                    <option value="UV400">UV400 (100% UVA/UVB Protection)</option>
                    <option value="Category 3">Category 3 (High Sun Glare Reduction)</option>
                    <option value="Category 2">Category 2 (Medium Sun Glare)</option>
                    <option value="Category 4">Category 4 (Exceptional / Snow & Sea)</option>
                    <option value="Non-UV">Standard Fashion Tint (No UV)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Polarized Status
                  </label>
                  <div className="h-10 px-3 rounded-lg border border-slate-200 flex items-center bg-slate-50/70 text-xs font-semibold text-slate-700">
                    {isPolarized ? (
                      <span className="text-emerald-700 flex items-center gap-1.5 font-bold">
                        <Check className="w-4 h-4 text-emerald-600" />
                        Polarized (Anti-Glare Coating Applied)
                      </span>
                    ) : (
                      <span className="text-slate-500">Non-Polarized (Standard Tint)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Pricing & Tax Details */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Pricing &amp; Tax Structure
              </h2>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Cost Price (₹)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="h-10 border-slate-200"
                    {...register("costPrice")}
                  />
                  {errors.costPrice && (
                    <p className="text-xs text-rose-500 font-semibold mt-1">
                      {errors.costPrice.message as string}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Selling Retail Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="h-10 border-slate-200 font-bold text-slate-900"
                    {...register("price")}
                  />
                  {errors.price && (
                    <p className="text-xs text-rose-500 font-semibold mt-1">
                      {errors.price.message as string}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    HSN Code
                  </label>
                  <Input
                    type="text"
                    placeholder="90041000"
                    className="h-10 border-slate-200 font-mono text-xs"
                    {...register("hsnCode")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    CGST (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="h-10 border-slate-200"
                    {...register("cgstPercent")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    SGST (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="h-10 border-slate-200"
                    {...register("sgstPercent")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    IGST (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="h-10 border-slate-200"
                    {...register("igstPercent")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Stock & Location */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Package className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Stock &amp; Location
              </h2>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Opening Stock Units <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="h-10 border-slate-200 font-bold"
                    {...register("quantity")}
                  />
                  {errors.quantity && (
                    <p className="text-xs text-rose-500 font-semibold mt-1">
                      {errors.quantity.message as string}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Low Stock Threshold
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="5"
                    className="h-10 border-slate-200"
                    {...register("minQuantity")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Rack / Shelf Location
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Display Case B2"
                    className="h-10 border-slate-200"
                    {...register("rackLocation")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Vendor / Supplier
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Luxottica India"
                    className="h-10 border-slate-200"
                    {...register("vendorName")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Purchase Invoice No
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. PI-2026-88"
                    className="h-10 border-slate-200"
                    {...register("purchaseInvoiceNo")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Inward Date
                  </label>
                  <Input
                    type="date"
                    className="h-10 border-slate-200"
                    {...register("inwardDate")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Column: 4 columns */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card: Product Image */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ImageIcon className="h-4 w-4 text-[#2563eb]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Sunglasses Image
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Upload product photo for catalog, POS invoices, and online display.
            </p>
            <ImageUpload
              shopId={shopId}
              value={imageUrl || ""}
              onChange={(url) => setValue("imageUrl", url || "")}
            />
          </div>

          {/* Quick Help Card */}
          <div className="bg-blue-50/60 border border-blue-200/60 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2563eb] flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5" />
              Sunglasses Category Help
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sunglasses are categorized under optical HSN <strong>90041000</strong>. Enter shape, tint color, and UV protection level to enable quick search at the billing counter.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
