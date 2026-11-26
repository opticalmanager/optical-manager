/**
 * Client-side high-resolution A4 PDF export utility shared by internal and public document viewers.
 */

export function sanitizeDocumentFileSegment(raw: string, fallback = "Document"): string {
  const clean = (raw || fallback)
    .trim()
    .replace(/[\/\\:*?"<>|#\s]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || fallback;
}

export function buildDocumentPdfFileName(storeName: string, docNumber: string): string {
  return `${sanitizeDocumentFileSegment(storeName, "Optical_Store")}_${sanitizeDocumentFileSegment(docNumber, "Document")}.pdf`;
}

/**
 * Captures an off-screen 794px A4 clone of `elementId` via html2canvas-pro + jsPDF
 * so zooming/scaling on mobile or desktop viewports never distorts the exported PDF.
 */
export async function exportElementToA4Pdf(elementId: string, fileName: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const printArea = document.getElementById(elementId);
  if (!printArea) {
    console.error("[exportElementToA4Pdf] Print element not found:", elementId);
    return false;
  }

  let tempContainer: HTMLDivElement | null = null;

  try {
    const [html2canvasModule, { jsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);
    const html2canvas = html2canvasModule.default || html2canvasModule;

    tempContainer = document.createElement("div");
    tempContainer.style.position = "fixed";
    tempContainer.style.left = "-99999px";
    tempContainer.style.top = "0";
    tempContainer.style.width = "794px";
    tempContainer.style.minWidth = "794px";
    tempContainer.style.maxWidth = "794px";
    tempContainer.style.margin = "0";
    tempContainer.style.padding = "0";
    tempContainer.style.background = "#ffffff";
    tempContainer.style.zIndex = "-9999";
    tempContainer.style.opacity = "1";
    tempContainer.style.pointerEvents = "none";

    const clone = printArea.cloneNode(true) as HTMLElement;
    clone.style.transform = "none";
    clone.style.margin = "0";
    clone.style.boxShadow = "none";
    clone.style.borderRadius = "0";

    const innerCards = clone.querySelectorAll<HTMLElement>(".print-page, .print-container");
    innerCards.forEach((card) => {
      card.style.boxShadow = "none";
      card.style.margin = "0 auto";
    });

    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    await new Promise((resolve) => setTimeout(resolve, 80));

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageElements = Array.from(clone.querySelectorAll<HTMLElement>(".print-page"));

    if (pageElements.length > 0) {
      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: 794,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        if (i > 0) {
          pdf.addPage("a4", "portrait");
        }
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      }
    } else {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft > 2) {
        position -= pageHeight;
        pdf.addPage("a4", "portrait");
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }
    }

    pdf.save(fileName);
    return true;
  } catch (err) {
    console.error("[exportElementToA4Pdf] PDF generation failed:", err);
    window.print();
    return false;
  } finally {
    if (tempContainer && tempContainer.parentNode) {
      tempContainer.parentNode.removeChild(tempContainer);
    }
  }
}
