import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const filePath = path.join(process.cwd(), "public", "videos", "hero-intro.mp4");

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Video not found", { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });

    const stream = new ReadableStream({
      start(controller) {
        file.on("data", (chunk) => controller.enqueue(chunk));
        file.on("end", () => controller.close());
        file.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(stream as any, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize.toString(),
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const file = fs.createReadStream(filePath);
  const stream = new ReadableStream({
    start(controller) {
      file.on("data", (chunk) => controller.enqueue(chunk));
      file.on("end", () => controller.close());
      file.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(stream as any, {
    status: 200,
    headers: {
      "Content-Length": fileSize.toString(),
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
