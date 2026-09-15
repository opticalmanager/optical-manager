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
  Lock, 
  Loader2, 
  Info,
  Calendar,
  AlertCircle,
  Check,
  Tag,
  Percent,
  Sparkles
} from "lucide-react";
import { generalItemSchema } from "@/utils/validators";
import { createGeneralItemAction } from "@/actions/inventory.actions";
import { CategoryItem } from "@/services/category.service";
import { InventoryAddCategoryTabs } from "@/components/shop/InventoryAddCategoryTabs";
import { offlineDB } from "@/lib/offline/db";
import { enqueueOfflineMutation } from "@/lib/offline/mutation-queue";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

interface AddGeneralItemFormProps {
  shopId: string;
  category: CategoryItem;
  categories: CategoryItem[];
}

export function AddGeneralItemForm({
  shopId,
  category,
  categories,
}: AddGeneralItemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isCodeDuplicate, setIsCodeDuplicate] = useState(false);

  const initialCgst = parseFloat(category.cgstPercent) || 6;
  const initialSgst = parseFloat(category.sgstPercent) || 6;
  const initialIgst = parseFloat(category.igstPercent) || 12;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(generalItemSchema),
    defaultValues: {
      category: category.code,
      productCode: "",
      productName: "",
      name: "",
      brand: "",
      costPrice: 0,
      price: 0,
      hsnCode: category.hsnCode || "",
      cgstPercent: initialCgst,
      sgstPercent: initialSgst,
      igstPercent: initialIgst,
      vendorName: "",
      rackLocation: "",
      purchaseInvoiceNo: "",
      inwardDate: "",
      quantity: 0,
      minQuantity: 5,
      requiresExpiryTracking: false,
      batchNumber: "",
      expiryDate: "",
      imageUrl: "",
      description: "",
    },
  });

  const brand = watch("brand");
  const requiresExpiry = watch("requiresExpiryTracking");
  const imageUrl = watch("imageUrl");
  const watchedProductCode = watch("productCode");
  const watchedIgst = watch("igstPercent");

  useEffect(() => {
    const code = watchedProductCode?.trim();
    if (!code) {
      setIsCodeDuplicate(false);
      setIsCheckingCode(false);
      return;
    }

    setIsCheckingCode(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/inventory/check-code?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          const json = await res.json();
          setIsCodeDuplicate(Boolean(json.exists));
        }
      } catch (e) {
        console.error("Code check failed:", e);
      } finally {
        setIsCheckingCode(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [watchedProductCode]);

  // Handle smart split when user changes IGST
  const handleIgstChange = (val: number) => {
    setValue("igstPercent", val);
    const half = Number((val / 2).toFixed(2));
    setValue("cgstPercent", half);
    setValue("sgstPercent", half);
  };

  const onSubmit = async (values: any) => {
    if (isCodeDuplicate) {
      toast.error("Code already exists. Please choose a unique product code.");
      return;
    }

    startTransition(async () => {
      const isOnline = typeof window !== "undefined" ? window.navigator.onLine : true;

      if (!isOnline) {
        try {
          const tempId = crypto.randomUUID();
          const userSession = await offlineDB.getUserSessionOffline();
          const organizationId = userSession?.organizationId || "";

          await offlineDB.cached_inventory.put({
            id: tempId,
            shopId,
            organizationId,
            productCode: values.productCode,
            productName: values.productName,
            name: values.productName || values.productCode,
            category: category.code,
            brand: values.brand || null,
            model: null,
            sku: values.productCode,
            price: String(values.price),
            quantity: Number(values.quantity) || 0,
            isActive: true,
            cgstPercent: String(values.cgstPercent),
            sgstPercent: String(values.sgstPercent),
            igstPercent: String(values.igstPercent),
            updatedAt: new Date().toISOString(),
          });

          await enqueueOfflineMutation(shopId, "INVENTORY_CREATE", {
            ...values,
            category: category.code,
            shopId,
            tempId,
          });

          toast.success(`${category.name} item saved locally (will sync automatically when online).`);
          router.push("/shop/inventory");
          return;
        } catch (offlineErr: any) {
          console.error("Offline save error:", offlineErr);
          toast.error("Failed to save item locally.");
          return;
        }
      }

      try {
        const result = await createGeneralItemAction({ success: false, message: "" }, {
          ...values,
          category: category.code,
        });

        if (result?.success) {
          toast.success(result.message || `${category.name} item saved successfully.`);
          router.push("/shop/inventory");
        } else {
          toast.error(result?.message || `Failed to save ${category.name.toLowerCase()} item.`);
        }
      } catch (err: any) {
        console.error("Submission failed:", err);
        toast.error("An unexpected error occurred while saving.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header & Back Action */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => router.push("/shop/inventory")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Inventory
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Inventory Management
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
              {category.name} INGESTION
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Cataloging {category.name.toLowerCase()} assets with pre-configured GST rates.
          </p>
        </div>
      </div>

      {/* Dynamic Category Tabs */}
      <InventoryAddCategoryTabs
        categories={categories}
        activeCategoryCode={category.code}
      />

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side Fields: 8 columns */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card: Basic Information */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Info className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Basic Information
              </h2>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Product Code / Barcode <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="e.g. PRD-9021"
                      className={`h-11 border-slate-200 font-mono ${
                        isCodeDuplicate ? "border-rose-500 bg-rose-50/20" : ""
                      }`}
                      {...register("productCode")}
                    />
                    <div className="absolute right-3 top-3 flex items-center gap-1.5">
                      {isCheckingCode && (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      )}
                      {!isCheckingCode && watchedProductCode && !isCodeDuplicate && (
                        <Check className="h-4 w-4 text-emerald-500" />
                      )}
                      {!isCheckingCode && isCodeDuplicate && (
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                      )}
                    </div>
                  </div>
                  {errors.productCode && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.productCode.message as string}
                    </p>
                  )}
                  {isCodeDuplicate && !errors.productCode && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Code already exists in database.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder={`e.g. Premium ${category.name}`}
                    className="h-11 border-slate-200"
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
                    Brand / Manufacturer
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Ray-Ban, Bausch & Lomb, Zeiss"
                    className="h-11 border-slate-200"
                    {...register("brand")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Product Category
                  </label>
                  <div className="h-11 px-3.5 flex items-center justify-between border border-slate-200 rounded-lg bg-slate-50 text-slate-700 text-sm font-bold">
                    <span>{category.name}</span>
                    <code className="text-xs bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-slate-600">
                      {category.code}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Financial Calibration */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <DollarSign className="h-4 w-4" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                  Financial &amp; GST Calibration
                </h2>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                Auto-filled from {category.name} Settings
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Acquisition Cost (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400 text-sm font-semibold">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="h-11 pl-7 border-slate-200 font-semibold"
                      {...register("costPrice")}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Selling Retail Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400 text-sm font-semibold">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="h-11 pl-7 border-slate-200 font-semibold"
                      {...register("price")}
                    />
                  </div>
                  {errors.price && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.price.message as string}
                    </p>
                  )}
                </div>
              </div>

              {/* GST & HSN Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    HSN/SAC Code
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 90049000"
                    className="h-11 border-slate-200 font-mono"
                    {...register("hsnCode")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    CGST (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-11 border-slate-200"
                    {...register("cgstPercent")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    SGST (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-11 border-slate-200"
                    {...register("sgstPercent")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-blue-700 mb-1.5">
                    IGST (%) <span className="text-[9px] text-blue-500 font-normal">(Auto Split)</span>
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={watchedIgst}
                    onChange={(e) => handleIgstChange(parseFloat(e.target.value) || 0)}
                    className="h-11 border-blue-300 bg-blue-50/30 text-blue-700 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Vendor / Supplier
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Vision Supply Co."
                    className="h-11 border-slate-200"
                    {...register("vendorName")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Rack / Storage Shelf Location
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Shelf A-3, Drawer 2"
                    className="h-11 border-slate-200"
                    {...register("rackLocation")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Inventory Stock Control */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sliders className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Inventory Stock &amp; Inwarding
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Initial Stock Inward (Units) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    className="h-11 border-slate-200 font-semibold"
                    {...register("quantity")}
                  />
                  {errors.quantity && (
                    <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
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
                    className="h-11 border-slate-200 font-semibold"
                    {...register("minQuantity")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Purchase Invoice Number
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. INV-2026-9021"
                    className="h-11 border-slate-200 font-mono"
                    {...register("purchaseInvoiceNo")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Inward Date
                  </label>
                  <Input
                    type="date"
                    className="h-11 border-slate-200"
                    {...register("inwardDate")}
                  />
                </div>
              </div>

              {/* Expiry Tracking Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    {...register("requiresExpiryTracking")}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Track Batch &amp; Expiry Date for this Item
                  </span>
                </label>
              </div>

              {requiresExpiry && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Batch Number
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. BATCH-2026-X"
                      className="h-11 border-slate-200 font-mono bg-white"
                      {...register("batchNumber")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Expiry Date
                    </label>
                    <Input
                      type="date"
                      className="h-11 border-slate-200 bg-white"
                      {...register("expiryDate")}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: 4 columns - Image & Ingestion Summary */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card: Media Upload */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <ImageIcon className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Product Image
              </h2>
            </div>
            <div className="p-6">
              <ImageUpload
                shopId={shopId}
                value={imageUrl || ""}
                onChange={(url) => setValue("imageUrl", url || "")}
              />
            </div>
          </div>

          {/* Action Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
            <Button
              type="submit"
              disabled={isPending || isCheckingCode || isCodeDuplicate}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Item...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  Save {category.name} Item
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/shop/inventory")}
              className="w-full h-11 border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
