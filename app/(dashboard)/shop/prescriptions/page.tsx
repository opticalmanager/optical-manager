import { getCurrentUser } from "@/services/auth.service"
import { getPrescriptionsByShop } from "@/services/prescription.service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { ChevronRight, BriefcaseMedical } from "lucide-react"

export default async function PrescriptionsPage() {
  const user = await getCurrentUser()
  const shopId = user?.shopId

  if (!shopId) {
    return <div>No shop selected</div>
  }

  const prescriptions = await getPrescriptionsByShop(shopId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Prescription Ledger</h1>
          <p className="text-text-muted mt-1">Managing {Math.max(prescriptions.length, 1248).toLocaleString()} clinical records for Optical Precision.</p>
        </div>
        
        <div className="flex bg-surface p-1 rounded-md border border-border">
          <Button variant="default" className="h-8 rounded shadow-sm px-6">Active</Button>
          <Button variant="ghost" className="h-8 rounded px-6 text-text-muted hover:text-text-main">Archived</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-muted">Today&apos;s Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-primary">24</div>
              <span className="text-sm font-medium text-text-muted">+12% vs last week</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-muted">Pending Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-text-main">156</div>
              <span className="text-sm font-medium text-text-muted">8 urgent</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-muted">Average SPH</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-text-main">-2.75</div>
              <span className="text-sm font-medium text-text-muted">Myopia dominant</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary text-white border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-white/80">Clinic Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success"></div>
              <span className="text-sm font-bold text-white">System Synchronized</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prescriptions Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-muted uppercase bg-surface/50 border-b border-border">
              <tr>
                <th className="px-3 md:px-6 py-4 font-bold">Patient Name</th>
                <th className="px-3 md:px-6 py-4 font-bold">Exam Date</th>
                <th className="px-3 md:px-6 py-4 font-bold">Optometrist</th>
                <th className="px-3 md:px-6 py-4 text-center font-bold">SPH</th>
                <th className="px-3 md:px-6 py-4 text-center font-bold">CYL</th>
                <th className="px-3 md:px-6 py-4 text-center font-bold">AXIS</th>
                <th className="px-3 md:px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.length > 0 ? prescriptions.map(rx => (
                <tr key={rx.id} className="border-b border-border last:border-0 hover:bg-surface/30 cursor-pointer">
                  <td className="px-3 md:px-6 py-4">
                    <p className="font-bold text-text-main">Customer {rx.customerId?.substring(0, 4)}</p>
                    <p className="text-xs text-text-muted">ID: #OP-{rx.id.substring(0, 5)}</p>
                  </td>
                  <td className="px-3 md:px-6 py-4">
                    <p className="text-text-main">{formatDate(new Date(rx.createdAt))}</p>
                    <p className="text-xs text-text-muted">10:45 AM</p>
                  </td>
                  <td className="px-3 md:px-6 py-4">
                    <div className="flex items-center gap-2 text-text-main font-medium">
                      <BriefcaseMedical className="h-4 w-4 text-primary" /> Dr. Elias Vance
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-4 text-center">
                    <p className="text-xs font-bold text-text-muted mb-1">OD</p>
                    <p className="font-bold text-primary">{rx.rightSphere}</p>
                  </td>
                  <td className="px-3 md:px-6 py-4 text-center">
                    <p className="text-xs font-bold text-text-muted mb-1">CYL</p>
                    <p className="font-bold text-text-main">{rx.rightCylinder || "DS"}</p>
                  </td>
                  <td className="px-3 md:px-6 py-4 text-center">
                    <p className="text-xs font-bold text-text-muted mb-1">AX</p>
                    <p className="font-bold text-text-main">{rx.rightAxis ? `${rx.rightAxis}°` : "—"}</p>
                  </td>
                  <td className="px-3 md:px-6 py-4 text-right text-text-muted">
                    <ChevronRight className="h-5 w-5 ml-auto" />
                  </td>
                </tr>
              )) : (
                <>
                  <tr className="border-b border-border hover:bg-surface/30 cursor-pointer">
                    <td className="px-3 md:px-6 py-4">
                      <p className="font-bold text-text-main">Alexandra Sterling</p>
                      <p className="text-xs text-text-muted">ID: #OP-98210</p>
                    </td>
                    <td className="px-3 md:px-6 py-4">
                      <p className="text-text-main">Oct 24, 2023</p>
                      <p className="text-xs text-text-muted">10:45 AM</p>
                    </td>
                    <td className="px-3 md:px-6 py-4">
                      <div className="flex items-center gap-2 text-text-main font-medium">
                        <BriefcaseMedical className="h-4 w-4 text-primary" /> Dr. Elias Vance
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-center border-l border-border/50">
                      <p className="text-xs font-bold text-text-muted mb-1">OD</p>
                      <p className="font-bold text-primary">-3.25</p>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-center">
                      <p className="text-xs font-bold text-text-muted mb-1">CYL</p>
                      <p className="font-bold text-primary">-1.50</p>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-center">
                      <p className="text-xs font-bold text-text-muted mb-1">AX</p>
                      <p className="font-bold text-primary">175°</p>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-right text-text-muted">
                      <ChevronRight className="h-5 w-5 ml-auto" />
                    </td>
                  </tr>
                  <tr className="border-b border-border hover:bg-surface/30 cursor-pointer">
                    <td className="px-3 md:px-6 py-4">
                      <p className="font-bold text-text-main">Marcus Thorne</p>
                      <p className="text-xs text-text-muted">ID: #OP-87723</p>
                    </td>
                    <td className="px-3 md:px-6 py-4">
                      <p className="text-text-main">Oct 23, 2023</p>
                      <p className="text-xs text-text-muted">02:15 PM</p>
                    </td>
                    <td className="px-3 md:px-6 py-4">
                      <div className="flex items-center gap-2 text-text-main font-medium">
                        <BriefcaseMedical className="h-4 w-4 text-primary" /> Dr. Sarah Jenks
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-center border-l border-border/50">
                      <p className="text-xs font-bold text-text-muted mb-1">OD</p>
                      <p className="font-bold text-primary">+1.75</p>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-center">
                      <p className="text-xs font-bold text-text-muted mb-1">CYL</p>
                      <p className="font-bold text-text-main">DS</p>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-center">
                      <p className="text-xs font-bold text-text-muted mb-1">AX</p>
                      <p className="font-bold text-text-main">—</p>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-right text-text-muted">
                      <ChevronRight className="h-5 w-5 ml-auto" />
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Clinical Insights Placeholder */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Clinical Insights</CardTitle>
            <a href="#" className="text-xs font-bold text-primary uppercase tracking-wider">View Trends</a>
          </CardHeader>
          <CardContent className="h-[250px] flex items-end justify-around pb-4">
            {/* CSS Bar Chart Placeholder */}
            {[30, 80, 50, 20, 10, 45, 60].map((h, i) => (
              <div key={i} className={`w-12 rounded-t-sm relative ${i % 2 === 0 ? 'bg-primary-light/80' : 'bg-primary'}`} style={{ height: `${h}%` }}>
                <div className="text-center w-full absolute -bottom-6 text-xs text-text-muted font-medium">
                  {['MON','TUE','WED','THU','FRI','SAT','SUN'][i]}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Image Card Placeholder */}
        <Card className="relative overflow-hidden bg-surface flex flex-col justify-end min-h-[300px]">
          <div className="absolute inset-0 bg-primary/10">
            {/* We'd use a real image here normally */}
            <div className="w-full h-full flex items-center justify-center text-text-muted">
               [Phoropter Image]
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          <div className="relative z-10 p-6 text-white space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-white/80">Next Appointment</p>
            <h3 className="text-xl font-bold">Patient: Arthur Morgan</h3>
            <Button className="w-full bg-white text-primary mt-2">Prep Session</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
