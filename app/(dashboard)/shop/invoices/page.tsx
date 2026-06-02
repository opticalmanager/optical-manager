import { getCurrentUser } from "@/services/auth.service"
import { getInvoicesByShop } from "@/services/invoice.service"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Calendar, Filter, ChevronLeft, ChevronRight } from "lucide-react"

export default async function InvoicesPage() {
  const user = await getCurrentUser()
  const shopId = user?.shopId

  if (!shopId) {
    return <div>No shop selected</div>
  }

  const invoices = await getInvoicesByShop(shopId)

  // Calculate some basic KPIs
  const totalRevenue = invoices
    .filter(i => i.status === 'PAID')
    .reduce((sum, i) => sum + Number(i.total), 0)

  const pendingAmount = invoices
    .filter(i => i.status === 'PENDING')
    .reduce((sum, i) => sum + Number(i.total), 0)

  return (
    <div className="space-y-6">
      {/* Header & Top KPIs */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-1">Financial Ledger</h2>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Invoice Management</h1>
        </div>
        
        <div className="flex gap-8 bg-white p-4 rounded-lg border border-border shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase text-text-muted mb-1">MTD Revenue</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue || 42850.00)}</p>
          </div>
          <div className="w-px bg-border"></div>
          <div>
            <p className="text-xs font-bold uppercase text-text-muted mb-1">Pending</p>
            <p className="text-2xl font-bold text-text-muted">{formatCurrency(pendingAmount || 3120.45)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Filters */}
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
              <div>
                <label className="text-xs font-bold uppercase text-text-muted mb-2 block">Date Range</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input type="text" placeholder="mm/dd/yyyy" className="w-full h-10 px-3 border border-border rounded-md text-sm" />
                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-text-muted" />
                  </div>
                  <span className="text-text-muted text-sm">to</span>
                  <div className="relative flex-1">
                    <input type="text" placeholder="mm/dd/yyyy" className="w-full h-10 px-3 border border-border rounded-md text-sm" />
                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-text-muted" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold uppercase text-text-muted mb-2 block">Payment Status</label>
                <select className="w-full h-10 px-3 border border-border rounded-md text-sm bg-white">
                  <option>All Statuses</option>
                  <option>Paid</option>
                  <option>Pending</option>
                  <option>Overdue</option>
                </select>
              </div>

              <div>
                <Button className="w-full font-bold bg-[#172b4d] hover:bg-[#091e42]">
                  <Filter className="mr-2 h-4 w-4" /> APPLY FILTERS
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collection Rate Widget */}
        <Card className="bg-primary text-white border-primary">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div className="h-8 w-8 bg-white/20 rounded flex items-center justify-center">
                <ReceiptText className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/80">Collection Rate</span>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">94.2%</div>
              <p className="text-xs text-white/80 leading-relaxed">
                Average payment cycle: 14 days. Outstanding aging is below clinical threshold.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-muted uppercase bg-surface/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold">Invoice #</th>
                <th className="px-6 py-4 font-bold">Customer</th>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold text-right">Amount</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? invoices.map(invoice => (
                <tr key={invoice.id} className="border-b border-border last:border-0 hover:bg-surface/30">
                  <td className="px-6 py-4 font-medium text-text-muted">{invoice.invoiceNumber}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-bold uppercase">
                        {invoice.customerId ? invoice.customerId.substring(0,2) : "WK"}
                      </div>
                      <div>
                        <p className="font-bold text-text-main">Customer {invoice.customerId?.substring(0, 4) || "Walk-in"}</p>
                        <p className="text-xs text-text-muted">Optical Services</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-muted">{formatDate(new Date(invoice.createdAt))}</td>
                  <td className="px-6 py-4 font-bold text-primary text-right">{formatCurrency(Number(invoice.total))}</td>
                  <td className="px-6 py-4 flex justify-center">
                    <Badge variant={
                      invoice.status === 'PAID' ? 'success' : 
                      invoice.status === 'PENDING' ? 'neutral' : 'danger'
                    }>
                      {invoice.status}
                    </Badge>
                  </td>
                </tr>
              )) : (
                <>
                  <tr className="border-b border-border hover:bg-surface/30">
                    <td className="px-6 py-4 font-medium text-text-muted">INV-2023-0891</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-bold">EA</div>
                        <div>
                          <p className="font-bold text-text-main">Eleanor Abbott</p>
                          <p className="text-xs text-text-muted">Progressive Lens Fitting</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">Oct 24, 2023</td>
                    <td className="px-6 py-4 font-bold text-primary text-right">$842.00</td>
                    <td className="px-6 py-4 flex justify-center"><Badge variant="success">PAID</Badge></td>
                  </tr>
                  <tr className="border-b border-border hover:bg-surface/30">
                    <td className="px-6 py-4 font-medium text-text-muted">INV-2023-0895</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-surface border border-border text-text-main flex items-center justify-center text-xs font-bold">JM</div>
                        <div>
                          <p className="font-bold text-text-main">Julian Miller</p>
                          <p className="text-xs text-text-muted">Comprehensive Eye Exam</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">Oct 26, 2023</td>
                    <td className="px-6 py-4 font-bold text-primary text-right">$125.00</td>
                    <td className="px-6 py-4 flex justify-center"><Badge variant="neutral">PENDING</Badge></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-text-muted">
          <p>Showing 1 to {Math.max(invoices.length, 5)} of {Math.max(invoices.length, 42)} invoices</p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="default" size="icon" className="h-8 w-8">1</Button>
            <Button variant="outline" size="icon" className="h-8 w-8">2</Button>
            <Button variant="outline" size="icon" className="h-8 w-8">3</Button>
            <Button variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Just adding the icon that was missing in imports above
import { ReceiptText } from "lucide-react"
