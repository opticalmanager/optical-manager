"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Package, 
  DollarSign, 
  Sliders, 
  Image as ImageIcon, 
  Loader2, 
  Info,
  AlertCircle,
  Check,
  Sun,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { editSunglassItemSchema } from "@/utils/validators";
import { updateSunglassItemAction } from "@/actions/inventory.actions";
import { offlineDB } from "@/lib/offline/db";
import { enqueueOfflineMutation } from "@/lib/offline/mutation-queue";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { handleEnterKeyNavigation } from "@/utils/form-navigation";
import { checkProductCodeExists } from "@/services/inventory.service";

interface EditSunglassItemFormProps {
  initialData: any;
  shopId: string;
  itemId: string;
}

export function EditSunglassItemForm({
  initialData,
  shopId,
  itemId,
}: EditSunglassItemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editSunglassItemSchema),
    defaultValues: {
      productCode: initialData.productCode || initialData.sku || "",
      productName: initialData.productName || initialData.name || "",
      name: initialData.name || "",
      brand: initialData.brand || "",
      costPrice: parseFloat(initialData.costPrice) || 0,
      price: parseFloat(initialData.price) || 0,
      hsnCode: initialData.hsnCode || "90041000",
      cgstPercent: parseFloat(initialData.cgstPercent) || 0,
      sgstPercent: parseFloat(initialData.sgstPercent) || 0,
      igstPercent: parseFloat(initialData.igstPercent) || 0,
      vendorName: initialData.vendorName || "",
      rackLocation: initialData.rackLocation || "",
      requiresExpiryTracking: initialData.requiresExpiryTracking || false,
      batchNumber: initialData.batchNumber || "",
      expiryDate: initialData.expiryDate || "",
      imageUrl: initialData.imageUrl || "",
      modelNumber: initialData.modelNumber || "",
      frameShape: initialData.frameShape || "Aviator",
      frameColor: initialData.frameColor || "Matte Black",
      lensColor: initialData.lensColor || "Green G-15",
      size: initialData.size || "55-14-140",
      gender: initialData.gender || "Unisex",
      isPolarized: initialData.isPolarized || false,
      uvProtection: initialData.uvProtection || "UV400",
      addStockQuantity: 0,
      minQuantity: initialData.minQuantity || 5,
      allowNegativeStock:
        initialData.allowNegativeStock === null || initialData.allowNegativeStock === undefined
          ? "inherit"
          : initialData.allowNegativeStock === true
          ? "allow"
          : "disallow",
      purchaseInvoiceNo: initialData.purchaseInvoiceNo || "",
      inwardDate: initialData.inwardDate || "",
    },
  });

  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isCodeDuplicate, setIsCodeDuplicate] = useState(false);
  const productCode = watch("productCode");

  useEffect(() => {
    if (!productCode || productCode.trim().length === 0) {
      setIsCodeDuplicate(false);
      setIsCheckingCode(false);
      return;
    }

    const originalCode = initialData.productCode || initialData.sku || "";
    if (productCode.trim().toLowerCase() === originalCode.trim().toLowerCase()) {
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
          setIsCodeDuplicate(!!cached && cached.id !== itemId);
        } else {
          const exists = await checkProductCodeExists(shopId, productCode.trim(), itemId);
          setIsCodeDuplicate(exists);
        }
      } catch (err) {
        console.error("Error validating product code uniqueness:", err);
      } finally {
        setIsCheckingCode(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [productCode, itemId, shopId, initialData]);

  const imageUrl = watch("imageUrl");
  const isPolarized = watch("isPolarized");
  const addStockQuantity = watch("addStockQuantity") || 0;
  const currentStock = initialData.quantity || 0;
  const resultingStock = Number(currentStock) + Number(addStockQuantity);

  const onSubmit = async (data: any) => {
    if (isCodeDuplicate) {
      toast.error("Code already exists. Please choose a unique product code.");
      return;
    }

    startTransition(async () => {
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      const activeShopId =
        shopId ||
        initialData.shopId ||
        (typeof window !== "undefined"
          ? localStorage.getItem("om_active_shop_id") || "active_shop"
          : "active_shop");

      const saveLocally = async () => {
        const addedQty = Number(data.addStockQuantity || 0);
        const newQty = Number(initialData.quantity || 0) + addedQty;

        await offlineDB.cached_inventory.update(itemId, {
          name: data.productName || data.name,
          productName: data.productName,
          productCode: data.productCode,
          sku: data.productCode || initialData.sku,
          brand: data.brand || null,
          model: data.modelNumber || null,
          price: (data.price || 0).toFixed(2),
          quantity: newQty,
          cgstPercent: (data.cgstPercent || 6).toString(),
          sgstPercent: (data.sgstPercent || 6).toString(),
          igstPercent: (data.igstPercent || 12).toString(),
          updatedAt: new Date().toISOString(),
        });

        if (addedQty !== 0) {
          await enqueueOfflineMutation(activeShopId, "STOCK_ADJUST", {
            inventoryId: itemId,
            quantityChange: addedQty,
            movementType: "RESTOCK",
            notes: `Restock via offline edit (${addedQty} units)`,
          });
        }

        await enqueueOfflineMutation(activeShopId, "INVENTORY_UPDATE", {
          itemId,
          name: data.name,
          brand: data.brand,
          model: data.modelNumber,
          price: data.price,
          costPrice: data.costPrice,
          minQuantity: data.minQuantity,
        });

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("offline-databank-updated", {
              detail: { shopId: activeShopId, timestamp: new Date().toISOString() },
            })
          );
        }

        toast.success("Sunglasses item updated locally (will sync automatically when online).");
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
        const result = await updateSunglassItemAction(itemId, undefined, data);
        if (result?.success) {
          toast.success(result.message || "Sunglasses updated successfully.");
          router.push("/shop/inventory");
        } else {
          toast.error(result?.message || "Failed to update sunglasses.");
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
      {/* Header */}
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
              Edit Sunglasses
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#2563eb] border border-blue-200/60">
              <Sun className="w-3 h-3" />
              {initialData.productCode || initialData.sku || "Sunglasses"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Modify sunglasses details, specifications, prices, and manage stock inventory.
          </p>
        </div>

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
            <span>Save Changes</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: 8 cols */}
        <div className="lg:col-span-8 space-y-6">
          {/* Basic Info */}
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
                  </div>
                  <Input
                    type="text"
                    className={`h-10 border-slate-200 bg-white font-mono font-semibold ${
                      isCodeDuplicate ? "border-rose-500 focus-visible:ring-rose-200" : ""
                    }`}
                    {...register("productCode")}
                  />
                  {isCodeDuplicate && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      Code already exists in other products
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
                    Brand
                  </label>
                  <Input
                    type="text"
                    className="h-10 border-slate-200"
                    {...register("brand")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Model Number
                  </label>
                  <Input
                    type="text"
                    className="h-10 border-slate-200"
                    {...register("modelNumber")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sunglasses Parameters */}
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
                    Essential optical sunglass attributes
                  </p>
                </div>
              </div>

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
                    className="h-10 border-slate-200"
                    {...register("frameColor")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Lens Color / Tint
                  </label>
                  <Input
                    type="text"
                    className="h-10 border-slate-200"
                    {...register("lensColor")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Size
                  </label>
                  <Input
                    type="text"
                    className="h-10 border-slate-200"
                    {...register("size")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Gender
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

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    UV Protection
                  </label>
                  <select
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                    {...register("uvProtection")}
                  >
                    <option value="UV400">UV400 (100% UVA/UVB Protection)</option>
                    <option value="Category 3">Category 3 (High Sun Glare)</option>
                    <option value="Category 2">Category 2 (Medium Sun Glare)</option>
                    <option value="Category 4">Category 4 (Exceptional)</option>
                    <option value="Non-UV">Standard Fashion Tint (No UV)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Tax */}
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
                    className="h-10 border-slate-200"
                    {...register("costPrice")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Selling Retail Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
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

          {/* Stock Refill & Inventory Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                    Stock &amp; Refill
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Current stock: <span className="font-bold text-slate-800">{currentStock}</span> units
                  </p>
                </div>
              </div>

              {resultingStock !== currentStock && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  New Total: {resultingStock}
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Restock (Add Quantity)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="h-10 border-slate-200 font-bold"
                    {...register("addStockQuantity")}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Adds to existing stock ({currentStock} units).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Low Stock Threshold
                  </label>
                  <Input
                    type="number"
                    min="0"
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

        {/* Right Side: 4 cols */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ImageIcon className="h-4 w-4 text-[#2563eb]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Sunglasses Image
              </h3>
            </div>
            <ImageUpload
              shopId={shopId}
              value={imageUrl || ""}
              onChange={(url) => setValue("imageUrl", url || "")}
            />
          </div>
        </div>
      </div>
    </form>
  );
}
