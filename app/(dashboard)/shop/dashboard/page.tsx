import { getCurrentUser } from "@/services/auth.service"
import { getInvoicesByShop } from "@/services/invoice.service"
import { getLowStockItems } from "@/services/inventory.service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { MoreVertical, Image as ImageIcon } from "lucide-react"

export default async function ShopDashboardPage() {
  const user = await getCurrentUser()
  const shopId = user?.shopId

  if (!shopId) {
    return <div>No shop selected</div>
  }

  // Fetch real data
  const invoices = await getInvoicesByShop(shopId)
  const lowStockItems = await getLowStockItems(shopId, 5)

  // Mock data for KPIs
  const todaySales = invoices
    .filter(i => new Date(i.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, i) => sum + Number(i.totalAmount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Clinic Performance</h1>
          <p className="text-text-muted mt-1">
            {formatDate(new Date())} • Morning Session
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium border border-border shadow-sm">
          <div className="h-2 w-2 rounded-full bg-success"></div>
          Live Status
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-text-muted">Daily Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-primary">{formatCurrency(todaySales || 4280.50)}</div>
              <span className="text-sm font-medium text-success">+12%</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-text-muted">Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-primary">18</div>
              <span className="text-sm font-medium text-text-muted">/ 24 slots</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-text-muted">Avg. Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-primary">{formatCurrency(238)}</div>
              <span className="text-sm font-medium text-danger">-2%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Revenue Trends Placeholder */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Revenue Trends</CardTitle>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-primary"></div>FRAMES</div>
              <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-primary-light"></div>LENSES</div>
            </div>
          </CardHeader>
          <CardContent className="h-[250px] flex items-end justify-around pb-4">
            {/* CSS Bar Chart Placeholder */}
            {[40, 60, 30, 80, 50, 90, 45, 60, 95].map((h, i) => (
              <div key={i} className={`w-8 rounded-t-sm ${i % 2 === 0 ? 'bg-primary-light/50' : 'bg-primary'}`} style={{ height: `${h}%` }}></div>
            ))}
          </CardContent>
        </Card>

        {/* Right Column: Inventory & Appointments */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm uppercase font-bold tracking-wider">Inventory Alerts</CardTitle>
              <Badge variant="destructive">{lowStockItems.length} Critical</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {lowStockItems.length > 0 ? lowStockItems.slice(0, 2).map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-surface p-3 rounded-md border border-border">
                  <div className="h-10 w-10 flex-shrink-0 bg-white border border-border rounded flex items-center justify-center text-text-muted">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold truncate">{item.name}</p>
                    <p className="text-xs text-text-muted">SKU: {item.sku}</p>
                  </div>
                  <div className="text-sm font-bold text-danger">{item.quantity} left</div>
                </div>
              )) : (
                <div className="flex items-center gap-3 bg-surface p-3 rounded-md border border-border">
                  <div className="h-10 w-10 flex-shrink-0 bg-white border border-border rounded flex items-center justify-center text-text-muted">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Ray-Ban Wayfarer</p>
                    <p className="text-xs text-text-muted">SKU: RB-2140</p>
                  </div>
                  <div className="text-sm font-bold text-danger">2 left</div>
                </div>
              )}
              <div className="pt-2 text-center">
                <a href="/shop/inventory" className="text-xs font-bold uppercase tracking-wider text-primary hover:underline">Manage Full Inventory</a>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary text-white border-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-white/80">Next Appointment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded bg-white/20 flex items-center justify-center text-lg font-bold">
                  JD
                </div>
                <div>
                  <h3 className="text-lg font-bold">Jonathan Doe</h3>
                  <p className="text-sm text-white/80">10:45 AM • Annual Exam</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 bg-white text-primary text-sm font-bold py-2 rounded">View Record</button>
                <button className="px-3 bg-white/20 rounded flex items-center justify-center"><MoreVertical className="h-4 w-4" /></button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Financial Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Recent Financial Activity</h2>
          <a href="/shop/invoices" className="text-sm font-bold text-primary hover:underline">View All Invoices &rsaquo;</a>
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text-muted uppercase bg-surface/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-bold">Invoice ID</th>
                  <th className="px-6 py-4 font-bold">Patient Name</th>
                  <th className="px-6 py-4 font-bold">Description</th>
                  <th className="px-6 py-4 font-bold">Date</th>
                  <th className="px-6 py-4 font-bold text-right">Amount</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length > 0 ? invoices.slice(0, 5).map(invoice => (
                  <tr key={invoice.id} className="border-b border-border last:border-0 hover:bg-surface/30">
                    <td className="px-6 py-4 font-medium text-text-muted">#{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 font-medium text-text-main">
                      {/* Would join with customer table in a real query, mocking name for now if undefined */}
                      {invoice.customerId ? `Customer ${invoice.customerId.substring(0, 4)}` : "Walk-in Customer"}
                    </td>
                    <td className="px-6 py-4 text-text-muted">Optical Services</td>
                    <td className="px-6 py-4 text-text-muted">{formatDate(new Date(invoice.createdAt))}</td>
                    <td className="px-6 py-4 font-bold text-primary text-right">{formatCurrency(Number(invoice.totalAmount))}</td>
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
                  <tr className="border-b border-border">
                    <td className="px-6 py-4 font-medium text-text-muted">#INV-8921</td>
                    <td className="px-6 py-4 font-medium text-text-main">Sarah Miller</td>
                    <td className="px-6 py-4 text-text-muted">Varifocal Lenses + Frame</td>
                    <td className="px-6 py-4 text-text-muted">Oct 24, 09:12 AM</td>
                    <td className="px-6 py-4 font-bold text-primary text-right">$642.00</td>
                    <td className="px-6 py-4 flex justify-center"><Badge variant="success">PAID</Badge></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
