import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationById } from "@/services/organization.service";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") redirect("/login");

  const org = await getOrganizationById(user.organizationId);

  return (
    <div>
      <h1>Organization Settings</h1>

      <form className="settings-form">
        <div className="form-group">
          <label htmlFor="name">Organization Name</label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={org?.name ?? ""}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Contact Email</label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={org?.email ?? ""}
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={org?.phone ?? ""}
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            rows={3}
            defaultValue={org?.address ?? ""}
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Save Changes
        </button>
      </form>
    </div>
  );
}
