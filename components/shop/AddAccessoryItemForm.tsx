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
  AlertCircle
} from "lucide-react";
import { accessoryItemSchema } from "@/utils/validators";
import { createAccessoryItemAction } from "@/actions/inventory.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

interface AddAccessoryItemFormProps {
  shopId: string;
}

const STANDARD_ACCESSORY_TYPES = [
  "Eyeglass Case / Hard Case",
  "Contact Lens Solution",
  "Eyewear Cleaner Spray",
  "Microfiber Cleaning Cloth",
  "Eyeglass Chain / Strap",
  "Screwdriver / Repair Kit",
  "Silicone Nose Pads",
  "Clip-on Sunglasses",
  "Anti-fog Wipes / Spray",
  "Contact Lens Case"
];

export function AddAccessoryItemForm({ shopId }: AddAccessoryItemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCustomType, setIsCustomType] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(accessoryItemSchema),
    defaultValues: {
      name: "",
      brand: "",
      costPrice: 0,
      price: 0,
      hsnCode: "90049000",
      cgstPercent: 6,
      sgstPercent: 6,
      igstPercent: 12,
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
      type: "Eyeglass Case / Hard Case",
      customType: "",
      sizeVolume: "",
      colorPattern: "",
    },
  });

  const brand = watch("brand");
  const requiresExpiry = watch("requiresExpiryTracking");
  const imageUrl = watch("imageUrl");
  const selectedType = watch("type");

  useEffect(() => {
    if (selectedType === "Other") {
      setIsCustomType(true);
    } else {
      setIsCustomType(false);
    }
  }, [selectedType]);

  const getSkuPreview = () => {
    const b = (brand || "GEN")
      .replace(/[^A-Za-z]/g, "")
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, "X");
    return `ACC-${b}000000-000-###`;
  };

  const onSubmit = async (data: any) => {
    startTransition(async () => {
      try {
        const payload = { ...data };
        if (payload.type === "Other") {
          payload.type = payload.customType || "Other";
        }
        delete payload.customType;

        const result = await createAccessoryItemAction(undefined, payload);
        if (result?.success) {
          toast.success(result.message || "Accessory item saved successfully.");
          router.push("/shop/inventory");
        } else {
          toast.error(result?.message || "Failed to save accessory item.");
        }
      } catch (err: any) {
        console.error("Save error:", err);
        toast.error("An unexpected error occurred while saving.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-slate-800">
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
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
              ACCESSORIES INGESTION
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
          onClick={() => router.push("/shop/inventory/add?category=frame")}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-650 hover:bg-slate-200/60 bg-transparent rounded-lg flex items-center transition-all"
        >
          Frames
        </button>
        <button
          type="button"
          onClick={() => router.push("/shop/inventory/add?category=lens")}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-650 hover:bg-slate-200/60 bg-transparent rounded-lg flex items-center transition-all"
        >
          Lenses
        </button>
        <button
          type="button"
          onClick={() => router.push("/shop/inventory/add?category=contact_lens")}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-650 hover:bg-slate-200/60 bg-transparent rounded-lg flex items-center transition-all"
        >
          Contact Lenses
        </button>
        <button
          type="button"
          onClick={() => router.push("/shop/inventory/add?category=accessory")}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white rounded-lg shadow-sm"
        >
          Accessories
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
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Bausch & Lomb Renu Multi-purpose Solution"
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    SKU Identification
                  </label>
                  <Input
                    type="text"
                    disabled
                    value={getSkuPreview()}
                    className="h-11 bg-slate-50 border-dashed border-slate-300 text-indigo-600 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Brand / Manufacturer
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Bausch + Lomb, Generic"
                    className="h-11 border-slate-200"
                    {...register("brand")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Select Type
                  </label>
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                    {...register("type")}
                  >
                    {STANDARD_ACCESSORY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="Other">Others...</option>
                  </select>

                  {isCustomType && (
                    <div className="mt-3 animate-transition">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-indigo-600 mb-1">
                        Enter Custom Type <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g., Led Clip Light, Nosepad Plier"
                        className="h-10 border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                        {...register("customType")}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Size / Volume
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., 120ml, 60ml, Standard Size"
                    className="h-11 border-slate-200"
                    {...register("sizeVolume")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                  Color / Pattern
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Matte Black, Floral Print"
                  className="h-11 border-slate-200"
                  {...register("colorPattern")}
                />
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Retail Selling Price (₹) <span className="text-rose-500">*</span>
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">
                    HSN/SAC Code
                  </label>
                  <Input
                    type="text"
                    className="h-11 border-slate-200"
                    {...register("hsnCode")}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">
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
                Upload Master Image
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
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                  Initial Unit Count
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                  Purchase Invoice No.
                </label>
                <Input
                  type="text"
                  placeholder="e.g., PI-2024-001"
                  className="h-11 border-slate-200"
                  {...register("purchaseInvoiceNo")}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Purchase Date
                </label>
                <Input
                  type="date"
                  className="h-11 border-slate-200"
                  {...register("inwardDate")}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">
                  Low Stock Threshold
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

              {/* Requires Expiry Tracking Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="space-y-0.5">
                  <span className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Requires Expiry Tracking
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">
                  Batch Number
                </label>
                <Input
                  type="text"
                  placeholder={requiresExpiry ? "Enter batch number" : "N/A"}
                  disabled={!requiresExpiry}
                  className={`h-11 ${!requiresExpiry ? "bg-slate-50 border-dashed text-slate-400 placeholder-slate-300" : "border-slate-200"}`}
                  {...register("batchNumber")}
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5 flex items-center gap-1">
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
          className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
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
