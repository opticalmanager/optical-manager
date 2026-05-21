"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, Link2, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { slugify } from "@/lib/utils";

// Define schema validation
const orgFormSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters."),
  slug: z.string()
    .min(2, "Slug must be at least 2 characters.")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  email: z.string().email("Invalid email address.").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits.").optional().or(z.literal("")),
  address: z.string().optional(),
});

type OrgFormValues = z.infer<typeof orgFormSchema>;

interface OrgDetailsFormProps {
  initialData: {
    name: string;
    slug: string;
    email: string;
    phone: string;
    address: string;
  };
  onSubmit: (data: OrgFormValues) => void;
  isLoading: boolean;
}

export function OrgDetailsForm({ initialData, onSubmit, isLoading }: OrgDetailsFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
    defaultValues: initialData,
  });

  const orgName = watch("name");

  // Automatically generate slug when name changes
  useEffect(() => {
    if (orgName && !initialData.slug) {
      const generatedSlug = slugify(orgName);
      setValue("slug", generatedSlug, { shouldValidate: true });
    }
  }, [orgName, setValue, initialData.slug]);

  const currentSlug = watch("slug") || "";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Set up your organization
        </h2>
        <p className="text-sm text-slate-500">
          Enter details about your optical business group or company.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Organization Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
            Organization Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. Vision Care Group"
              disabled={isLoading}
              className={`w-full border bg-white pl-10 pr-3 py-2.5 text-sm rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600
                ${errors.name ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200"}
              `}
              {...register("name")}
            />
          </div>
          {errors.name && (
            <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>
          )}
        </div>

        {/* Slug Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
            Web Slug / Identifier <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. vision-care-group"
              disabled={isLoading}
              className={`w-full border bg-white pl-10 pr-3 py-2.5 text-sm rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600
                ${errors.slug ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200"}
              `}
              {...register("slug")}
            />
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            Preview: <span className="text-indigo-600">opticalmanager.app/org/{currentSlug || "[slug]"}</span>
          </p>
          {errors.slug && (
            <p className="text-xs text-red-500 font-medium">{errors.slug.message}</p>
          )}
        </div>

        {/* Business Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
            Business Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              placeholder="e.g. contact@visioncare.com"
              disabled={isLoading}
              className={`w-full border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600
                ${errors.email ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : ""}
              `}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>
          )}
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              disabled={isLoading}
              className={`w-full border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600
                ${errors.phone ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : ""}
              `}
              {...register("phone")}
            />
          </div>
          {errors.phone && (
            <p className="text-xs text-red-500 font-medium">{errors.phone.message}</p>
          )}
        </div>

        {/* HQ Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
            HQ Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <textarea
              placeholder="e.g. 1st Floor, Vision Towers, MG Road, Mumbai"
              disabled={isLoading}
              rows={2}
              className="w-full border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none"
              {...register("address")}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-4 py-3 rounded-lg transition-all duration-200 shadow-md shadow-indigo-600/15 flex items-center justify-center gap-2 mt-6 cursor-pointer"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
