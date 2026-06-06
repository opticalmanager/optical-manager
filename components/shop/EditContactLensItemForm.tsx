"use client";

import { useTransition } from "react";
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
import { editContactLensItemSchema } from "@/utils/validators";
import { updateContactLensItemAction } from "@/actions/inventory.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

interface EditContactLensItemFormProps {
  initialData: any;
  shopId: string;
  itemId: string;
}

export function EditContactLensItemForm({
  initialData,
  shopId,
  itemId,
}: EditContactLensItemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editContactLensItemSchema),
    defaultValues: {
      name: initialData.name || "",
      brand: initialData.brand || "",
      costPrice: parseFloat(initialData.costPrice) || 0,
      price: parseFloat(initialData.price) || 0,
      hsnCode: initialData.hsnCode || "90013000",
      cgstPercent: parseFloat(initialData.cgstPercent) || 0,
      sgstPercent: parseFloat(initialData.sgstPercent) || 0,
      igstPercent: parseFloat(initialData.igstPercent) || 0,
      vendorName: initialData.vendorName || "",
      rackLocation: initialData.rackLocation || "",
      purchaseInvoiceNo: initialData.purchaseInvoiceNo || "",
      inwardDate: initialData.inwardDate || "",
      requiresExpiryTracking: initialData.requiresExpiryTracking || false,
      batchNumber: initialData.batchNumber || "",
      expiryDate: initialData.expiryDate || "",
      imageUrl: initialData.imageUrl || "",
      modality: initialData.modality || "Daily Disposable",
      boxQuantity: initialData.boxQuantity || 30,
      baseCurve: initialData.baseCurve || "8.6",
      diameter: initialData.diameter || "14.2",
      color: initialData.color || "Clear / Tint",
      sphere: initialData.sphere || "-0.00",
      cylinder: initialData.cylinder || "-0.00",
      axis: initialData.axis || "180",
      addPower: initialData.addPower || "N/A",
      addStockQuantity: 0,
      minQuantity: initialData.minQuantity || 5,
    },
  });

  const requiresExpiry = watch("requiresExpiryTracking");
  const imageUrl = watch("imageUrl");
  const addStockQuantity = watch("addStockQuantity") || 0;

  const currentStock = initialData.quantity || 0;
  const resultingStock = Number(currentStock) + Number(addStockQuantity);

  const onSubmit = async (data: any) => {
    startTransition(async () => {
      try {
        const result = await updateContactLensItemAction(itemId, undefined, data);
        if (result?.success) {
          toast.success(result.message || "Contact lens item updated successfully.");
          router.push("/shop/inventory");
        } else {
          toast.error(result?.message || "Failed to update contact lens item.");
        }
      } catch (err: any) {
        console.error("Update error:", err);
        toast.error("An unexpected error occurred while saving updates.");
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
              Edit Contact Lens Details
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
              SKU: {initialData.sku}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Modify product parameters and securely restock retail count assets.
          </p>
        </div>
      </div>

      {/* Category Tabs (Locked) */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/60 max-w-fit opacity-75">
        <button
          type="button"
          disabled
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-slate-200 text-slate-650 rounded-lg cursor-not-allowed flex items-center gap-1"
        >
          Contact Lenses
          <Lock className="h-3 w-3 text-slate-500" />
        </button>
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side Fields: 8 columns */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card: Contact Lens Specifications */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Info className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Contact Lens Specifications
              </h2>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Acuvue Oasys for Astigmatism"
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
                    SKU Identification (Locked)
                  </label>
                  <Input
                    type="text"
                    disabled
                    value={initialData.sku || ""}
                    className="h-11 bg-slate-50 border-dashed border-slate-300 text-slate-500 font-mono font-bold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Brand / Manufacturer
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Johnson & Johnson"
                    className="h-11 border-slate-200"
                    {...register("brand")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Modality
                  </label>
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                    {...register("modality")}
                  >
                    <option value="Daily Disposable">Daily Disposable</option>
                    <option value="Weekly Disposable">Weekly Disposable</option>
                    <option value="Monthly Disposable">Monthly Disposable</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Box Quantity
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g., 30"
                    className="h-11 border-slate-200 font-semibold"
                    {...register("boxQuantity")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">
                    Base Curve (BC)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., 8.6"
                    className="h-11 border-slate-200 font-semibold"
                    {...register("baseCurve")}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Diameter (DIA)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., 14.2"
                    className="h-11 border-slate-200 font-semibold"
                    {...register("diameter")}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">
                    Color
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Clear / Tint"
                    className="h-11 border-slate-200"
                    {...register("color")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Sphere (SPH)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., -2.25"
                    className="h-11 border-slate-200 font-semibold"
                    {...register("sphere")}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Cylinder (CYL)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., -0.75"
                    className="h-11 border-slate-200 font-semibold"
                    {...register("cylinder")}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
                    Axis
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., 180"
                    className="h-11 border-slate-200 font-semibold"
                    {...register("axis")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5">
                  Add Power
                </label>
                <select
                  className="w-full h-11 px-3 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                  {...register("addPower")}
                >
                  <option value="N/A">N/A</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
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
                    placeholder="e.g. L-R2-B4"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-455 mb-1.5">
                    Initial Stock Count
                  </label>
                  <Input
                    type="number"
                    disabled
                    value={currentStock}
                    className="h-11 bg-slate-50 border-dashed border-slate-300 text-slate-500 font-bold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Add Stock Units
                  </label>
                  <Input
                    type="number"
                    className="h-11 border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 font-bold text-indigo-650 bg-indigo-50/5"
                    placeholder="0"
                    {...register("addStockQuantity")}
                  />
                  {errors.addStockQuantity && (
                    <p className="text-xs text-rose-500 font-semibold mt-1">
                      {errors.addStockQuantity.message as string}
                    </p>
                  )}
                </div>
              </div>

              {/* Live resulting stock calculator view */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-center">
                <span className="block text-[10px] uppercase font-bold text-indigo-500 tracking-wider">
                  Resulting Stock Level
                </span>
                <span className="block text-xl font-bold text-indigo-750 mt-0.5">
                  {resultingStock} Units
                </span>
                <span className="block text-[9px] text-slate-400 mt-0.5 font-medium">
                  Original {currentStock} + Added {addStockQuantity}
                </span>
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 flex items-center gap-1">
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
              Saving Updates...
            </>
          ) : (
            <>
              <Package className="h-4 w-4" />
              Save Item updates
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
