import { getCurrentUser } from "@/services/auth.service";
import { redirect } from "next/navigation";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <button className="btn btn-primary">+ Add Customer</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="empty-state">
                No customers yet. Add your first customer.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
