"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { OrgDetailsForm } from "@/components/onboarding/OrgDetailsForm";
import { ShopDetailsForm } from "@/components/onboarding/ShopDetailsForm";
import { updateOrganizationAction, createFirstShopAction } from "@/services/onboarding.service";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface OnboardingClientProps {
  userEmail: string;
  userFullName: string;
  defaultOrgName: string;
}

export default function OnboardingClient({ userEmail, userFullName, defaultOrgName }: OnboardingClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Forms state
  const [orgData, setOrgData] = useState({
    name: defaultOrgName,
    slug: "",
    email: userEmail,
    phone: "",
    address: "",
  });

  const [shopData, setShopData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // Step 1: Submit Organization Details
  const handleOrgSubmit = async (data: typeof orgData) => {
    setIsLoading(true);
    setOrgData(data); // save form data

    try {
      const response = await updateOrganizationAction({
        name: data.name,
        slug: data.slug,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
      });

      if (!response.success) {
        toast.error(response.error || "Failed to update organization details.");
        return;
      }

      toast.success("Organization details saved!");
      setStep(2);
    } catch (err: any) {
      console.error(err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit First Shop Details
  const handleShopSubmit = async (data: any) => {
    setIsLoading(true);
    setShopData({ name: data.name, email: data.email || "", phone: data.phone || "", address: data.address || "" }); // save form data

    try {
      const response = await createFirstShopAction({
        name: data.name,
        email: data.createCredentials ? data.email : "",
        phone: data.phone || undefined,
        address: data.address || undefined,
        managerPassword: data.createCredentials ? data.password : "",
      });

      if (!response.success) {
        toast.error(response.error || "Failed to configure your first shop.");
        return;
      }

      setIsSuccess(true);
      toast.success("Setup complete!");

      // Wait 1.5 seconds before redirecting
      setTimeout(() => {
        router.push("/owner");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 space-y-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-50 text-emerald-500 animate-bounce shadow-lg shadow-emerald-500/10 border border-emerald-300/30">
          <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            You&apos;re all set! 🎉
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Taking you to your dashboard...
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <OnboardingShell>
      {/* Steps Indicator */}
      <StepIndicator currentStep={step} />

      {/* Render Steps */}
      <div className="mt-8 transition-all duration-300">
        {step === 1 ? (
          <OrgDetailsForm
            initialData={orgData}
            onSubmit={handleOrgSubmit}
            isLoading={isLoading}
          />
        ) : (
          <ShopDetailsForm
            initialData={shopData}
            onSubmit={handleShopSubmit}
            onBack={() => setStep(1)}
            isLoading={isLoading}
          />
        )}
      </div>
    </OnboardingShell>
  );
}
