import { getCurrentUser } from "@/services/auth.service";
import { getShopsByOrganization } from "@/services/shop.service";
import { redirect } from "next/navigation";

export default async function ShopsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") redirect("/login");

  const shops = await getShopsByOrganization(user.organizationId);

  return (
    <div>
      <div className="page-header">
        <h1>Manage Shops</h1>
        <button className="btn btn-primary">+ Add Shop</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Phone</th>
              <th>GST</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => (
              <tr key={shop.id}>
                <td>{shop.name}</td>
                <td>{shop.address ?? "—"}</td>
                <td>{shop.phone ?? "—"}</td>
                <td>{shop.gstNumber ?? "—"}</td>
                <td>
                  <span className={`badge ${shop.isActive ? "badge-active" : "badge-inactive"}`}>
                    {shop.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm btn-outline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
