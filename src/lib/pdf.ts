import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

/**
 * Triggers the browser's native print dialog to save the page as a PDF.
 * This is far superior to html2canvas slicing as the browser natively respects
 * text and page boundaries.
 */
export async function downloadElementAsPdf(elementId: string, filename: string) {
  const oldTitle = document.title;
  // Set title temporarily so the default "Save as PDF" filename is correct
  document.title = filename.replace(/\.pdf$/i, "");
  
  // Give React a moment if any state changes happened
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  window.print();
  
  document.title = oldTitle;
}
