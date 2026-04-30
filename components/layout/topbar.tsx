import { Search, Bell, User } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-8">
      {/* Search */}
      <div className="flex max-w-md flex-1 items-center gap-2 rounded-md bg-surface px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
        <Search className="h-4 w-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search patients, invoices, or stock..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-text-muted"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 ml-auto">
        <Button variant="outline" className="font-semibold text-text-main">
          Add Patient
        </Button>
        <Button className="font-semibold">
          New Invoice
        </Button>
        
        <div className="h-6 w-px bg-border mx-2" />
        
        <button className="text-text-muted hover:text-text-main transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        
        <Avatar fallback="OP" className="h-8 w-8 ml-2 bg-surface border border-border" />
      </div>
    </header>
  )
}
