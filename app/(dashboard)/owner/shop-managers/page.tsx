import { getCurrentUser } from "@/services/auth.service";
import { redirect } from "next/navigation";

export default async function ShopManagersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") redirect("/login");

  return (
    <div>
      <div className="page-header">
        <h1>Shop Managers</h1>
        <button className="btn btn-primary">+ Add Manager</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Assigned Shop</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Shop managers will be listed here */}
            <tr>
              <td colSpan={5} className="empty-state">
                No shop managers yet. Add your first manager.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
