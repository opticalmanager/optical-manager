"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createShopAction } from "@/actions/shop.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function OnboardingForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    const result = await createShopAction(prevState, formData);
    if (result.success) {
      router.push("/owner/dashboard");
    }
    return result;
  }, null);

  return (
    <Card className="w-full max-w-2xl mx-auto mt-12 shadow-lg border-border">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-3xl mb-4">
          🏪
        </div>
        <CardTitle className="text-3xl font-bold text-primary">Welcome to Optical Manager!</CardTitle>
        <CardDescription className="text-base mt-2">
          Let&apos;s get started by creating your first shop. You can add more shops later from the dashboard.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-semibold text-text-main">Shop Name</label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., Main Branch - MG Road"
              required
            />
            {state?.errors?.name && (
              <p className="text-xs text-danger font-semibold">{state.errors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-semibold text-text-main">Address</label>
            <textarea
              id="address"
              name="address"
              placeholder="Shop address..."
              rows={3}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
            {state?.errors?.address && (
              <p className="text-xs text-danger font-semibold">{state.errors.address[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-semibold text-text-main">Phone</label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+91 98765 43210"
              />
              {state?.errors?.phone && (
                <p className="text-xs text-danger font-semibold">{state.errors.phone[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-text-main">Email</label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="shop@example.com"
              />
              {state?.errors?.email && (
                <p className="text-xs text-danger font-semibold">{state.errors.email[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="gstNumber" className="text-sm font-semibold text-text-main">GST Number (optional)</label>
            <Input
              id="gstNumber"
              name="gstNumber"
              type="text"
              placeholder="22AAAAA0000A1Z5"
            />
            {state?.errors?.gstNumber && (
              <p className="text-xs text-danger font-semibold">{state.errors.gstNumber[0]}</p>
            )}
          </div>

          {state?.message && !state?.success && (
            <div className="p-3 bg-danger/10 text-danger text-sm font-bold rounded border border-danger/20 text-center">
              {state.message}
            </div>
          )}

          <Button type="submit" className="w-full font-bold shadow-sm" disabled={isPending}>
            {isPending ? "Creating Shop..." : "Create Shop & Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
