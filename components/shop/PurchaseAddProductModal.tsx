"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Check,
  AlertCircle,
  Package,
  Sliders,
  DollarSign,
  Tag,
  Percent,
  Sparkles,
} from "lucide-react";
import { CategoryItem } from "@/services/category.service";
import { createPurchaseProductAction } from "@/actions/purchase.actions";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LensPowerMatrix } from "./LensPowerMatrix";
import { handleEnterKeyNavigation } from "@/utils/form-navigation";

export interface ProductModalData {
  inventoryId?: string | null;
  productName?: string;
  productCode?: string;
  category?: string;
  brand?: string;
  model?: string;
  gender?: string;
  color?: string;
  size?: string;
  type?: string;
  material?: string;
  frameShape?: string;
  modelNumber?: string;
  rackLocation?: string;

  // Lens Specs
  design?: string;
  refractiveIndex?: string;
  lensMaterial?: string;
  blankDiameter?: number;
  stockPower?: string;
  isUncoated?: boolean;
  isAntiReflective?: boolean;
  isBlueControl?: boolean;
  isTinted?: boolean;
  isPolarized?: boolean;
  isHardCoat?: boolean;
  isPhotochromic?: boolean;

  // Contact Lens Specs
  modality?: string;
  boxQuantity?: number;
  baseCurve?: string;
  diameter?: string;
  contactColor?: string;
  sphere?: string;
  cylinder?: string;
  axis?: string;
  addPower?: string;

  // Accessory / Solution Specs
  accessoryType?: string;
  sizeVolume?: string;
  colorPattern?: string;

  // Expiry
  requiresExpiryTracking?: boolean;
  batchNumber?: string;
  expiryDate?: string;

  // Financial & Tax
  unitPrice?: number;
  basePrice?: number;
  hsnCode?: string;
  gstPercent?: number;
  cgstPercent?: number;
  cgstAmount?: number;
  sgstPercent?: number;
  sgstAmount?: number;
  igstPercent?: number;
  igstAmount?: number;
  purchasePrice?: number;
  quantity?: number | "";
  totalPurchasePrice?: number;
  retailPrice?: number;
  details?: string;
  allowNegativeInventory?: boolean;
}

interface PurchaseAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  initialData?: ProductModalData | null;
  initialProductCode?: string;
  vendorName?: string;
  onProductAdded: (product: {
    inventoryId: string;
    productName: string;
    productCode: string;
    category: string;
    brand?: string;
    model?: string;
    gender?: string;
    color?: string;
    size?: string;
    type?: string;
    material?: string;
    frameShape?: string;
    modelNumber?: string;
    rackLocation?: string;
    design?: string;
    refractiveIndex?: string;
    lensMaterial?: string;
    blankDiameter?: number;
    stockPower?: string;
    isUncoated?: boolean;
    isAntiReflective?: boolean;
    isBlueControl?: boolean;
    isTinted?: boolean;
    isPolarized?: boolean;
    isHardCoat?: boolean;
    isPhotochromic?: boolean;
    modality?: string;
    boxQuantity?: number;
    baseCurve?: string;
    diameter?: string;
    contactColor?: string;
    sphere?: string;
    cylinder?: string;
    axis?: string;
    addPower?: string;
    accessoryType?: string;
    sizeVolume?: string;
    colorPattern?: string;
    requiresExpiryTracking?: boolean;
    batchNumber?: string;
    expiryDate?: string;
    unitPrice: number;
    basePrice: number;
    hsnCode: string;
    gstPercent: number;
    cgstPercent: number;
    cgstAmount: number;
    sgstPercent: number;
    sgstAmount: number;
    igstPercent: number;
    igstAmount: number;
    purchasePrice: number;
    quantity: number;
    totalPurchasePrice: number;
    retailPrice: number;
    details: string;
    allowNegativeInventory?: boolean;
  }) => void;
}

const FRAME_SHAPES = [
  "Rectangle",
  "Square",
  "Aviator",
  "Round",
  "Cat Eye",
  "Wayfarer",
  "Clubmaster",
  "Oval",
  "Geometric / Hexagon",
  "Rimless Sport",
];

const FRAME_MATERIALS = [
  "Acetate",
  "TR90 Flexible",
  "Titanium",
  "Metal / Steel",
  "Ultem",
  "Mixed (Metal + Acetate)",
];

const LENS_DESIGNS = [
  "Single Vision",
  "Bifocal - D Segment",
  "Bifocal - Round Top",
  "Progressive / Multifocal",
  "Blue-Cut Computer",
  "Toric / Astigmatic",
];

const LENS_INDICES = [
  { value: "1.50", label: "1.50 Standard (CR-39)" },
  { value: "1.56", label: "1.56 Mid Index Thin" },
  { value: "1.59", label: "1.59 Polycarbonate" },
  { value: "1.60", label: "1.60 High Index" },
  { value: "1.67", label: "1.67 Super High Index" },
  { value: "1.74", label: "1.74 Ultra Thin" },
];

const LENS_COATINGS = [
  "Anti-Reflective (ARC)",
  "Blue Cut / Control",
  "Photochromic (Day/Night)",
  "Hard / Scratch Coat",
  "Polarized",
  "Tinted / Sunglasses",
  "Uncoated",
];

const CONTACT_MODALITIES = [
  "Daily Disposable",
  "Monthly Disposable",
  "Bi-Weekly (14-Day)",
  "Yearly / Conventional",
];

const STANDARD_ACCESSORY_TYPES = [
  "Eyeglass Case / Hard Case",
  "Contact Lens Solution",
  "Eyewear Cleaner Spray",
  "Microfiber Cleaning Cloth",
  "Silicone Nose Pads",
  "Eyeglass Chain / Strap",
  "Screwdriver / Repair Kit",
  "Clip-on Sunglasses",
  "Other Accessory",
];

export function PurchaseAddProductModal({
  isOpen,
  onClose,
  categories,
  initialData,
  initialProductCode = "",
  vendorName = "",
  onProductAdded,
}: PurchaseAddProductModalProps) {
  // Active Category selection
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>(
    initialData?.category || categories[0]?.code || "FRAME"
  );

  // Common Header & Identification
  const [productCode, setProductCode] = useState(
    initialData?.productCode || initialProductCode || ""
  );
  const [name, setName] = useState(initialData?.productName || "");
  const [brand, setBrand] = useState(initialData?.brand || "");

  // Frame Specifics
  const [gender, setGender] = useState(initialData?.gender || "Unisex");
  const [color, setColor] = useState(initialData?.color || "");
  const [size, setSize] = useState(initialData?.size || "");
  const [type, setType] = useState(initialData?.type || "Full Rim");
  const [material, setMaterial] = useState(initialData?.material || "Acetate");
  const [frameShape, setFrameShape] = useState(initialData?.frameShape || "Rectangle");

  // Lens Specifics
  const [design, setDesign] = useState(initialData?.design || "Single Vision");
  const [refractiveIndex, setRefractiveIndex] = useState(
    initialData?.refractiveIndex || "1.56"
  );
  const [lensCoating, setLensCoating] = useState(
    initialData?.isBlueControl
      ? "Blue Cut / Control"
      : initialData?.isPhotochromic
      ? "Photochromic (Day/Night)"
      : "Anti-Reflective (ARC)"
  );
  const [stockPower, setStockPower] = useState(initialData?.stockPower || "");

  // Contact Lens Specifics
  const [modality, setModality] = useState(
    initialData?.modality || "Monthly Disposable"
  );
  const [boxQuantity, setBoxQuantity] = useState<number>(
    initialData?.boxQuantity || 6
  );
  const [baseCurve, setBaseCurve] = useState(initialData?.baseCurve || "8.6");
  const [diameter, setDiameter] = useState(initialData?.diameter || "14.2");
  const [contactColor, setContactColor] = useState(
    initialData?.contactColor || initialData?.color || "Clear"
  );
  const [sphere, setSphere] = useState(initialData?.sphere || "-0.00");

  // Accessory / Solution Specifics
  const [accessoryType, setAccessoryType] = useState(
    initialData?.accessoryType || initialData?.type || "Eyeglass Case / Hard Case"
  );
  const [sizeVolume, setSizeVolume] = useState(
    initialData?.sizeVolume || initialData?.size || ""
  );

  // Financial & Tax States
  const [quantity, setQuantity] = useState<number>(
    typeof initialData?.quantity === "number" && initialData.quantity > 0
      ? initialData.quantity
      : 1
  );
  const [hsnCode, setHsnCode] = useState(initialData?.hsnCode || "");
  const [gstPercent, setGstPercent] = useState<number>(
    initialData?.gstPercent !== undefined ? initialData.gstPercent : 12
  );
  const [cgstPercent, setCgstPercent] = useState<number>(
    initialData?.cgstPercent !== undefined ? initialData.cgstPercent : 6
  );
  const [sgstPercent, setSgstPercent] = useState<number>(
    initialData?.sgstPercent !== undefined ? initialData.sgstPercent : 6
  );
  const [igstPercent, setIgstPercent] = useState<number>(
    initialData?.igstPercent !== undefined ? initialData.igstPercent : 12
  );
  const [purchaseRs, setPurchaseRs] = useState<number>(
    initialData?.unitPrice !== undefined ? initialData.unitPrice : 0
  );
  const [retailPrice, setRetailPrice] = useState<number>(
    initialData?.retailPrice !== undefined ? initialData.retailPrice : 0
  );

  // Code verification state
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isCodeDuplicate, setIsCodeDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPowerMatrixOpen, setIsPowerMatrixOpen] = useState(false);

  // Synchronize state when modal is opened or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const cat = initialData.category || categories[0]?.code || "FRAME";
        setSelectedCategoryCode(cat);
        setProductCode(initialData.productCode || initialProductCode || "");
        setName(initialData.productName || "");
        setBrand(initialData.brand || "");

        // Frame
        setGender(initialData.gender || "Unisex");
        setColor(initialData.color || "");
        setSize(initialData.size || "");
        setType(initialData.type || "Full Rim");
        setMaterial(initialData.material || "Acetate");
        setFrameShape(initialData.frameShape || "Rectangle");

        // Lens
        setDesign(initialData.design || "Single Vision");
        setRefractiveIndex(initialData.refractiveIndex || "1.56");
        setLensCoating(
          initialData.isBlueControl
            ? "Blue Cut / Control"
            : initialData.isPhotochromic
            ? "Photochromic (Day/Night)"
            : "Anti-Reflective (ARC)"
        );
        setStockPower(initialData.stockPower || "");

        // Contact Lens
        setModality(initialData.modality || "Monthly Disposable");
        setBoxQuantity(initialData.boxQuantity || 6);
        setBaseCurve(initialData.baseCurve || "8.6");
        setDiameter(initialData.diameter || "14.2");
        setContactColor(initialData.contactColor || initialData.color || "Clear");
        setSphere(initialData.sphere || "-0.00");

        // Accessory
        setAccessoryType(
          initialData.accessoryType || initialData.type || "Eyeglass Case / Hard Case"
        );
        setSizeVolume(initialData.sizeVolume || initialData.size || "");

        // Financials
        setQuantity(
          typeof initialData.quantity === "number" && initialData.quantity > 0
            ? initialData.quantity
            : 1
        );
        setHsnCode(initialData.hsnCode || "");
        setGstPercent(initialData.gstPercent !== undefined ? initialData.gstPercent : 12);
        setCgstPercent(initialData.cgstPercent !== undefined ? initialData.cgstPercent : 6);
        setSgstPercent(initialData.sgstPercent !== undefined ? initialData.sgstPercent : 6);
        setIgstPercent(initialData.igstPercent !== undefined ? initialData.igstPercent : 12);
        setPurchaseRs(initialData.unitPrice !== undefined ? initialData.unitPrice : 0);
        setRetailPrice(initialData.retailPrice !== undefined ? initialData.retailPrice : 0);
      } else {
        const cat = categories[0]?.code || "FRAME";
        setSelectedCategoryCode(cat);
        setProductCode(initialProductCode || "");
        setName("");
        setBrand("");
        setGender("Unisex");
        setColor("");
        setSize("");
        setType("Full Rim");
        setMaterial("Acetate");
        setFrameShape("Rectangle");
        setDesign("Single Vision");
        setRefractiveIndex("1.56");
        setLensCoating("Anti-Reflective (ARC)");
        setStockPower("");
        setModality("Monthly Disposable");
        setBoxQuantity(6);
        setBaseCurve("8.6");
        setDiameter("14.2");
        setContactColor("Clear");
        setSphere("-0.00");
        setAccessoryType("Eyeglass Case / Hard Case");
        setSizeVolume("");
        setQuantity(1);
        setPurchaseRs(0);
        setRetailPrice(0);

        // Auto populate HSN and GST for first category
        const matched = categories[0];
        if (matched) {
          const igst = parseFloat(matched.igstPercent) || 12;
          const half = Number((igst / 2).toFixed(2));
          setHsnCode(matched.hsnCode || "");
          setGstPercent(igst);
          setIgstPercent(igst);
          setCgstPercent(parseFloat(matched.cgstPercent) || half);
          setSgstPercent(parseFloat(matched.sgstPercent) || half);
        }
      }
      setIsCodeDuplicate(false);
    }
  }, [isOpen, initialData, initialProductCode, categories]);

  // When selected category changes (user clicks category tab), auto-fill GST and HSN from category tax data
  const handleCategorySwitch = (newCatCode: string) => {
    setSelectedCategoryCode(newCatCode);
    const matched = categories.find(
      (c) => c.code.toUpperCase() === newCatCode.toUpperCase()
    );
    if (matched) {
      const igst = parseFloat(matched.igstPercent) || 12;
      const half = Number((igst / 2).toFixed(2));
      setHsnCode(matched.hsnCode || "");
      setGstPercent(igst);
      setIgstPercent(igst);
      setCgstPercent(parseFloat(matched.cgstPercent) || half);
      setSgstPercent(parseFloat(matched.sgstPercent) || half);
    }
  };

  // Debounced check for product code uniqueness (scoped by vendor if selected)
  useEffect(() => {
    const code = productCode.trim().toUpperCase();
    if (!code) {
      setIsCodeDuplicate(false);
      setIsCheckingCode(false);
      return;
    }

    // If editing existing product with same code, skip duplicate warning
    if (initialData?.productCode && initialData.productCode.toUpperCase() === code) {
      setIsCodeDuplicate(false);
      setIsCheckingCode(false);
      return;
    }

    setIsCheckingCode(true);
    const timer = setTimeout(async () => {
      try {
        const vendorParam = vendorName ? `&vendor=${encodeURIComponent(vendorName)}` : "";
        const res = await fetch(
          `/api/inventory/check-code?code=${encodeURIComponent(code)}${vendorParam}`
        );
        if (res.ok) {
          const json = await res.json();
          if (initialData?.inventoryId && initialData.productCode?.toUpperCase() === code) {
            setIsCodeDuplicate(false);
          } else {
            setIsCodeDuplicate(Boolean(json.exists));
          }
        }
      } catch (e) {
        console.error("Code check failed:", e);
      } finally {
        setIsCheckingCode(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [productCode, initialData, vendorName]);

  // GST 50/50 Smart Split
  const handleGstChange = (val: number) => {
    const safeGst = isNaN(val) ? 0 : Math.max(0, val);
    setGstPercent(safeGst);
    setIgstPercent(safeGst);
    const half = Number((safeGst / 2).toFixed(2));
    setCgstPercent(half);
    setSgstPercent(half);
  };

  // Real-time calculations
  const safeQty = Math.max(1, quantity || 1);
  const safePurchaseRs = Math.max(0, purchaseRs || 0);
  const basicPrice = Number((safeQty * safePurchaseRs).toFixed(2));
  const gstAmountRs = Number((basicPrice * (gstPercent / 100)).toFixed(2));
  const totalPurchase = Number((basicPrice + gstAmountRs).toFixed(2));
  const purchasePricePerUnit = Number(
    (safePurchaseRs * (1 + gstPercent / 100)).toFixed(2)
  );
  const cgstAmount = Number((basicPrice * (cgstPercent / 100)).toFixed(2));
  const sgstAmount = Number((basicPrice * (sgstPercent / 100)).toFixed(2));
  const igstAmount = Number((basicPrice * (igstPercent / 100)).toFixed(2));

  // Build smart snapshot details summary based on category
  const buildDetailsSummary = () => {
    const cat = selectedCategoryCode.toUpperCase();
    if (cat === "FRAME") {
      return [
        brand.trim(),
        frameShape,
        type,
        material,
        color.trim(),
        size.trim(),
        gender !== "Unisex" ? gender : "",
      ]
        .filter(Boolean)
        .join(" | ");
    }
    if (cat === "LENS") {
      return [
        brand.trim(),
        design,
        refractiveIndex,
        lensCoating,
        stockPower.trim(),
      ]
        .filter(Boolean)
        .join(" | ");
    }
    if (cat === "CONTACT_LENS") {
      return [
        brand.trim(),
        modality,
        `BC:${baseCurve} DIA:${diameter}`,
        contactColor !== "Clear" ? contactColor : "",
        sphere ? `SPH:${sphere}` : "",
        boxQuantity ? `Pack of ${boxQuantity}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    }
    if (cat === "ACCESSORY" || cat === "SOLUTION") {
      return [brand.trim(), accessoryType, sizeVolume.trim()]
        .filter(Boolean)
        .join(" | ");
    }
    return [brand.trim(), name.trim()].filter(Boolean).join(" | ");
  };

  // Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productCode.trim()) {
      toast.error("Product code is required.");
      return;
    }

    if (!name.trim()) {
      toast.error("Product name is required.");
      return;
    }

    if (isCodeDuplicate) {
      toast.error(
        vendorName
          ? `Product code already exists for vendor "${vendorName}".`
          : "Product code already exists."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const detailsStr = buildDetailsSummary() || name.trim();
      const catUpper = selectedCategoryCode.toUpperCase();

      // If product already exists in inventory, apply directly
      if (initialData?.inventoryId) {
        onProductAdded({
          inventoryId: initialData.inventoryId,
          productName: name.trim(),
          productCode: productCode.trim().toUpperCase(),
          category: selectedCategoryCode,
          brand: brand.trim(),
          model: type.trim() || design || accessoryType,
          gender,
          color: color.trim(),
          size: size.trim(),
          type: type.trim(),
          material: material.trim(),
          frameShape,
          design,
          refractiveIndex,
          stockPower: stockPower.trim(),
          isAntiReflective: lensCoating.includes("ARC") || lensCoating.includes("Anti-Reflective"),
          isBlueControl: lensCoating.includes("Blue"),
          isPhotochromic: lensCoating.includes("Photochromic"),
          isHardCoat: lensCoating.includes("Hard"),
          isPolarized: lensCoating.includes("Polarized"),
          isTinted: lensCoating.includes("Tinted"),
          isUncoated: lensCoating.includes("Uncoated"),
          modality,
          boxQuantity,
          baseCurve,
          diameter,
          contactColor,
          sphere,
          accessoryType,
          sizeVolume: sizeVolume.trim(),
          unitPrice: safePurchaseRs,
          basePrice: basicPrice,
          hsnCode: hsnCode.trim(),
          gstPercent,
          cgstPercent,
          cgstAmount,
          sgstPercent,
          sgstAmount,
          igstPercent,
          igstAmount,
          purchasePrice: purchasePricePerUnit,
          quantity: safeQty,
          totalPurchasePrice: totalPurchase,
          retailPrice: retailPrice || 0,
          details: detailsStr,
        });

        toast.success(`Applied product details.`);
        onClose();
        return;
      }

      // Create new catalog item with essential category specs
      const res = await createPurchaseProductAction({
        category: selectedCategoryCode,
        productCode: productCode.trim().toUpperCase(),
        productName: name.trim(),
        brand: brand.trim() || undefined,
        vendorName: vendorName.trim() || undefined,

        // Frame
        gender: catUpper === "FRAME" ? gender : undefined,
        color: catUpper === "FRAME" ? color.trim() : undefined,
        size: catUpper === "FRAME" ? size.trim() : undefined,
        type: catUpper === "FRAME" ? type.trim() : undefined,
        material: catUpper === "FRAME" ? material.trim() : undefined,
        frameShape: catUpper === "FRAME" ? frameShape : undefined,

        // Lens
        design: catUpper === "LENS" ? design : undefined,
        refractiveIndex: catUpper === "LENS" ? refractiveIndex : undefined,
        stockPower: catUpper === "LENS" ? stockPower.trim() : undefined,
        isAntiReflective: lensCoating.includes("ARC") || lensCoating.includes("Anti-Reflective"),
        isBlueControl: lensCoating.includes("Blue"),
        isPhotochromic: lensCoating.includes("Photochromic"),
        isHardCoat: lensCoating.includes("Hard"),
        isPolarized: lensCoating.includes("Polarized"),
        isTinted: lensCoating.includes("Tinted"),
        isUncoated: lensCoating.includes("Uncoated"),

        // Contact Lens
        modality: catUpper === "CONTACT_LENS" ? modality : undefined,
        boxQuantity: catUpper === "CONTACT_LENS" ? boxQuantity : undefined,
        baseCurve: catUpper === "CONTACT_LENS" ? baseCurve : undefined,
        diameter: catUpper === "CONTACT_LENS" ? diameter : undefined,
        contactColor: catUpper === "CONTACT_LENS" ? contactColor.trim() : undefined,
        sphere: catUpper === "CONTACT_LENS" ? sphere.trim() : undefined,

        // Accessory / Solution
        accessoryType:
          catUpper === "ACCESSORY" || catUpper === "SOLUTION"
            ? accessoryType
            : undefined,
        sizeVolume:
          catUpper === "ACCESSORY" || catUpper === "SOLUTION"
            ? sizeVolume.trim()
            : undefined,

        // Financials
        hsnCode: hsnCode.trim() || undefined,
        gstPercent,
        cgstPercent,
        sgstPercent,
        igstPercent,
        costPrice: safePurchaseRs,
        retailPrice: retailPrice || 0,
      });

      if (res.success && res.item) {
        toast.success(res.message);

        onProductAdded({
          inventoryId: res.item.id,
          productName: name.trim(),
          productCode: productCode.trim().toUpperCase(),
          category: selectedCategoryCode,
          brand: brand.trim(),
          model: type.trim() || design || accessoryType,
          gender,
          color: color.trim(),
          size: size.trim(),
          type: type.trim(),
          material: material.trim(),
          frameShape,
          design,
          refractiveIndex,
          stockPower: stockPower.trim(),
          isAntiReflective: lensCoating.includes("ARC") || lensCoating.includes("Anti-Reflective"),
          isBlueControl: lensCoating.includes("Blue"),
          isPhotochromic: lensCoating.includes("Photochromic"),
          isHardCoat: lensCoating.includes("Hard"),
          isPolarized: lensCoating.includes("Polarized"),
          isTinted: lensCoating.includes("Tinted"),
          isUncoated: lensCoating.includes("Uncoated"),
          modality,
          boxQuantity,
          baseCurve,
          diameter,
          contactColor,
          sphere,
          accessoryType,
          sizeVolume: sizeVolume.trim(),
          unitPrice: safePurchaseRs,
          basePrice: basicPrice,
          hsnCode: hsnCode.trim(),
          gstPercent,
          cgstPercent,
          cgstAmount,
          sgstPercent,
          sgstAmount,
          igstPercent,
          igstAmount,
          purchasePrice: purchasePricePerUnit,
          quantity: safeQty,
          totalPurchasePrice: totalPurchase,
          retailPrice: retailPrice || 0,
          details: detailsStr,
        });

        onClose();
      } else {
        toast.error(res.message || "Failed to create product.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentCategoryName =
    categories.find(
      (c) => c.code.toUpperCase() === selectedCategoryCode.toUpperCase()
    )?.name || selectedCategoryCode;

  const activeCategoryCode = selectedCategoryCode.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-5 overflow-hidden animate-in fade-in-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-[96vw] max-w-5xl h-[92vh] max-h-[780px] flex flex-col overflow-hidden animate-scale-up">
        
        {/* 1. FIXED TOP HEADER BAR - ALWAYS 100% VISIBLE */}
        <div className="py-2.5 px-4 sm:px-5 bg-[#2563eb] text-white flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-white/10 backdrop-blur-xs">
              <Package className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                {currentCategoryName} Details
              </h2>
              {vendorName && (
                <span className="text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-md">
                  Vendor: {vendorName}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 2. FIXED CATEGORY SWITCHER TABS - ALWAYS 100% VISIBLE */}
        <div className="px-4 sm:px-5 py-2 border-b border-slate-200 bg-slate-50/90 flex items-center gap-1.5 overflow-x-auto shrink-0 select-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            Category:
          </span>
          {categories.map((cat) => {
            const isActive =
              cat.code.toUpperCase() === selectedCategoryCode.toUpperCase();
            return (
              <button
                key={cat.id || cat.code}
                type="button"
                onClick={() => handleCategorySwitch(cat.code)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? "bg-[#2563eb] text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{cat.name}</span>
                {isActive && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>

        {/* 3. SCROLLABLE FORM BODY - CLEAN, BALANCED & COMPACT GRID */}
        <form
          id="purchase-product-modal-form"
          onSubmit={handleSubmit}
          onKeyDown={(e) => handleEnterKeyNavigation(e)}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs"
        >
          {/* Card 1: Essential Identification */}
          <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
              <Sliders className="h-3.5 w-3.5 text-[#2563eb]" />
              <span>Product Identification</span>
            </div>

            <div className="grid grid-cols-12 gap-2.5">
              {/* Product Code */}
              <div className="col-span-12 sm:col-span-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Product Code <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    required
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                    className={`h-8 border-slate-200 font-mono text-xs ${
                      isCodeDuplicate ? "border-rose-500 bg-rose-50/20" : ""
                    }`}
                  />
                  <div className="absolute right-2 top-2">
                    {isCheckingCode && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                    )}
                    {!isCheckingCode && productCode && !isCodeDuplicate && (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                    {!isCheckingCode && isCodeDuplicate && (
                      <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                    )}
                  </div>
                </div>
                {isCodeDuplicate && (
                  <p className="text-[10px] font-bold text-rose-600 mt-0.5">
                    {vendorName
                      ? `Code exists for ${vendorName}`
                      : "Code already exists in inventory"}
                  </p>
                )}
              </div>

              {/* Product Name */}
              <div className="col-span-12 sm:col-span-5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Product Name / Title <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>

              {/* Brand */}
              <div className="col-span-12 sm:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Brand / Make
                </label>
                <Input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="h-8 border-slate-200 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Essential Category-Specific Fields */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[10px] uppercase tracking-wider">
                <Tag className="h-3.5 w-3.5 text-[#2563eb]" />
                <span>{currentCategoryName} Specs</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                Category Attributes
              </span>
            </div>

            {/* 1. FRAME SPECS */}
            {activeCategoryCode === "FRAME" && (
              <div className="grid grid-cols-12 gap-2.5">
                {/* Frame Shape */}
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Shape
                  </label>
                  <select
                    value={frameShape}
                    onChange={(e) => setFrameShape(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    {FRAME_SHAPES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rim Type */}
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Rim Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="Full Rim">Full Rim</option>
                    <option value="Semi-Rimless">Semi-Rimless</option>
                    <option value="Rimless">Rimless</option>
                  </select>
                </div>

                {/* Material */}
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Material
                  </label>
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    {FRAME_MATERIALS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color */}
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Color
                  </label>
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 border-slate-200 text-xs"
                  />
                </div>

                {/* Size */}
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Size
                  </label>
                  <Input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="h-8 border-slate-200 text-xs"
                  />
                </div>

                {/* Gender */}
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="Unisex">Unisex</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Kids">Kids</option>
                  </select>
                </div>
              </div>
            )}

            {/* 2. LENS SPECS */}
            {activeCategoryCode === "LENS" && (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2.5">
                  {/* Lens Design */}
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Design
                    </label>
                    <select
                      value={design}
                      onChange={(e) => setDesign(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      {LENS_DESIGNS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Refractive Index */}
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Index
                    </label>
                    <select
                      value={refractiveIndex}
                      onChange={(e) => setRefractiveIndex(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      {LENS_INDICES.map((idx) => (
                        <option key={idx.value} value={idx.value}>
                          {idx.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Coating */}
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Coating / Feature
                    </label>
                    <select
                      value={lensCoating}
                      onChange={(e) => setLensCoating(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      {LENS_COATINGS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Power Range */}
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Power (SPH/CYL)
                    </label>
                    <Input
                      type="text"
                      value={stockPower}
                      onChange={(e) => setStockPower(e.target.value)}
                      className="h-8 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                {/* Lens Power SPH/CYL Matrix Trigger Banner */}
                <div className="p-2.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white rounded-xl border border-blue-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Lens Power SPH / CYL Stock Matrix</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {stockPower
                        ? `Configured: ${stockPower}`
                        : "Enter individual piece counts across Sphere (SPH) and Cylinder (CYL) powers. Quantity automatically syncs."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPowerMatrixOpen(true)}
                    className="h-8 px-3.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{stockPower ? "Edit Power Matrix" : "Open Power Matrix"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. CONTACT LENS SPECS */}
            {activeCategoryCode === "CONTACT_LENS" && (
              <div className="grid grid-cols-12 gap-2.5">
                {/* Modality */}
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Modality
                  </label>
                  <select
                    value={modality}
                    onChange={(e) => setModality(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    {CONTACT_MODALITIES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pack Size */}
                <div className="col-span-6 sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Pack Size
                  </label>
                  <Input
                    type="number"
                    value={boxQuantity}
                    onChange={(e) =>
                      setBoxQuantity(parseInt(e.target.value) || 1)
                    }
                    className="h-8 border-slate-200 text-xs font-bold"
                  />
                </div>

                {/* Base Curve / DIA */}
                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    BC / DIA
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="text"
                      value={baseCurve}
                      onChange={(e) => setBaseCurve(e.target.value)}
                      className="h-8 border-slate-200 text-xs w-1/2"
                    />
                    <Input
                      type="text"
                      value={diameter}
                      onChange={(e) => setDiameter(e.target.value)}
                      className="h-8 border-slate-200 text-xs w-1/2"
                    />
                  </div>
                </div>

                {/* Color */}
                <div className="col-span-6 sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Color
                  </label>
                  <Input
                    type="text"
                    value={contactColor}
                    onChange={(e) => setContactColor(e.target.value)}
                    className="h-8 border-slate-200 text-xs"
                  />
                </div>

                {/* Sphere */}
                <div className="col-span-6 sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Power (SPH)
                  </label>
                  <Input
                    type="text"
                    value={sphere}
                    onChange={(e) => setSphere(e.target.value)}
                    className="h-8 border-slate-200 text-xs"
                  />
                </div>
              </div>
            )}

            {/* 4. ACCESSORIES / SOLUTIONS / OTHER */}
            {(activeCategoryCode === "ACCESSORY" ||
              activeCategoryCode === "SOLUTION" ||
              (activeCategoryCode !== "FRAME" &&
                activeCategoryCode !== "LENS" &&
                activeCategoryCode !== "CONTACT_LENS")) && (
              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-12 sm:col-span-6">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Item Type
                  </label>
                  <select
                    value={accessoryType}
                    onChange={(e) => setAccessoryType(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    {STANDARD_ACCESSORY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-12 sm:col-span-6">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Size / Volume / Specification
                  </label>
                  <Input
                    type="text"
                    value={sizeVolume}
                    onChange={(e) => setSizeVolume(e.target.value)}
                    className="h-8 border-slate-200 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Pricing & GST Tax Row */}
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between pb-0.5">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                <DollarSign className="h-3.5 w-3.5 text-[#2563eb]" />
                <span>Pricing &amp; GST Details</span>
              </div>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                GST Auto-Split 50/50
              </span>
            </div>

            <div className="grid grid-cols-12 gap-2.5 items-center">
              {/* HSN Code */}
              <div className="col-span-6 sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  HSN Code
                </label>
                <Input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  className="h-8 border-slate-200 text-xs font-mono bg-white"
                />
              </div>

              {/* GST % */}
              <div className="col-span-6 sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">
                  GST %
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={gstPercent}
                  onChange={(e) => handleGstChange(parseFloat(e.target.value))}
                  className="h-8 border-blue-200 bg-blue-50/60 text-xs font-bold text-blue-700"
                />
              </div>

              {/* Purchase Cost Rs */}
              <div className="col-span-6 sm:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Purchase Cost (₹) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={purchaseRs || ""}
                  onChange={(e) =>
                    setPurchaseRs(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  className="h-8 border-slate-200 text-xs font-bold bg-white"
                />
              </div>

              {/* Quantity */}
              <div className="col-span-6 sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Qty
                </label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="h-8 border-slate-200 text-xs font-bold bg-white"
                />
              </div>

              {/* Retail Price MRP */}
              <div className="col-span-12 sm:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Retail MRP (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={retailPrice || ""}
                  onChange={(e) =>
                    setRetailPrice(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  className="h-8 border-slate-200 text-xs font-bold bg-white"
                />
              </div>
            </div>
          </div>
        </form>

        {/* 4. FIXED BOTTOM FOOTER - FINANCIAL SUMMARY + ACTION BUTTONS - ALWAYS 100% VISIBLE */}
        <div className="py-3 px-4 sm:px-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 select-none">
          {/* Live Financial Summary Chips */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Basic Total
              </span>
              <span className="font-bold text-slate-800 text-xs">
                ₹{basicPrice.toFixed(2)}
              </span>
            </div>

            <div className="bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/80 shadow-2xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-500 block">
                GST ({gstPercent}%)
              </span>
              <span className="font-bold text-blue-700 text-xs">
                ₹{gstAmountRs.toFixed(2)}
              </span>
            </div>

            <div className="bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 shadow-2xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 block">
                Total Inward Cost
              </span>
              <span className="font-black text-emerald-700 text-xs">
                ₹{totalPurchase.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="h-8.5 px-3.5 font-bold rounded-xl text-xs border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="submit"
              form="purchase-product-modal-form"
              disabled={isSubmitting || isCodeDuplicate}
              className="h-8.5 px-5 font-bold rounded-xl text-xs bg-[#2563eb] hover:bg-blue-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Apply Product Details</span>
                </>
              )}
            </Button>
          </div>
        </div>

      </div>

      {/* 5. LENS POWER MATRIX OVERLAY MODAL */}
      {isPowerMatrixOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-[96vw] max-w-5xl h-[92vh] max-h-[760px] flex flex-col overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="py-2.5 px-4 sm:px-5 bg-[#2563eb] text-white flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2.5">
                <div className="p-1 rounded-lg bg-white/10 backdrop-blur-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                    Lens Power SPH / CYL Matrix
                  </h3>
                  <p className="text-[10px] text-blue-100 font-medium">
                    Enter quantity per sphere/cylinder cell — total pieces will sync directly to this purchase item.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPowerMatrixOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Matrix"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Matrix Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-50/40">
              <LensPowerMatrix
                initialStockPower={stockPower}
                onQuantitySync={(total) => {
                  if (total > 0) setQuantity(total);
                }}
                onMatrixChange={({ totalQuantity, powerSummary }) => {
                  if (powerSummary) {
                    setStockPower(powerSummary);
                  }
                  if (totalQuantity > 0) {
                    setQuantity(totalQuantity);
                  }
                }}
              />
            </div>

            {/* Footer */}
            <div className="py-2.5 px-4 sm:px-5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 select-none">
              <span className="text-xs text-slate-500 font-medium">
                Current Quantity: <strong className="text-slate-900 font-bold">{quantity} pcs</strong>
              </span>
              <Button
                type="button"
                onClick={() => setIsPowerMatrixOpen(false)}
                className="h-8.5 px-5 bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Done &amp; Apply to Purchase
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
