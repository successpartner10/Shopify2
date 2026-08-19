let workerPromise = null;

function tessPaths() {
  const worker = new URL("./vendor/tesseract/worker.min.js", import.meta.url).href;
  const core = new URL("./vendor/tesseract/tesseract-core-simd.wasm.js", import.meta.url).href;
  const lang = new URL("./vendor/tesseract-lang", import.meta.url).href;
  return { workerPath: worker, corePath: core, langPath: lang };
}

export function ocrAvailable() {
  return typeof window.Tesseract !== "undefined";
}

export async function getWorker(onProgress) {
  if (!window.Tesseract) throw new Error("Tesseract.js is not loaded");
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await window.Tesseract.createWorker("eng", 1, {
        ...tessPaths(),
        logger: (m) => {
          if (onProgress && m.status) onProgress(m);
        }
      });
      await worker.setParameters({
        tessedit_pageseg_mode: "6",
        preserve_interword_spaces: "1"
      });
      return worker;
    })();
  }
  return workerPromise;
}

export function frameToCanvas(source, maxW = 1400) {
  const w = source.videoWidth || source.naturalWidth || source.width;
  const h = source.videoHeight || source.naturalHeight || source.height;
  if (!w || !h) throw new Error("Nothing to capture yet — wait for the frame to appear.");
  const scale = Math.min(1, maxW / w);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function crop(canvas, y0, y1) {
  const h = Math.max(8, Math.round(canvas.height * (y1 - y0)));
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = h;
  out.getContext("2d").drawImage(
    canvas,
    0, Math.round(canvas.height * y0), canvas.width, h,
    0, 0, canvas.width, h
  );
  return out;
}

export async function recognize(source, onProgress) {
  const canvas = source instanceof HTMLCanvasElement ? source : frameToCanvas(source);
  const worker = await getWorker(onProgress);
  const full = await worker.recognize(canvas);
  const text = (full?.data?.text || "").replace(/[ \t]+\n/g, "\n").trim();
  const words = (full?.data?.words || [])
    .filter((w) => (w.text || "").trim().length > 1)
    .map((w) => ({
      text: w.text,
      conf: w.confidence || 0,
      x: ((w.bbox?.x0 || 0) + (w.bbox?.x1 || 0)) / 2 / canvas.width,
      y: ((w.bbox?.y0 || 0) + (w.bbox?.y1 || 0)) / 2 / canvas.height,
      bbox: {
        x0: (w.bbox?.x0 || 0) / canvas.width,
        y0: (w.bbox?.y0 || 0) / canvas.height,
        x1: (w.bbox?.x1 || 0) / canvas.width,
        y1: (w.bbox?.y1 || 0) / canvas.height
      }
    }));

  let bannerText = "";
  let toastText = "";
  try {
    const top = await worker.recognize(crop(canvas, 0, 0.22));
    bannerText = (top?.data?.text || "").trim();
    const bot = await worker.recognize(crop(canvas, 0.78, 1));
    toastText = (bot?.data?.text || "").trim();
  } catch {
    /* zone OCR is best-effort */
  }

  return { text, canvas, words, bannerText, toastText };
}
