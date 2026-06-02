"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteInventoryItemAction } from "@/actions/inventory.actions";
import { toast } from "sonner";

interface DeleteInventoryButtonProps {
  itemId: string;
  itemName: string;
}

export function DeleteInventoryButton({
  itemId,
  itemName,
}: DeleteInventoryButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${itemName}" from stock? This will delete all its metadata and images.`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await deleteInventoryItemAction(itemId);
        if (res.success) {
          toast.success(`"${itemName}" deleted successfully.`);
        } else {
          toast.error(res.message || "Failed to delete item.");
        }
      } catch (err: any) {
        console.error("Delete error:", err);
        toast.error("An error occurred while deleting the item.");
      }
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
      title="Delete Item"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
