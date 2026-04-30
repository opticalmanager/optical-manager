"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Archive, 
  ReceiptText, 
  Eye, 
  History, 
  Settings, 
  HelpCircle,
  Eye as EyeLogo
} from "lucide-react"

import { cn } from "@/lib/utils"

const navItems = [
  {
    title: "DASHBOARD",
    href: "/shop/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "STOCK MANAGEMENT",
    href: "/shop/inventory",
    icon: Archive,
  },
  {
    title: "INVOICING",
    href: "/shop/invoices",
    icon: ReceiptText,
  },
  {
    title: "PRESCRIPTION MANAGEMENT",
    href: "/shop/prescriptions",
    icon: Eye,
  },
  {
    title: "CUSTOMER HISTORY",
    href: "/shop/customers",
    icon: History,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-surface">
      {/* Top Logo */}
      <div className="flex h-16 items-center px-6 text-primary font-bold text-xl">
        Optical Precision
      </div>

      {/* Shop Profile Widget */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm border border-border/50">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-white">
            <EyeLogo className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">Clinical Curator</h3>
            <p className="text-xs text-text-muted">PRECISION EYE CARE</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-white text-primary shadow-sm"
                  : "text-text-muted hover:bg-white/50 hover:text-text-main"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-text-muted")} />
              {item.title}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-border p-4 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-white/50 hover:text-text-main"
        >
          <Settings className="h-5 w-5" />
          SETTINGS
        </Link>
        <Link
          href="/support"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-white/50 hover:text-text-main"
        >
          <HelpCircle className="h-5 w-5" />
          SUPPORT
        </Link>
      </div>
    </div>
  )
}
