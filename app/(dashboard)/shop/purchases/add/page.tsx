import { redirect } from "next/navigation";

export default function PurchasesAddRedirect() {
  redirect("/shop/purchases/new");
}
