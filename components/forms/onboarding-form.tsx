"use client";

import { useActionState } from "react";
import { completeOnboardingAction } from "@/actions/onboarding.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Store, Building2, Phone, Mail, MapPin, Loader2 } from "lucide-react";
import type { FormState } from "@/utils/validators";

const initialState: FormState = {
  success: false,
  message: "",
};

export function OnboardingForm({ defaultOrgName }: { defaultOrgName: string }) {
  const [state, formAction, isPending] = useActionState(
    completeOnboardingAction,
    initialState
  );

  return (
    <Card className="w-full max-w-2xl mx-auto border-border shadow-xl shadow-primary/5 mt-12">
      <form action={formAction}>
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">Welcome to Optical Manager</CardTitle>
          <CardDescription className="text-base">
            Let&apos;s get your organization and first shop set up.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {state?.message && !state.success && (
            <div className="p-3 text-sm text-danger bg-danger/10 rounded-md border border-danger/20 text-center font-semibold">
              {state.message}
            </div>
          )}

          {/* Organization Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-border pb-2 text-text-main">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              Organization Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="orgName" className="text-sm font-semibold text-text-main">Organization Name <span className="text-danger">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <Input 
                    id="orgName" 
                    name="orgName" 
                    defaultValue={defaultOrgName} 
                    required 
                    className="pl-9"
                    placeholder="E.g. Vision Care Inc."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="orgEmail" className="text-sm font-semibold text-text-main">Organization Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <Input 
                    id="orgEmail" 
                    name="orgEmail" 
                    type="email" 
                    className="pl-9"
                    placeholder="contact@visioncare.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="orgPhone" className="text-sm font-semibold text-text-main">Organization Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <Input 
                    id="orgPhone" 
                    name="orgPhone" 
                    type="tel" 
                    className="pl-9"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="orgAddress" className="text-sm font-semibold text-text-main">HQ Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <Input 
                    id="orgAddress" 
                    name="orgAddress" 
                    className="pl-9"
                    placeholder="123 Main St, City"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* First Shop Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-border pb-2 text-text-main">
              <Store className="w-5 h-5 text-muted-foreground" />
              Your First Shop
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="shopName" className="text-sm font-semibold text-text-main">Shop Name <span className="text-danger">*</span></label>
                <div className="relative">
                  <Store className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <Input 
                    id="shopName" 
                    name="shopName" 
                    required 
                    className="pl-9"
                    placeholder="E.g. Downtown Branch"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="shopEmail" className="text-sm font-semibold text-text-main">Shop Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <Input 
                    id="shopEmail" 
                    name="shopEmail" 
                    type="email" 
                    className="pl-9"
                    placeholder="downtown@visioncare.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="shopPhone" className="text-sm font-semibold text-text-main">Shop Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <Input 
                    id="shopPhone" 
                    name="shopPhone" 
                    type="tel" 
                    className="pl-9"
                    placeholder="+1 (555) 111-1111"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="shopAddress" className="text-sm font-semibold text-text-main">Shop Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <Input 
                    id="shopAddress" 
                    name="shopAddress" 
                    className="pl-9"
                    placeholder="456 Market St, City"
                  />
                </div>
              </div>
            </div>
          </div>

        </CardContent>
        <CardFooter className="pt-4 border-t border-border bg-secondary/10 rounded-b-xl">
          <Button 
            type="submit" 
            className="w-full h-11 text-base font-bold shadow-sm"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Setting up your workspace...
              </>
            ) : (
              "Complete Setup & Go to Dashboard"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
