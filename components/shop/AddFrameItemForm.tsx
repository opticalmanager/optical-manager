"use client";

import { useTransition } from "react";
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
  AlertCircle
} from "lucide-react";
import { frameItemSchema } from "@/utils/validators";
import { createFrameItemAction } from "@/actions/inventory.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

interface AddFrameItemFormProps {
  shopId: string;
}

export function AddFrameItemForm({ shopId }: AddFrameItemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(frameItemSchema),
    defaultValues: {
      name: "",
      brand: "",
      costPrice: 0,
      price: 0,
      hsnCode: "90049000", // Standard Global HSN code for optical frames
      cgstPercent: 6,      // Standard SGST/CGST rates for optical products
      sgstPercent: 6,
      igstPercent: 12,
      vendorName: "",
      rackLocation: "",
      quantity: 0,
      minQuantity: 5,
      requiresExpiryTracking: false,
      batchNumber: "",
      expiryDate: "",
      imageUrl: "",
      modelNumber: "",
      colorCode: "",
      size: "",
      material: "Acetate",
      frameShape: "Rectangle",
      targetDemographic: "Unisex",
    },
  });

  // Watch fields for interactive live SKU preview
  const brand = watch("brand");
  const modelNumber = watch("modelNumber");
  const colorCode = watch("colorCode");
  const requiresExpiry = watch("requiresExpiryTracking");
  const imageUrl = watch("imageUrl");

  // Compute live SKU preview code
  const getSkuPreview = () => {
    const b = (brand || "GEN")
      .replace(/[^A-Za-z]/g, "")
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, "X");
    const m = (modelNumber || "000000")
      .replace(/[^A-Za-z0-9]/g, "")
      .substring(0, 6)
      .toUpperCase();
    const c = (colorCode || "000")
      .replace(/[^A-Za-z0-9]/g, "")
      .substring(0, 3)
      .toUpperCase();
    return `FRM-${b}${m}-${c}-###`;
  };

  const onSubmit = async (data: any) => {
    startTransition(async () => {
      try {
        const result = await createFrameItemAction(undefined, data);
        if (result?.success) {
          toast.success(result.message || "Frame item saved successfully.");
          router.push("/shop/inventory");
        } else {
          toast.error(result?.message || "Failed to save frame item.");
        }
      } catch (err: any) {
        console.error("Save error:", err);
        toast.error("An unexpected error occurred while saving.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => router.push("/shop/inventory")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Inventory
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Inventory Management
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              FRAMES INGESTION
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Cataloging clinical and retail assets with premium precision.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/60 max-w-fit">
        <button
          type="button"
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white rounded-lg shadow-sm"
        >
          Frames
        </button>
        <button
          type="button"
          disabled
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-400 bg-transparent rounded-lg flex items-center gap-1.5 cursor-not-allowed opacity-60"
        >
          Lenses
          <Lock className="h-3 w-3" />
        </button>
        <button
          type="button"
          disabled
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-400 bg-transparent rounded-lg flex items-center gap-1.5 cursor-not-allowed opacity-60"
        >
          Contact Lenses
          <Lock className="h-3 w-3" />
        </button>
        <button
          type="button"
          disabled
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-400 bg-transparent rounded-lg flex items-center gap-1.5 cursor-not-allowed opacity-60"
        >
          Accessories
          <Lock className="h-3 w-3" />
        </button>
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side Fields: 8 columns */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card: Basic Information */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Info className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Basic Information
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Ray-Ban Wayfarer Classic"
                  className="h-11 border-slate-200 bg-white"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name.message as string}
                  </p>
                )}
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
                    className="h-11 bg-slate-50 border-dashed border-slate-300 text-indigo-600 font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Auto-generated using category, brand, model, color code and serial number.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Brand
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Ray-Ban"
                    className="h-11 border-slate-200"
                    {...register("brand")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Model Number
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. RX5154"
                    className="h-11 border-slate-200"
                    {...register("modelNumber")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Color Code
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 2000"
                    className="h-11 border-slate-200"
                    {...register("colorCode")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Size
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 52-18-140"
                    className="h-11 border-slate-200"
                    {...register("size")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Material
                  </label>
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                    {...register("material")}
                  >
                    <option value="Acetate">Acetate</option>
                    <option value="Metal">Metal</option>
                    <option value="Titanium">Titanium</option>
                    <option value="TR-90">TR-90</option>
                    <option value="Nylon">Nylon</option>
                    <option value="Carbon Fiber">Carbon Fiber</option>
                    <option value="Stainless Steel">Stainless Steel</option>
                    <option value="Wood">Wood</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Frame Shape
                  </label>
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                    {...register("frameShape")}
                  >
                    <option value="Rectangle">Rectangle</option>
                    <option value="Round">Round</option>
                    <option value="Aviator">Aviator</option>
                    <option value="Cat-Eye">Cat-Eye</option>
                    <option value="Oval">Oval</option>
                    <option value="Square">Square</option>
                    <option value="Clubmaster">Clubmaster</option>
                    <option value="Wrap">Wrap</option>
                    <option value="Geometric">Geometric</option>
                    <option value="Rimless">Rimless</option>
                    <option value="Semi-Rimless">Semi-Rimless</option>
                    <option value="Browline">Browline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Target Demographic
                  </label>
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                    {...register("targetDemographic")}
                  >
                    <option value="Unisex">Unisex</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Children">Children</option>
                    <option value="Teen">Teen</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Financial Calibration */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <DollarSign className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Financial Calibration
              </h2>
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    HSN/SAC Code
                  </label>
                  <Input
                    type="text"
                    className="h-11 border-slate-200"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    IGST (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-11 border-slate-200"
                    {...register("igstPercent")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Vendor Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter supplier or vendor name"
                    className="h-11 border-slate-200"
                    {...register("vendorName")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Physical Rack/Bin Location
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. A1-R4-B2"
                    className="h-11 border-slate-200"
                    {...register("rackLocation")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Columns: 4 columns */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card: Product Asset */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ImageIcon className="h-4 w-4 text-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Asset Upload
              </h2>
            </div>
            
            <ImageUpload
              shopId={shopId}
              value={imageUrl}
              onChange={(url) => setValue("imageUrl", url)}
            />
          </div>

          {/* Card: Inventory Control */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sliders className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Inventory Control
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Initial Stock Count
                  </label>
                  <Input
                    type="number"
                    className="h-11 border-slate-200"
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
                    Min Alert Level
                  </label>
                  <Input
                    type="number"
                    className="h-11 border-slate-200"
                    {...register("minQuantity")}
                  />
                  {errors.minQuantity && (
                    <p className="text-xs text-rose-500 font-semibold mt-1">
                      {errors.minQuantity.message as string}
                    </p>
                  )}
                </div>
              </div>

              {/* Requires Expiry Tracking Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="space-y-0.5">
                  <span className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Requires Expiry Tracking
                  </span>
                  <span className="block text-[10px] text-slate-400 leading-none">
                    For contact lenses and fluids
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    {...register("requiresExpiryTracking")}
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/25 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Batch Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Batch/Lot Number
                </label>
                <Input
                  type="text"
                  placeholder={requiresExpiry ? "Enter batch number" : "N/A for Frames"}
                  disabled={!requiresExpiry}
                  className={`h-11 ${!requiresExpiry ? "bg-slate-50 border-dashed text-slate-400 placeholder-slate-300" : "border-slate-200"}`}
                  {...register("batchNumber")}
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Expiry Date
                </label>
                <Input
                  type="date"
                  disabled={!requiresExpiry}
                  className={`h-11 ${!requiresExpiry ? "bg-slate-50 border-dashed text-slate-450" : "border-slate-200"}`}
                  {...register("expiryDate")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Button Actions */}
      <div className="flex justify-end items-center gap-4 pt-6 border-t border-slate-250">
        <button
          type="button"
          onClick={() => router.push("/shop/inventory")}
          className="text-xs font-bold uppercase tracking-wider text-slate-650 hover:text-slate-900 transition-colors"
        >
          Cancel Action
        </button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 rounded-xl flex items-center gap-1.5"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving Record...
            </>
          ) : (
            <>
              <Package className="h-4 w-4" />
              Save Item Record
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
