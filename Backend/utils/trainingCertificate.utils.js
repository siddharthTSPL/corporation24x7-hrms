const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const REQUIRED_FIELDS = ["employee_name", "training_name", "trainer_name", "completion_date", "issue_date", "company_name", "signatory_name", "signatory_title"];

async function validateTemplate(bytes) {
  if (!bytes || bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("The uploaded file is not a valid PDF.");
  let pdf;
  try { pdf = await PDFDocument.load(bytes); } catch { throw new Error("This PDF template cannot be opened."); }
  let form;
  try { form = pdf.getForm(); } catch { throw new Error("The PDF must contain fillable form fields."); }
  const available = new Set(form.getFields().map((field) => field.getName()));
  const missing = REQUIRED_FIELDS.filter((name) => !available.has(name));
  if (missing.length) throw new Error(`PDF template is missing required fillable fields: ${missing.join(", ")}`);
  for (const name of REQUIRED_FIELDS) {
    try { form.getTextField(name); }
    catch { throw new Error(`Required PDF field '${name}' must be a text field.`); }
  }
}

async function embedBrandImages(pdf, pages, brandAssets, customTemplate = false) {
  const images = [];
  for (const [key, bytes] of Object.entries(brandAssets || {})) {
    if (!bytes?.length) continue;
    try {
      const image = bytes[0] === 0x89 && bytes[1] === 0x50
        ? await pdf.embedPng(bytes)
        : bytes[0] === 0xff && bytes[1] === 0xd8
          ? await pdf.embedJpg(bytes)
          : null;
      if (image) images.push([key, image]);
    } catch { /* Invalid/unsupported image data is skipped; uploads are MIME validated. */ }
  }
  if (!pages.length) return;
  for (const [key, image] of images) {
    const page = pages[0];
    const { width, height } = page.getSize();
    const maxWidth = width * (customTemplate ? 0.11 : 0.095);
    const maxHeight = height * (customTemplate ? 0.16 : 0.13);
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const x = key === "logo" ? width * 0.075 : width * 0.71;
    const y = key === "logo" ? height * 0.80 : height * 0.16;
    page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });
  }
}

async function fillCertificate(templateBytes, values, brandAssets = {}) {
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm();
  const available = new Set(form.getFields().map((field) => field.getName()));
  for (const [name, value] of Object.entries(values)) {
    if (available.has(name)) {
      try { form.getTextField(name).setText(String(value || "")); }
      catch (error) {
        if (REQUIRED_FIELDS.includes(name)) throw error;
      }
    }
  }
  form.flatten();
  await embedBrandImages(pdf, pdf.getPages(), brandAssets, true);
  return Buffer.from(await pdf.save());
}

const safeText = (value) => String(value ?? "").replace(/[^\x20-\x7E\xA0-\xFF]/g, " ").trim();

async function createDefaultCertificate(values, brandAssets = {}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const maroon = rgb(0.36, 0.06, 0.19);
  const rose = rgb(0.55, 0.10, 0.29);
  const muted = rgb(0.39, 0.34, 0.36);
  const gold = rgb(0.72, 0.57, 0.34);
  const centerAt = (text, x, y, font, size, color = maroon) => {
    const value = safeText(text);
    let fittedSize = size;
    const maxWidth = Math.min(740, x - 48, 794 - x);
    while (font.widthOfTextAtSize(value, fittedSize) > maxWidth && fittedSize > 10) fittedSize -= 1;
    page.drawText(value, { x: Math.max(48, x - font.widthOfTextAtSize(value, fittedSize) / 2), y, size: fittedSize, font, color });
  };
  const center = (text, y, font, size, color = maroon) => centerAt(text, 421, y, font, size, color);

  page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 18, y: 18, width: 806, height: 559, borderColor: maroon, borderWidth: 1.5 });
  page.drawRectangle({ x: 25, y: 25, width: 792, height: 545, borderColor: gold, borderWidth: 0.7 });
  page.drawRectangle({ x: 42, y: 531, width: 758, height: 4, color: maroon });

  center(values.company_name || "Your Organisation", 496, bold, 17, maroon);
  await embedBrandImages(pdf, [page], { logo: brandAssets.logo }, false);
  if (values.company_address) center(values.company_address, 477, regular, 9, muted);
  center("CERTIFICATE OF COMPLETION", 420, serifBold, 32, maroon);
  center("This certificate is proudly presented to", 383, serif, 16, muted);
  center(values.employee_name, 337, serifBold, 29, rose);
  page.drawLine({ start: { x: 220, y: 323 }, end: { x: 622, y: 323 }, thickness: 1, color: gold });
  center("for successfully completing the training programme", 294, regular, 14, muted);
  center(values.training_name, 258, bold, 21, maroon);
  center(`Delivered by ${values.trainer_name}`, 225, regular, 12, muted);
  center(`LEVELS ACHIEVED  ${values.learning_levels || "L1, L2, L3"}`, 201, bold, 10, rose);

  page.drawLine({ start: { x: 90, y: 145 }, end: { x: 752, y: 145 }, thickness: 0.6, color: rgb(0.88, 0.84, 0.85) });
  page.drawText(`COMPLETED  ${safeText(values.completion_date)}`, { x: 98, y: 119, size: 10, font: bold, color: maroon });
  page.drawText(`ISSUED  ${safeText(values.issue_date)}`, { x: 98, y: 99, size: 10, font: regular, color: muted });
  if (values.valid_until && values.valid_until !== "No expiry") page.drawText(`VALID UNTIL  ${safeText(values.valid_until)}`, { x: 98, y: 80, size: 9, font: regular, color: muted });
  if (brandAssets.signature?.length) {
    const signature = brandAssets.signature[0] === 0x89 && brandAssets.signature[1] === 0x50
      ? await pdf.embedPng(brandAssets.signature)
      : brandAssets.signature[0] === 0xff && brandAssets.signature[1] === 0xd8
        ? await pdf.embedJpg(brandAssets.signature)
        : null;
    if (signature) {
      const scale = Math.min(140 / signature.width, 42 / signature.height);
      page.drawImage(signature, { x: 587, y: 111, width: signature.width * scale, height: signature.height * scale });
    }
  }
  page.drawLine({ start: { x: 575, y: 112 }, end: { x: 740, y: 112 }, thickness: 0.8, color: maroon });
  centerAt(values.signatory_name || "Authorised Signatory", 657, 91, bold, 11, maroon);
  centerAt(values.signatory_title || "Human Resources", 657, 75, regular, 9, muted);
  page.drawText(`Certificate ID  ${safeText(values.certificate_id)}`, { x: 98, y: 49, size: 8, font: regular, color: muted });
  return Buffer.from(await pdf.save());
}

module.exports = { REQUIRED_FIELDS, validateTemplate, fillCertificate, createDefaultCertificate };
