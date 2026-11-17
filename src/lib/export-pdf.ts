import { getFontEmbedCSS, toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

/** One page per slide, each a high resolution picture of the slide (960 × 540 pt, 16:9). */
export async function exportPdf(title: string, slides: HTMLElement[], onProgress?: (done: number) => void) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [960, 540], compress: true });
  pdf.setProperties({ title });
  const fontEmbedCSS = slides[0] ? await getFontEmbedCSS(slides[0]).catch(() => "") : "";
  for (const [index, slide] of slides.entries()) {
    const data = await toJpeg(slide, {
      width: 1280,
      height: 720,
      pixelRatio: 2,
      quality: 0.92,
      fontEmbedCSS,
      style: { transform: "none" },
    });
    if (index > 0) pdf.addPage([960, 540], "landscape");
    pdf.addImage(data, "JPEG", 0, 0, 960, 540, undefined, "FAST");
    onProgress?.(index + 1);
  }
  return pdf.output("blob");
}
