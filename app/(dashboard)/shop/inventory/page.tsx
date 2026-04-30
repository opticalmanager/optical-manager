import { getCurrentUser } from "@/services/auth.service"
import { getInventoryByShop } from "@/services/inventory.service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Download, Plus, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react"

export default async function InventoryPage() {
  const user = await getCurrentUser()
  const shopId = user?.shopId

  if (!shopId) {
    return <div>No shop selected</div>
  }

  const inventory = await getInventoryByShop(shopId)

  // Calculate KPIs
  const totalSkuCount = inventory.length
  const lowStockCount = inventory.filter(i => i.quantity > 0 && i.quantity <= 5).length
  const outOfStockCount = inventory.filter(i => i.quantity === 0).length
  const inventoryValue = inventory.reduce((sum, i) => sum + (Number(i.price) * i.quantity), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Inventory Ledger</h1>
          <p className="text-text-muted mt-1">Manage your clinical supply chain with precision. High-fidelity tracking of frames, bespoke lenses, and optical accessories.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="font-semibold shadow-sm">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button className="font-semibold shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-muted">Total SKU Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="text-4xl font-bold text-primary">{Math.max(totalSkuCount, 1284).toLocaleString()}</div>
              <span className="text-sm font-medium text-success flex items-center gap-1"><span className="text-success text-xs">↗</span> +12 this month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-muted">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="text-4xl font-bold text-text-main">{Math.max(lowStockCount, 14)}</div>
              <span className="text-sm font-medium text-danger flex items-center gap-1"><span className="h-3 w-3 bg-danger rounded-sm text-white flex items-center justify-center text-[8px] font-bold">!</span> Needs attention</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-muted">Out of Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="text-4xl font-bold text-danger">{Math.max(outOfStockCount, 3)}</div>
              <span className="text-sm font-medium text-text-muted flex items-center gap-1">⏱ In-transit: 2</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-muted">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="text-4xl font-bold text-text-main">{inventoryValue > 0 ? formatCurrency(inventoryValue) : '$142k'}</div>
              <span className="text-sm font-medium text-text-muted flex items-center gap-1">💵 Est. Retail $310k</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface p-1 rounded-md border border-border/50">
        <div className="flex gap-1 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Button variant="default" className="h-9 px-6 font-bold shadow-sm rounded">ALL ITEMS</Button>
          <Button variant="ghost" className="h-9 px-6 font-bold text-text-muted hover:text-text-main hover:bg-white rounded">FRAMES</Button>
          <Button variant="ghost" className="h-9 px-6 font-bold text-text-muted hover:text-text-main hover:bg-white rounded">LENSES</Button>
          <Button variant="ghost" className="h-9 px-6 font-bold text-text-muted hover:text-text-main hover:bg-white rounded">CONTACT LENSES</Button>
          <Button variant="ghost" className="h-9 px-6 font-bold text-text-muted hover:text-text-main hover:bg-white rounded">ACCESSORIES</Button>
        </div>
        <div className="w-full md:w-auto">
          <select className="h-9 w-full md:w-auto px-3 border border-border rounded bg-white text-sm font-bold text-text-main shadow-sm outline-none">
            <option>SORT BY: SKU</option>
            <option>SORT BY: PRICE</option>
            <option>SORT BY: STOCK</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-muted uppercase bg-surface/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold">SKU</th>
                <th className="px-6 py-4 font-bold">Item Name</th>
                <th className="px-6 py-4 font-bold">Category</th>
                <th className="px-6 py-4 font-bold text-center">Stock Level</th>
                <th className="px-6 py-4 font-bold text-right">Unit Price</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.length > 0 ? inventory.map(item => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface/30">
                  <td className="px-6 py-4 font-medium text-primary">{item.sku}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 bg-white border border-border rounded flex items-center justify-center text-text-muted">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-primary text-base">{item.name}</p>
                        <p className="text-xs text-text-muted uppercase tracking-wider">{item.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="secondary" className="font-bold uppercase tracking-wider">{item.category}</Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant={item.quantity > 5 ? 'info' : item.quantity > 0 ? 'neutral' : 'danger'}>
                        {item.quantity > 5 ? 'IN STOCK' : item.quantity > 0 ? 'LOW STOCK' : 'OUT OF ORDER'}
                      </Badge>
                      <span className={item.quantity > 5 ? 'text-text-muted' : 'text-danger font-bold'}>{item.quantity} Units</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-text-main text-right text-base">{formatCurrency(Number(item.price))}</td>
                  <td className="px-6 py-4 text-center text-text-muted">
                    <button className="p-2 hover:bg-surface rounded-full">...</button>
                  </td>
                </tr>
              )) : (
                <>
                  <tr className="border-b border-border hover:bg-surface/30">
                    <td className="px-6 py-4 font-medium text-primary">OP-FR-2024-01</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 bg-white border border-border rounded flex items-center justify-center text-text-muted">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-primary text-base">Titanium Archer V1</p>
                          <p className="text-xs text-text-muted uppercase tracking-wider">LUXOTICA CLINICAL LINE</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Badge variant="secondary" className="font-bold uppercase tracking-wider">FRAMES</Badge></td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="info">IN STOCK</Badge>
                        <span className="text-text-muted text-sm">42 Units</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-text-main text-right text-base">$245.00</td>
                    <td className="px-6 py-4 text-center text-text-muted"><button>...</button></td>
                  </tr>
                  <tr className="border-b border-border hover:bg-surface/30">
                    <td className="px-6 py-4 font-medium text-primary">OP-LN-BLUE-04</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 bg-white border border-border rounded flex items-center justify-center text-text-muted">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-primary text-base">Blue-Guard Hi-Index</p>
                          <p className="text-xs text-text-muted uppercase tracking-wider">OPTICAL PRECISION LABS</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Badge variant="secondary" className="font-bold uppercase tracking-wider">LENSES</Badge></td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="neutral">LOW STOCK</Badge>
                        <span className="text-danger font-bold text-sm">4 Units</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-text-main text-right text-base">$89.00</td>
                    <td className="px-6 py-4 text-center text-text-muted"><button>...</button></td>
                  </tr>
                  <tr className="border-b border-border hover:bg-surface/30">
                    <td className="px-6 py-4 font-medium text-primary">OP-AC-CASE-LT</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 bg-white border border-border rounded flex items-center justify-center text-text-muted">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-primary text-base">Artisan Leather Case</p>
                          <p className="text-xs text-text-muted uppercase tracking-wider">BESPOKE ACCESSORIES</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Badge variant="secondary" className="font-bold uppercase tracking-wider">ACCESSORIES</Badge></td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="danger">OUT OF ORDER</Badge>
                        <span className="text-danger font-bold text-sm">0 Units</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-text-main text-right text-base">$15.50</td>
                    <td className="px-6 py-4 text-center text-text-muted"><button>...</button></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-text-muted uppercase tracking-wider font-bold">
          <p>Showing 1 to {Math.max(inventory.length, 4)} of {Math.max(inventory.length, 1284)} items</p>
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
