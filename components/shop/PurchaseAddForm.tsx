"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Building2,
  Plus,
  Trash2,
  Package,
  FileText,
  Save,
  CheckCircle2,
  Loader2,
  Search,
  Sparkles,
  HelpCircle,
  Tag,
  AlertCircle,
  Check,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Vendor, InventoryItem } from "@/types";
import { CategoryItem } from "@/services/category.service";
import { PurchaseVendorCombobox } from "@/components/shop/PurchaseVendorCombobox";
import { PurchaseAddProductModal } from "@/components/shop/PurchaseAddProductModal";
import {
  createPurchaseAction,
  savePurchaseDraftAction,
} from "@/actions/purchase.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BillScanDrawer } from "@/components/shop/BillScanDrawer";
import type { ExtractedBillData } from "@/types/bill-scan";
import { handleEnterKeyNavigation } from "@/utils/form-navigation";

export interface PurchaseTableRow {
  id: string; // temporary row key
  inventoryId: string | null;
  productName: string;
  productCode: string;
  category: string;
  details: string;
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
  quantity: number | "";
  totalPurchasePrice: number;
  retailPrice: number;

  // Extended product specs so when modal is opened again, everything is preserved
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

  allowNegativeInventory?: boolean;

  // Autocomplete UI state
  searchQuery?: string;
  suggestions: InventoryItem[];
  isSearching: boolean;
  showSuggestions: boolean;
  showAddBadge: boolean;
}

interface PurchaseAddFormProps {
  categories: CategoryItem[];
  vendors: Vendor[];
  shopId: string;
}

export function PurchaseAddForm({
  categories,
  vendors,
  shopId,
}: PurchaseAddFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Top header fields (SS1 layout)
  const [purchaseDate, setPurchaseDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [taxRule, setTaxRule] = useState<"EXCLUDE" | "INCLUDE">("EXCLUDE");
  const [taxType, setTaxType] = useState<string>("SGST_CGST");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState<string>("");
  const [purchaseNumber, setPurchaseNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [roundOff, setRoundOff] = useState<number>(0);

  // Modal State for adding new product inline (SS3)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [modalTargetRowIndex, setModalTargetRowIndex] = useState<number | null>(
    null
  );
  const [modalInitialCode, setModalInitialCode] = useState<string>("");

  // AI Bill Scanner Drawer State
  const [isScanDrawerOpen, setIsScanDrawerOpen] = useState(false);
  const [aiExtractedBanner, setAiExtractedBanner] = useState<{
    vendor: string;
    count: number;
  } | null>(null);

  // Table Rows (SS2 columns)
  const [rows, setRows] = useState<PurchaseTableRow[]>([
    createEmptyRow(1),
    createEmptyRow(2),
    createEmptyRow(3),
  ]);

  function createEmptyRow(serial: number): PurchaseTableRow {
    // Default to first category GST rates
    const defaultCat = categories[0];
    const igst = defaultCat ? parseFloat(defaultCat.igstPercent) || 12 : 12;
    const half = Number((igst / 2).toFixed(2));

    return {
      id: crypto.randomUUID(),
      inventoryId: null,
      productName: "",
      productCode: "",
      category: defaultCat?.code || "FRAME",
      details: "",
      unitPrice: 0,
      basePrice: 0,
      hsnCode: defaultCat?.hsnCode || "90049000",
      gstPercent: igst,
      cgstPercent: half,
      cgstAmount: 0,
      sgstPercent: half,
      sgstAmount: 0,
      igstPercent: igst,
      igstAmount: 0,
      purchasePrice: 0,
      quantity: "", // blank initially as requested
      totalPurchasePrice: 0,
      retailPrice: 0,
      suggestions: [],
      isSearching: false,
      showSuggestions: false,
      showAddBadge: false,
    };
  }

  // Row recalculation helper with bidirectional Base Price <-> Purchase Cost math
  const recalculateRow = (
    row: PurchaseTableRow,
    updates: Partial<PurchaseTableRow>
  ): PurchaseTableRow => {
    const merged = { ...row, ...updates };

    const qty =
      merged.quantity === "" || isNaN(Number(merged.quantity))
        ? 0
        : Number(merged.quantity);
    const gstPct = isNaN(merged.gstPercent) ? 0 : Math.max(0, merged.gstPercent);

    let unitPrice = isNaN(merged.unitPrice) ? 0 : Math.max(0, merged.unitPrice);
    let purchasePrice = isNaN(merged.purchasePrice)
      ? 0
      : Math.max(0, merged.purchasePrice);

    // If purchasePrice was directly updated without unitPrice, back-calculate unitPrice (Base Price)
    if (updates.purchasePrice !== undefined && updates.unitPrice === undefined) {
      unitPrice = Number((purchasePrice / (1 + gstPct / 100)).toFixed(2));
    } else {
      // Otherwise unitPrice drives purchasePrice
      purchasePrice = Number((unitPrice * (1 + gstPct / 100)).toFixed(2));
    }

    // GST split: CGST = GST/2, SGST = GST/2, IGST = GST
    const half = Number((gstPct / 2).toFixed(2));
    const cgstPct = updates.cgstPercent !== undefined ? updates.cgstPercent : half;
    const sgstPct = updates.sgstPercent !== undefined ? updates.sgstPercent : half;
    const igstPct = updates.igstPercent !== undefined ? updates.igstPercent : gstPct;

    // Base Price Total = Qty × Unit Base Price
    const basePrice = Number((qty * unitPrice).toFixed(2));

    // GST Amounts
    const cgstAmount = Number((basePrice * (cgstPct / 100)).toFixed(2));
    const sgstAmount = Number((basePrice * (sgstPct / 100)).toFixed(2));
    const igstAmount = Number((basePrice * (igstPct / 100)).toFixed(2));

    // Total Purchase Cost = purchasePrice × qty
    const totalPurchasePrice = Number((purchasePrice * qty).toFixed(2));

    return {
      ...merged,
      unitPrice,
      basePrice,
      gstPercent: gstPct,
      cgstPercent: cgstPct,
      cgstAmount,
      sgstPercent: sgstPct,
      sgstAmount,
      igstPercent: igstPct,
      igstAmount,
      purchasePrice,
      totalPurchasePrice,
    };
  };

  // Update specific row
  const updateRow = (index: number, updates: Partial<PurchaseTableRow>) => {
    setRows((prev) => {
      const copy = [...prev];
      if (!copy[index]) return prev;
      copy[index] = recalculateRow(copy[index], updates);
      return copy;
    });
  };

  // Category switch handler: auto-populates category GST and HSN
  const handleCategoryChange = (index: number, newCatCode: string) => {
    const matched = categories.find(
      (c) => c.code.toUpperCase() === newCatCode.toUpperCase()
    );
    const igst = matched ? parseFloat(matched.igstPercent) || 12 : 12;
    const half = Number((igst / 2).toFixed(2));
    const hsn = matched?.hsnCode || "";

    updateRow(index, {
      category: newCatCode,
      hsnCode: hsn || rows[index]?.hsnCode || "",
      gstPercent: igst,
      cgstPercent: half,
      sgstPercent: half,
      igstPercent: igst,
    });
  };

  // Enter-key keyboard navigation between table cells
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      // Column sequence:
      // 0: productCode
      // 1: category
      // 2: unitPrice (Base Price)
      // 3: hsnCode
      // 4: gstPercent
      // 5: purchasePrice (Purchase Cost)
      // 6: quantity
      // 7: retailPrice (MRP)

      const nextCol = colIndex + 1;
      if (nextCol <= 7) {
        const nextElem = document.querySelector<HTMLElement>(
          `[data-row="${rowIndex}"][data-col="${nextCol}"]`
        );
        if (nextElem) {
          nextElem.focus();
          if (nextElem instanceof HTMLInputElement) {
            nextElem.select();
          }
        }
      } else {
        // At the end of the row (col 7): move to first cell of next row
        const nextRow = rowIndex + 1;
        if (nextRow < rows.length) {
          const nextElem = document.querySelector<HTMLElement>(
            `[data-row="${nextRow}"][data-col="0"]`
          );
          if (nextElem) {
            nextElem.focus();
            if (nextElem instanceof HTMLInputElement) {
              nextElem.select();
            }
          }
        } else {
          // At the last row and last cell -> add new row and focus its product code!
          handleAddRow();
          setTimeout(() => {
            const newElem = document.querySelector<HTMLElement>(
              `[data-row="${nextRow}"][data-col="0"]`
            );
            if (newElem) {
              newElem.focus();
              if (newElem instanceof HTMLInputElement) {
                newElem.select();
              }
            }
          }, 60);
        }
      }
    }
  };

  // Add new row
  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow(prev.length + 1)]);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        return [createEmptyRow(1)];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Autocomplete code typing logic
  const handleCodeChange = (index: number, code: string) => {
    const cleanCode = code.toUpperCase();
    updateRow(index, {
      productCode: cleanCode,
      showSuggestions: Boolean(cleanCode.trim()),
      showAddBadge: false,
    });

    if (!cleanCode.trim()) {
      updateRow(index, {
        suggestions: [],
        isSearching: false,
        showSuggestions: false,
        showAddBadge: false,
      });
      return;
    }

    // Debounced search
    updateRow(index, { isSearching: true });
  };

  // Run autocomplete search effect when rows change (scoped to selected vendor)
  useEffect(() => {
    const searchTimers: NodeJS.Timeout[] = [];

    rows.forEach((row, idx) => {
      if (row.isSearching && row.productCode.trim()) {
        const query = row.productCode.trim();
        const timer = setTimeout(async () => {
          try {
            const vendorParam = vendorName ? `&vendor=${encodeURIComponent(vendorName)}` : "";
            const res = await fetch(
              `/api/inventory/search?q=${encodeURIComponent(query)}${vendorParam}`
            );
            if (res.ok) {
              const items: InventoryItem[] = await res.json();
              setRows((prev) => {
                const next = [...prev];
                if (next[idx]) {
                  next[idx] = {
                    ...next[idx],
                    suggestions: items,
                    isSearching: false,
                    showSuggestions: true,
                    // If no items found, show "{+ Add Product}" badge in Details
                    showAddBadge: items.length === 0,
                  };
                }
                return next;
              });
            }
          } catch (e) {
            console.error("Autocomplete search error:", e);
            setRows((prev) => {
              const next = [...prev];
              if (next[idx]) {
                next[idx] = {
                  ...next[idx],
                  isSearching: false,
                  showAddBadge: true,
                };
              }
              return next;
            });
          }
        }, 300);

        searchTimers.push(timer);
      }
    });

    return () => {
      searchTimers.forEach((t) => clearTimeout(t));
    };
  }, [rows, vendorName]);

  // Click on suggested product -> fill row details (quantity stays blank, all fields editable)
  const handleSelectSuggestion = (index: number, item: any) => {
    const matchedCategory = categories.find(
      (c) => c.code.toUpperCase() === item.category?.toUpperCase()
    );

    const igst = item.igstPercent
      ? parseFloat(item.igstPercent)
      : matchedCategory
      ? parseFloat(matchedCategory.igstPercent)
      : 12;
    const half = Number((igst / 2).toFixed(2));
    const cost = item.costPrice ? parseFloat(item.costPrice) : 0;
    const price = item.price ? parseFloat(item.price) : 0;

    const detailsStr = [item.brand, item.model, item.category]
      .filter(Boolean)
      .join(" | ");

    setRows((prev) => {
      const copy = [...prev];
      if (!copy[index]) return prev;

      copy[index] = recalculateRow(copy[index], {
        inventoryId: item.id,
        productName: item.productName || item.name,
        productCode: item.productCode || item.sku || "",
        category: item.category,
        brand: item.brand || "",
        model: item.model || "",
        gender: item.gender || "Unisex",
        color: item.color || "",
        size: item.size || "",
        type: item.type || item.model || "Full Rim",
        material: item.material || "Acetate",
        frameShape: item.frameShape || "Rectangle",
        modelNumber: item.modelNumber || item.model || "",
        rackLocation: item.rackLocation || "",
        details: detailsStr,
        unitPrice: cost,
        hsnCode: item.hsnCode || matchedCategory?.hsnCode || "",
        gstPercent: igst,
        cgstPercent: item.cgstPercent ? parseFloat(item.cgstPercent) : half,
        sgstPercent: item.sgstPercent ? parseFloat(item.sgstPercent) : half,
        igstPercent: igst,
        retailPrice: price,
        quantity: "", // explicitly blank for user entry
        showSuggestions: false,
        showAddBadge: false,
      });

      return copy;
    });
  };

  // Open inline modal when user clicks Details or "{+ Add Product}"
  const handleOpenAddProductModal = (rowIndex: number) => {
    setModalTargetRowIndex(rowIndex);
    setModalInitialCode(rows[rowIndex]?.productCode || "");
    setIsProductModalOpen(true);
  };

  // Handle product added or updated from inline modal
  const handleProductAddedFromModal = (product: any) => {
    if (modalTargetRowIndex !== null && rows[modalTargetRowIndex]) {
      setRows((prev) => {
        const copy = [...prev];
        copy[modalTargetRowIndex] = recalculateRow(copy[modalTargetRowIndex], {
          inventoryId: product.inventoryId,
          productName: product.productName,
          productCode: product.productCode,
          category: product.category,
          brand: product.brand || "",
          model: product.model || "",
          gender: product.gender || "Unisex",
          color: product.color || "",
          size: product.size || "",
          type: product.type || "Full Rim",
          material: product.material || "Acetate",
          frameShape: product.frameShape,
          modelNumber: product.modelNumber,
          rackLocation: product.rackLocation,
          design: product.design,
          refractiveIndex: product.refractiveIndex,
          lensMaterial: product.lensMaterial,
          blankDiameter: product.blankDiameter,
          stockPower: product.stockPower,
          isUncoated: product.isUncoated,
          isAntiReflective: product.isAntiReflective,
          isBlueControl: product.isBlueControl,
          isTinted: product.isTinted,
          isPolarized: product.isPolarized,
          isHardCoat: product.isHardCoat,
          isPhotochromic: product.isPhotochromic,
          modality: product.modality,
          boxQuantity: product.boxQuantity,
          baseCurve: product.baseCurve,
          diameter: product.diameter,
          contactColor: product.contactColor,
          sphere: product.sphere,
          cylinder: product.cylinder,
          axis: product.axis,
          addPower: product.addPower,
          accessoryType: product.accessoryType,
          sizeVolume: product.sizeVolume,
          colorPattern: product.colorPattern,
          requiresExpiryTracking: product.requiresExpiryTracking,
          batchNumber: product.batchNumber,
          expiryDate: product.expiryDate,
          details: product.details,
          unitPrice: product.unitPrice,
          hsnCode: product.hsnCode,
          gstPercent: product.gstPercent,
          cgstPercent: product.cgstPercent,
          sgstPercent: product.sgstPercent,
          igstPercent: product.igstPercent,
          quantity: product.quantity || "",
          retailPrice: product.retailPrice,
          allowNegativeInventory: product.allowNegativeInventory,
          showSuggestions: false,
          showAddBadge: false,
        });
        return copy;
      });
    }
  };

  // Handler to apply AI extracted bill data into the form
  const handleApplyExtractedBill = (data: ExtractedBillData) => {
    // 1. Auto-select or set vendor
    if (data.matchedVendorId) {
      setSelectedVendorId(data.matchedVendorId);
      setVendorName(data.vendorName || "");
    } else if (data.vendorName) {
      setSelectedVendorId(null);
      setVendorName(data.vendorName);
    }

    // 2. Invoice number & date
    if (data.invoiceNumber) {
      setPurchaseNumber(data.invoiceNumber);
    }
    if (data.invoiceDate) {
      setPurchaseDate(data.invoiceDate);
    }

    // 3. Tax type
    if (data.taxType) {
      setTaxType(data.taxType);
    }

    // 4. Populate table rows with extracted line items
    if (data.items && data.items.length > 0) {
      const newRows: PurchaseTableRow[] = data.items.map((item) => {
        const matchedCat = categories.find((c) => c.code === item.category);
        const hsn = item.hsnCode || matchedCat?.hsnCode || "90049000";

        const baseRow: PurchaseTableRow = {
          id: crypto.randomUUID(),
          inventoryId: null,
          productName: item.productName,
          productCode: item.productCode || "",
          category: item.category,
          details: item.brand
            ? `${item.brand} ${item.model || ""}`.trim()
            : "",
          unitPrice: item.unitPrice,
          basePrice: item.unitPrice,
          hsnCode: hsn,
          gstPercent: item.gstPercent,
          cgstPercent: item.cgstPercent,
          cgstAmount: item.cgstAmount,
          sgstPercent: item.sgstPercent,
          sgstAmount: item.sgstAmount,
          igstPercent: item.igstPercent,
          igstAmount: item.igstAmount,
          purchasePrice: item.purchasePrice,
          quantity: item.quantity,
          totalPurchasePrice: item.totalPurchasePrice,
          retailPrice: item.retailPrice,

          // Extended specs for the modal
          brand: item.brand,
          model: item.model,
          color: item.color,
          size: item.size,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          requiresExpiryTracking: item.requiresExpiryTracking,

          suggestions: [],
          isSearching: false,
          showSuggestions: false,
          showAddBadge: false,
        };

        return recalculateRow(baseRow, {
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          basePrice: item.unitPrice,
        });
      });

      setRows(newRows);
      setAiExtractedBanner({
        vendor: data.vendorName || "vendor",
        count: data.items.length,
      });
      toast.success(
        `Imported ${data.items.length} items from ${data.vendorName || "bill"} into form!`
      );
    }
  };

  // Summary Calculations (SS1 bottom right card)
  let totalQuantity = 0;
  let totalUnitAmount = 0;
  let totalBasePrice = 0;
  let totalGstAmount = 0;
  let totalPurchase = 0;

  rows.forEach((r) => {
    const q = typeof r.quantity === "number" ? r.quantity : 0;
    totalQuantity += q;
    totalUnitAmount += r.unitPrice;
    totalBasePrice += r.basePrice;
    totalGstAmount +=
      taxType === "IGST" ? r.igstAmount : r.cgstAmount + r.sgstAmount;
    totalPurchase += r.totalPurchasePrice;
  });

  const totalNetPurchase = Number((totalPurchase + (roundOff || 0)).toFixed(2));

  // Vendor selection handler
  const handleSelectVendor = (vendor: Vendor | null) => {
    if (vendor) {
      setSelectedVendorId(vendor.id);
      setVendorName(vendor.name);
      // Auto-set Tax Type based on GSTIN state code if available
      if (vendor.gstin && vendor.gstin.length >= 2) {
        setTaxType("SGST_CGST"); // standard default
      }
    } else {
      setSelectedVendorId(null);
      setVendorName("");
    }
  };

  // Prepare submission payload
  const buildPayload = (status: "DRAFT" | "COMPLETED") => {
    // Filter out completely blank rows
    const validItems = rows.filter(
      (r) => r.productName.trim() || r.productCode.trim() || r.unitPrice > 0
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one valid product item.");
      return null;
    }

    if (!purchaseNumber.trim()) {
      toast.error("Purchase bill number is required.");
      return null;
    }

    if (!vendorName.trim()) {
      toast.error("Please select or specify a supplier/vendor name.");
      return null;
    }

    // For completed purchases, ensure every item has quantity >= 1
    if (status === "COMPLETED") {
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const q = typeof item.quantity === "number" ? item.quantity : 0;
        if (q <= 0) {
          toast.error(
            `Row #${i + 1} (${item.productName || item.productCode || "Item"}): Quantity must be at least 1.`
          );
          return null;
        }
      }
    }

    return {
      purchaseDate,
      vendorId: selectedVendorId,
      vendorName: vendorName.trim(),
      purchaseNumber: purchaseNumber.trim(),
      taxRule,
      taxType,
      roundOff: roundOff || 0,
      notes,
      status,
      items: validItems.map((r, i) => ({
        inventoryId: r.inventoryId,
        serialNumber: i + 1,
        productName: r.productName || r.productCode || `Item #${i + 1}`,
        productCode: r.productCode,
        category: r.category,
        details: r.details,
        unitPrice: r.unitPrice,
        basePrice: r.basePrice,
        hsnCode: r.hsnCode,
        gstPercent: r.gstPercent,
        cgstPercent: r.cgstPercent,
        cgstAmount: r.cgstAmount,
        sgstPercent: r.sgstPercent,
        sgstAmount: r.sgstAmount,
        igstPercent: r.igstPercent,
        igstAmount: r.igstAmount,
        purchasePrice: r.purchasePrice,
        quantity: typeof r.quantity === "number" && r.quantity > 0 ? r.quantity : 1,
        totalPurchasePrice: r.totalPurchasePrice,
        retailPrice: r.retailPrice,
      })),
    };
  };

  // Submit Handler: Add Purchase (Completed)
  const handleAddPurchase = () => {
    const payload = buildPayload("COMPLETED");
    if (!payload) return;

    startTransition(async () => {
      try {
        const res = await createPurchaseAction(payload as any);
        if (res.success) {
          toast.success(res.message);
          router.push("/shop/purchases");
        } else {
          toast.error(res.message);
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to record purchase.");
      }
    });
  };

  // Submit Handler: Save As Draft
  const handleSaveDraft = () => {
    const payload = buildPayload("DRAFT");
    if (!payload) return;

    startTransition(async () => {
      try {
        const res = await savePurchaseDraftAction(payload as any);
        if (res.success) {
          toast.success(res.message);
          router.push("/shop/purchases");
        } else {
          toast.error(res.message);
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to save draft.");
      }
    });
  };

  return (
    <div
      onKeyDown={(e) => handleEnterKeyNavigation(e)}
      className="space-y-4 pb-12 select-none text-slate-800 max-w-[1440px] mx-auto"
    >
      {/* Top Header Card (SS1 style) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/shop/purchases"
            className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
            title="Back to Purchases"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563eb] shadow-2xs">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Add Purchase
              </h1>
              <p className="text-xs font-semibold text-slate-400">
                Record new stock purchase details &amp; inward supplier bills
              </p>
            </div>
          </div>
        </div>

        {/* Top Right Actions: AI Bill Scanner & Date Box */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setIsScanDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Scan Bill with AI</span>
          </button>

          {/* Date Box Top Right */}
          <div className="flex items-center gap-2 bg-blue-50/50 border border-blue-100 rounded-xl px-3 py-1.5 shadow-2xs">
            <Calendar className="h-4 w-4 text-[#2563eb]" />
            <div className="text-left">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Date
              </span>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Extraction Banner */}
      {aiExtractedBanner && (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-xs text-blue-900 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              <strong>AI Auto-Fill Active:</strong> Populated {aiExtractedBanner.count} items from <strong>{aiExtractedBanner.vendor}</strong>'s bill. Review quantities and rates before finalizing.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAiExtractedBanner(null)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 ml-3 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Configuration Bar (SS1: Tax Rule, Tax Type, Supplier Name, Purchase Bill Number) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* # Tax Rule */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              # Tax Rule
            </label>
            <select
              value={taxRule}
              onChange={(e) => setTaxRule(e.target.value as any)}
              className="w-full h-10 px-3 bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-[#2563eb]/20 focus:outline-hidden transition-all shadow-2xs cursor-pointer"
            >
              <option value="EXCLUDE">Exclude</option>
              <option value="INCLUDE">Include</option>
            </select>
          </div>

          {/* Tax Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Tax Type
            </label>
            <select
              value={taxType}
              onChange={(e) => setTaxType(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-[#2563eb]/20 focus:outline-hidden transition-all shadow-2xs cursor-pointer"
            >
              <option value="SGST_CGST">SGST/CGST (Intra-State)</option>
              <option value="IGST">IGST (Inter-State)</option>
            </select>
          </div>

          {/* Vendor Name (Searchable Combobox with + Add Vendor) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Vendor Name <span className="text-rose-500">*</span>
            </label>
            <PurchaseVendorCombobox
              vendors={vendors}
              selectedVendorId={selectedVendorId}
              selectedVendorName={vendorName}
              onSelectVendor={handleSelectVendor}
            />
          </div>

          {/* Purchase Bill Number */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Purchase Bill Number <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={purchaseNumber}
              onChange={(e) => setPurchaseNumber(e.target.value)}
              className="h-10 border-slate-200/90 text-xs font-bold text-slate-800 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Main Items Table (Zero-gap spreadsheet-style grid layout - fit to screen) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200 select-none">
              <tr>
                <th className="py-2 px-1 w-[3%] text-center border-r border-slate-200">#</th>
                <th className="py-2 px-1.5 w-[13%] border-r border-slate-200">Product Code</th>
                <th className="py-2 px-1.5 w-[10%] border-r border-slate-200">Category</th>
                <th className="py-2 px-1.5 w-[13%] border-r border-slate-200 text-left">Details</th>
                <th className="py-2 px-1.5 w-[8%] text-right border-r border-slate-200">Base Price</th>
                <th className="py-2 px-1 w-[6%] text-center border-r border-slate-200">HSN</th>
                <th className="py-2 px-1 w-[5%] text-center border-r border-slate-200">GST %</th>
                <th className="py-2 px-1.5 w-[9%] text-right border-r border-slate-200">Purchase Cost</th>
                <th className="py-2 px-1 w-[6%] text-center border-r border-slate-200">Qty</th>
                <th className="py-2 px-1.5 w-[11%] text-right border-r border-slate-200">Total Cost</th>
                <th className="py-2 px-1.5 w-[12%] text-right border-r border-slate-200">Retail MRP</th>
                <th className="py-2 px-1 w-[4%] text-center">Act</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isDetailsAvailable = Boolean(
                  row.inventoryId || row.details || (row.productName && !row.showAddBadge)
                );

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-blue-50/20 transition-colors group"
                  >
                    {/* 1. # Serial Number */}
                    <td className="p-0 border-b border-r border-slate-200 text-center font-bold text-slate-400 text-xs bg-slate-50/40">
                      <div className="h-8.5 flex items-center justify-center">
                        {index + 1}
                      </div>
                    </td>

                    {/* 2. Product Code with Autocomplete (Col 0) */}
                    <td className="p-0 border-b border-r border-slate-200 relative">
                      <div className="relative h-8.5 flex items-center">
                        <input
                          type="text"
                          data-row={index}
                          data-col={0}
                          value={row.productCode}
                          onChange={(e) => handleCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 0)}
                          onFocus={() => {
                            if (row.productCode.trim()) {
                              updateRow(index, { showSuggestions: true });
                            }
                          }}
                          className="w-full h-8.5 px-2 text-xs font-mono font-bold border-0 bg-transparent uppercase pr-5 focus:bg-blue-50/30 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#2563eb]"
                        />
                        {row.isSearching && (
                          <Loader2 className="h-3 w-3 animate-spin text-slate-400 absolute right-1.5 top-2.5 pointer-events-none" />
                        )}
                      </div>

                      {/* Autocomplete Suggestions Dropdown */}
                      {row.showSuggestions && row.suggestions.length > 0 && (
                        <div className="absolute z-40 left-0 right-0 top-8.5 bg-white rounded-b-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-50 min-w-[240px]">
                          <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Suggested Catalog Items
                          </div>
                          <div className="max-h-48 overflow-y-auto p-1">
                            {row.suggestions.map((sug) => (
                              <button
                                key={sug.id}
                                type="button"
                                onClick={() => handleSelectSuggestion(index, sug)}
                                className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-blue-50 text-slate-700 transition-colors flex items-center justify-between cursor-pointer group"
                              >
                                <div className="truncate pr-2">
                                  <div className="font-bold text-xs text-slate-800 group-hover:text-[#2563eb] truncate">
                                    {sug.productName || sug.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                                    <span>Code: {sug.productCode || sug.sku}</span>
                                    {sug.brand && <span>Brand: {sug.brand}</span>}
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                                  ₹{sug.costPrice || "0.00"}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 3. Product Category (Col 1) */}
                    <td className="p-0 border-b border-r border-slate-200">
                      <select
                        data-row={index}
                        data-col={1}
                        value={row.category}
                        onChange={(e) => handleCategoryChange(index, e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, index, 1)}
                        className="w-full h-8.5 px-1.5 text-xs font-semibold text-slate-700 border-0 bg-transparent focus:bg-blue-50/30 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#2563eb] cursor-pointer"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id || cat.code} value={cat.code}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 4. Item Name / Details (Interactive Modal Trigger Button) */}
                    <td className="p-1 border-b border-r border-slate-200">
                      {isDetailsAvailable ? (
                        <button
                          type="button"
                          onClick={() => handleOpenAddProductModal(index)}
                          title={row.details ? `Specs: ${row.details}` : (row.productName || "Click to view/edit product specifications")}
                          className="w-full h-7 px-2 rounded-md bg-white hover:bg-[#F9FAFB] text-[#374151] border border-[#D1D5DB] font-semibold text-[11px] flex items-center justify-between gap-1.5 cursor-pointer transition-all shadow-2xs group text-left"
                        >
                          <span className="truncate font-bold text-[#111827] text-xs flex-1">
                            {row.productName || row.details || "Item"}
                          </span>
                          <span className="text-[9px] bg-[#ECFDF5] text-[#059669] border border-emerald-200 px-1.5 py-0.5 rounded font-bold shrink-0 flex items-center gap-0.5 shadow-2xs transition-colors">
                            <Eye className="h-2.5 w-2.5" />
                            <span>View</span>
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenAddProductModal(index)}
                          className="w-full h-7 px-1.5 rounded-md bg-white hover:bg-[#F9FAFB] text-[#374151] border border-[#D1D5DB] font-semibold text-[10px] flex items-center justify-center gap-0.5 cursor-pointer transition-all shadow-2xs group"
                        >
                          <Plus className="h-2.5 w-2.5 text-[#6B7280]" />
                          <span>+ Details</span>
                        </button>
                      )}
                    </td>

                    {/* 5. Base Price (Col 2) */}
                    <td className="p-0 border-b border-r border-slate-200 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        data-row={index}
                        data-col={2}
                        value={row.unitPrice || ""}
                        onChange={(e) =>
                          updateRow(index, {
                            unitPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        onKeyDown={(e) => handleCellKeyDown(e, index, 2)}
                        className="w-full h-8.5 px-1.5 text-xs font-bold text-right border-0 bg-transparent focus:bg-blue-50/30 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#2563eb]"
                      />
                    </td>

                    {/* 6. HSN Code (Col 3) */}
                    <td className="p-0 border-b border-r border-slate-200 text-center">
                      <input
                        type="text"
                        data-row={index}
                        data-col={3}
                        value={row.hsnCode}
                        onChange={(e) => updateRow(index, { hsnCode: e.target.value })}
                        onKeyDown={(e) => handleCellKeyDown(e, index, 3)}
                        className="w-full h-8.5 px-1 text-xs text-center font-mono border-0 bg-transparent focus:bg-blue-50/30 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#2563eb]"
                      />
                    </td>

                    {/* 7. GST % (Col 4) */}
                    <td className="p-0 border-b border-r border-slate-200 text-center">
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={100}
                        data-row={index}
                        data-col={4}
                        value={row.gstPercent}
                        onChange={(e) =>
                          updateRow(index, {
                            gstPercent: parseFloat(e.target.value) || 0,
                          })
                        }
                        onKeyDown={(e) => handleCellKeyDown(e, index, 4)}
                        className="w-full h-8.5 px-1 text-xs text-center font-bold text-blue-700 bg-blue-50/20 border-0 focus:bg-blue-50/40 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#2563eb]"
                      />
                    </td>

                    {/* 8. Purchase Cost (Col 5) */}
                    <td className="p-0 border-b border-r border-slate-200 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        data-row={index}
                        data-col={5}
                        value={row.purchasePrice || ""}
                        onChange={(e) =>
                          updateRow(index, {
                            purchasePrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        onKeyDown={(e) => handleCellKeyDown(e, index, 5)}
                        className="w-full h-8.5 px-1.5 text-xs font-bold text-right text-slate-800 border-0 bg-transparent focus:bg-blue-50/30 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#2563eb]"
                      />
                    </td>

                    {/* 9. Quantity (Col 6) */}
                    <td className="p-0 border-b border-r border-slate-200 text-center">
                      <input
                        type="number"
                        min={1}
                        data-row={index}
                        data-col={6}
                        value={row.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateRow(index, {
                            quantity: val === "" ? "" : Math.max(1, parseInt(val) || 1),
                          });
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, index, 6)}
                        className="w-full h-8.5 px-1 text-xs text-center font-extrabold text-slate-900 border-0 bg-transparent focus:bg-blue-50/30 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#2563eb]"
                      />
                    </td>

                    {/* 10. Total Purchase Cost */}
                    <td className="p-0 border-b border-r border-slate-200 text-right bg-slate-50/30 font-extrabold text-emerald-600 text-xs">
                      <div className="h-8.5 px-2 flex items-center justify-end">
                        ₹{row.totalPurchasePrice.toFixed(2)}
                      </div>
                    </td>

                    {/* 11. Retail Price (MRP) (Col 7) */}
                    <td className="p-0 border-b border-r border-slate-200 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        data-row={index}
                        data-col={7}
                        value={row.retailPrice || ""}
                        onChange={(e) =>
                          updateRow(index, {
                            retailPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        onKeyDown={(e) => handleCellKeyDown(e, index, 7)}
                        className="w-full h-8.5 px-1.5 text-xs font-bold text-right border-0 bg-transparent focus:bg-blue-50/30 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#2563eb]"
                      />
                    </td>

                    {/* 12. Action (Delete) */}
                    <td className="p-0 border-b border-slate-200 text-center">
                      <div className="h-8.5 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(index)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove Row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer: + Add Row & Summary Box */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Left: + Add Product Button */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddRow}
              className="h-9 px-4 rounded-xl border-dashed border-slate-300 bg-white hover:bg-slate-50 text-[#2563eb] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span> Add Product Row</span>
            </Button>

            {/* Helper notice */}
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 max-w-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span>
                Tip: Enter product code to autocomplete existing products, or click{" "}
                <strong className="text-slate-600">&#123;Add Product&#125;</strong> to
                register new stock inline.
              </span>
            </div>
          </div>

          {/* Right: Summary Box (SS1 layout) */}
          <div className="w-full lg:w-96 bg-blue-50/40 rounded-2xl border border-blue-100/80 p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">Total Quantity :</span>
              <span className="font-extrabold text-slate-900">{totalQuantity}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">Total Unit Amount :</span>
              <span className="font-semibold text-slate-800">
                ₹{totalUnitAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">Total Base Price :</span>
              <span className="font-semibold text-slate-800">
                ₹{totalBasePrice.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">Total GST Amount :</span>
              <span className="font-semibold text-blue-600">
                ₹{totalGstAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">Total Purchase :</span>
              <span className="font-extrabold text-slate-900">
                ₹{totalPurchase.toFixed(2)}
              </span>
            </div>

            {/* Round Off (+/-) Input */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-100">
              <span className="font-bold text-slate-600">Round Off (+/-) :</span>
              <Input
                type="number"
                step="0.01"
                value={roundOff || ""}
                onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)}
                className="w-28 h-7 text-right text-xs font-bold border-blue-200 bg-white"
              />
            </div>

            {/* Total Net Purchase Highlight */}
            <div className="flex items-center justify-between pt-2 border-t border-blue-200/80">
              <span className="text-sm font-black tracking-tight text-slate-900">
                Total Net Purchase :
              </span>
              <span className="text-lg font-black text-[#2563eb] tracking-tight">
                ₹{totalNetPurchase.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions Bar (SS1 style: Save As Draft & Add Purchase) */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={handleSaveDraft}
          className="h-10 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4 text-slate-500" />
          )}
          <span>Save As Draft</span>
        </Button>

        <Button
          type="button"
          data-enter-submit="true"
          disabled={isPending}
          onClick={handleAddPurchase}
          className="h-10 px-6 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>Add Purchase</span>
        </Button>
      </div>

      {/* Inline Product Modal (SS3 redesigned) */}
      <PurchaseAddProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setModalTargetRowIndex(null);
        }}
        categories={categories}
        initialData={modalTargetRowIndex !== null ? rows[modalTargetRowIndex] : null}
        initialProductCode={modalInitialCode}
        vendorName={vendorName}
        onProductAdded={handleProductAddedFromModal}
      />

      {/* AI Bill Scanner Drawer */}
      <BillScanDrawer
        isOpen={isScanDrawerOpen}
        onClose={() => setIsScanDrawerOpen(false)}
        onApply={handleApplyExtractedBill}
      />
    </div>
  );
}
