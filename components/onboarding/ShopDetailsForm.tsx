"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Store, Mail, Phone, MapPin, ArrowLeft, Check, Loader2, Lock, Eye, EyeOff } from "lucide-react";

// Define schema validation
const shopFormSchema = z.object({
  name: z.string().min(2, "Shop name must be at least 2 characters."),
  createCredentials: z.boolean(),
  email: z.string().optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits.").optional().or(z.literal("")),
  address: z.string().min(5, "Shop address should be at least 5 characters.").optional().or(z.literal("")),
  password: z.string().optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.createCredentials) {
    if (!data.email || !data.email.includes("@")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A valid email is required — this will be the shop manager's login.",
        path: ["email"],
      });
    }
    if (!data.password || data.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 8 characters.",
        path: ["password"],
      });
    }
    if (!data.confirmPassword || data.confirmPassword.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please confirm the password.",
        path: ["confirmPassword"],
      });
    } else if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  }
});

type ShopFormValues = z.infer<typeof shopFormSchema>;

interface ShopDetailsFormProps {
  initialData: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  onSubmit: (data: ShopFormValues) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function ShopDetailsForm({ initialData, onSubmit, onBack, isLoading }: ShopDetailsFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ShopFormValues>({
    resolver: zodResolver(shopFormSchema),
    defaultValues: {
      ...initialData,
      createCredentials: true,
      password: "",
      confirmPassword: "",
    },
  });

  const createCredentials = watch("createCredentials");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Create your first shop
        </h2>
        <p className="text-sm text-slate-500">
          Set up your store location and optionally configure shop manager login credentials.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Shop Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
            Shop Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. Downtown Branch"
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

        {/* Credentials Configuration Option */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-semibold text-slate-700 block">
                Create Manager Login Credentials
              </label>
              <p className="text-xs text-slate-500">
                Configure an email & password to let a shop manager access their own dashboard.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                disabled={isLoading}
                {...register("createCredentials")}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Credentials Form Section */}
        {createCredentials && (
          <div className="space-y-4 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Shop Email — Login ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                Shop Manager Email (Login ID) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="e.g. branch1@visioncare.com"
                  disabled={isLoading}
                  className={`w-full border bg-white pl-10 pr-3 py-2.5 text-sm rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600
                    ${errors.email ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200"}
                  `}
                  {...register("email")}
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                The shop manager will use this email to log in to the shop dashboard.
              </p>
              {errors.email && (
                <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Fields Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shop Manager Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                  Shop Manager Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    disabled={isLoading}
                    className={`w-full border bg-white pl-10 pr-10 py-2.5 text-sm rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600
                      ${errors.password ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200"}
                    `}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    disabled={isLoading}
                    className={`w-full border bg-white pl-10 pr-10 py-2.5 text-sm rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600
                      ${errors.confirmPassword ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200"}
                    `}
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 font-medium">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Shop Phone */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
            Shop Phone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="tel"
              placeholder="e.g. 9876543211"
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

        {/* Shop Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">
            Shop Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <textarea
              placeholder="e.g. Shop No. 4, Market Square, MG Road, Mumbai"
              disabled={isLoading}
              rows={2}
              className={`w-full border bg-white pl-10 pr-3 py-2.5 text-sm rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none
                ${errors.address ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "border-slate-200"}
              `}
              {...register("address")}
            />
          </div>
          {errors.address && (
            <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 items-center justify-between mt-6">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all font-semibold text-sm cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all font-semibold text-sm cursor-pointer shadow-md shadow-indigo-600/15 disabled:opacity-50 flex-1 justify-center max-w-[200px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Complete Setup</span>
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
