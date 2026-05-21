import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export async function GET() {
  const results: string[] = [];

  try {
    // 1. Delete the duplicate onboarding folder
    const targetPath = path.join(process.cwd(), "app", "(dashboard)", "onboarding");
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      results.push(`Deleted: ${targetPath}`);
    } else {
      results.push(`Not found: ${targetPath}`);
    }

    // 2. Push database schema
    try {
      const dbOutput = execSync("npx drizzle-kit push", { cwd: process.cwd(), encoding: "utf8" });
      results.push(`DB Push Success: ${dbOutput}`);
    } catch (e: any) {
      results.push(`DB Push Error: ${e.message}\n${e.stdout}\n${e.stderr}`);
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, results });
  }
}
