import { getCurrentUser } from "@/services/auth.service";
import { getShopsByOrganization } from "@/services/shop.service";
import { redirect } from "next/navigation";

export default async function OwnerDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") redirect("/login");

  const shops = await getShopsByOrganization(user.organizationId);

  return (
    <div>
      <h1>Organization Dashboard</h1>
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Shops</h3>
          <p className="stat-value">{shops.length}</p>
        </div>
        <div className="stat-card">
          <h3>Active Shops</h3>
          <p className="stat-value">
            {shops.filter((s) => s.isActive).length}
          </p>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Your Shops</h2>
        {shops.length === 0 ? (
          <p>No shops yet. Create your first shop to get started.</p>
        ) : (
          <div className="shops-grid">
            {shops.map((shop) => (
              <div key={shop.id} className="shop-card">
                <h3>{shop.name}</h3>
                <p>{shop.address ?? "No address"}</p>
                <span className={`badge ${shop.isActive ? "badge-active" : "badge-inactive"}`}>
                  {shop.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
