"use client";

import { Input } from "@/components/ui/input";

interface PrescriptionGridProps {
  prefix: "distancePrescription" | "nearPrescription";
  register: any;
  title: string;
}

export function PrescriptionGrid({
  prefix,
  register,
  title,
}: PrescriptionGridProps) {
  return (
    <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 transition-all hover:shadow-md">
      <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
        {title}
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">
                Eye
              </th>
              <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                Sphere (SPH)
              </th>
              <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                Cylinder (CYL)
              </th>
              <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                Axis (AXIS)
              </th>
              <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                Addition (ADD)
              </th>
              <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                Near Vision (NV)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Right Eye / OD */}
            <tr>
              <td className="py-3 font-semibold text-xs text-indigo-600">
                OD (Right)
              </td>
              <td className="py-2 px-1">
                <Input
                  type="text"
                  placeholder="e.g. -1.25"
                  className="h-9 text-center bg-white"
                  {...register(`${prefix}.rightSphere`)}
                />
              </td>
              <td className="py-2 px-1">
                <Input
                  type="text"
                  placeholder="e.g. -0.50"
                  className="h-9 text-center bg-white"
                  {...register(`${prefix}.rightCylinder`)}
                />
              </td>
              <td className="py-2 px-1">
                <Input
                  type="text"
                  placeholder="e.g. 180"
                  className="h-9 text-center bg-white"
                  {...register(`${prefix}.rightAxis`)}
                />
              </td>
              <td className="py-2 px-1">
                <Input
                  type="text"
                  placeholder="e.g. +1.75"
                  className="h-9 text-center bg-white"
                  {...register(`${prefix}.rightAdd`)}
                />
              </td>
              <td className="py-2 px-1">
                <Input
                  type="text"
                  placeholder="e.g. N6"
                  className="h-9 text-center bg-white"
                  {...register(`${prefix}.rightNv`)}
                />
              </td>
            </tr>

            {/* Left Eye / OS */}
            <tr>
              <td className="py-3 font-semibold text-xs text-indigo-600">
                OS (Left)
              </td>
              <td className="py-2 px-1">
                <Input
                  type="text"
                  placeholder="e.g. -1.50"
                  className="h-9 text-center bg-white"
                  {...register(`${prefix}.leftSphere`)}
                />
              </td>
              <td className="py-2 px-1">
                <Input
                  type="text"
                  placeholder="e.g. -0.75"
                  className="h-9 text-center bg-white"
                  {...register(`${prefix}.leftCylinder`)}
                />
              </td>
              <td className="py-2 px-1">
                <Input
                  type="text"
                  placeholder="e.g. 90"
                  className="h-9 text-center bg-white"
                  {...register(`${prefix}.leftAxis`)}
                />
              </td>
              <td className="py-2 px-1">
                <Input
                  type="text"
                  placeholder="e.g. +1.75"
                  className="h-9 text-center bg-white"
                  {...register(`${prefix}.leftAdd`)}
                />
              </td>
              <td className="py-2 px-1">
                <Input
                  type="text"
                  placeholder="e.g. N6"
                  className="h-9 text-center bg-white"
                  {...register(`${prefix}.leftNv`)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pupillary Distance Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            PD Right (OD) mm
          </label>
          <Input
            type="text"
            placeholder="e.g. 31.5"
            className="h-9 bg-white"
            {...register(`${prefix}.pdRight`)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            PD Left (OS) mm
          </label>
          <Input
            type="text"
            placeholder="e.g. 31.0"
            className="h-9 bg-white"
            {...register(`${prefix}.pdLeft`)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Total PD mm
          </label>
          <Input
            type="text"
            placeholder="e.g. 62.5"
            className="h-9 bg-white"
            {...register(`${prefix}.pd`)}
          />
        </div>
      </div>
    </div>
  );
}
