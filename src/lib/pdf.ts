import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

/**
 * Captures a DOM element and saves it as a paginated A4 PDF. Client-side
 * only (canvas + file save), no server round-trip — matches the rest of the
 * CTA panel's "no CRM connected" honesty.
 */
export async function downloadElementAsPdf(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element #${elementId} not found`);

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;
  const pxToPt = usableWidth / imgWidthPx;
  const pageHeightPx = usableHeight / pxToPt;

  let renderedPx = 0;
  let pageIndex = 0;

  while (renderedPx < imgHeightPx) {
    const sliceHeightPx = Math.min(pageHeightPx, imgHeightPx - renderedPx);

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = imgWidthPx;
    pageCanvas.height = sliceHeightPx;
    const ctx = pageCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, renderedPx, imgWidthPx, sliceHeightPx, 0, 0, imgWidthPx, sliceHeightPx);

    const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, margin, usableWidth, sliceHeightPx * pxToPt);

    renderedPx += sliceHeightPx;
    pageIndex += 1;
  }

  pdf.save(filename);
}
