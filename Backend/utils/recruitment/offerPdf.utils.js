const { PDFDocument, StandardFonts, rgb, degrees } = require("pdf-lib");
const axios = require("axios");
const { getTemplate } = require("./offerTemplates.utils");
const { resolveSections } = require("./offerPlaceholders.utils");

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = { left: 56, right: 56, top: 50, bottom: 70 };
const CONTENT_W = PAGE_W - M.left - M.right;

const hexToRgb = (hex) => {
  const h = String(hex || "#000000").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  const n = parseInt(full.slice(0, 6), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

const tint = (hex, amount) => {
  const h = String(hex || "#000000").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  const n = parseInt(full.slice(0, 6), 16);
  const mix = (c) => (c + (255 - c) * amount) / 255;
  return rgb(mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255));
};

const sanitize = (t) =>
  String(t ?? "")
    .replace(/\u20B9/g, "Rs. ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2022\u25CF]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\t/g, "    ")
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "");

const fetchImage = async (url) => {
  if (!url) return null;
  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 8000, maxContentLength: 4 * 1024 * 1024 });
    return Buffer.from(res.data);
  } catch {
    return null;
  }
};

const embedImage = async (pdf, bytes) => {
  if (!bytes || bytes.length < 4) return null;
  try {
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await pdf.embedPng(bytes);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
  return null;
};

const fmtNum = (n) => Math.round(Number(n) || 0).toLocaleString("en-IN");

const fmtDateTimeIst = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
};

class LetterWriter {
  constructor({ pdf, fonts, theme, letter, kind, logo, signature, ctx }) {
    this.pdf = pdf;
    this.f = fonts;
    this.t = theme;
    this.letter = letter;
    this.kind = kind;
    this.logo = logo;
    this.signature = signature;
    this.ctx = ctx;
    this.accent = hexToRgb(theme.accent);
    this.secondary = hexToRgb(theme.secondary);
    this.ink = rgb(0.13, 0.13, 0.15);
    this.page = null;
    this.y = 0;
    this.pageCount = 0;
    this.sectionNo = 0;
  }

  width(text, font, size) {
    return font.widthOfTextAtSize(sanitize(text), size);
  }

  wrap(text, font, size, maxWidth) {
    const out = [];
    const paragraphs = sanitize(text).split("\n");
    paragraphs.forEach((para) => {
      const words = para.split(" ");
      let line = "";
      words.forEach((word) => {
        const trial = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
          line = trial;
          return;
        }
        if (line) out.push(line);
        if (font.widthOfTextAtSize(word, size) <= maxWidth) {
          line = word;
        } else {
          let chunk = "";
          word.split("").forEach((ch) => {
            if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
              out.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          });
          line = chunk;
        }
      });
      out.push(line);
    });
    return out;
  }

  text(str, x, y, { font, size = 10, color } = {}) {
    this.page.drawText(sanitize(str), { x, y, size, font: font || this.f.regular, color: color || this.ink });
  }

  rect(x, y, w, h, { fill, border, borderWidth = 0.6 } = {}) {
    this.page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: border ? borderWidth : 0 });
  }

  line(x1, y1, x2, y2, color, thickness = 0.6) {
    this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
  }

  drawBorder() {
    if (this.t.border === "double") {
      this.rect(20, 20, PAGE_W - 40, PAGE_H - 40, { border: this.accent, borderWidth: 1.6 });
      this.rect(26, 26, PAGE_W - 52, PAGE_H - 52, { border: this.secondary, borderWidth: 0.5 });
    } else if (this.t.border === "thin") {
      this.rect(24, 24, PAGE_W - 48, PAGE_H - 48, { border: this.accent, borderWidth: 0.7 });
    }
  }

  fitImage(img, maxW, maxH) {
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    return { w: img.width * scale, h: img.height * scale };
  }

  newPage() {
    this.page = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.pageCount += 1;
    this.drawBorder();
    this.y = PAGE_H - M.top;
    if (this.pageCount === 1) this.firstHeader();
    else this.compactHeader();
  }

  company() {
    return this.letter.company || {};
  }

  addressLine() {
    const c = this.company();
    return [c.address, c.phone && `Ph: ${c.phone}`, c.email, c.website].filter(Boolean).join("  |  ");
  }

  firstHeader() {
    const c = this.company();
    const style = this.t.header;
    const name = c.name || "";
    const nameFont = this.f.bold;

    if (style === "band") {
      const bandH = 78;
      this.rect(0, PAGE_H - bandH, PAGE_W, bandH, { fill: this.accent });
      let textX = M.left;
      if (this.logo) {
        const { w, h } = this.fitImage(this.logo, 120, 46);
        this.rect(M.left - 6, PAGE_H - bandH / 2 - h / 2 - 6, w + 12, h + 12, { fill: rgb(1, 1, 1) });
        this.page.drawImage(this.logo, { x: M.left, y: PAGE_H - bandH / 2 - h / 2, width: w, height: h });
        textX = M.left + w + 24;
      }
      this.text(name, textX, PAGE_H - bandH / 2 - 5, { font: nameFont, size: 18, color: rgb(1, 1, 1) });
      this.y = PAGE_H - bandH - 18;
      const addr = this.wrap(this.addressLine(), this.f.regular, 8, CONTENT_W);
      addr.forEach((ln) => {
        this.text(ln, M.left, this.y, { size: 8, color: this.secondary });
        this.y -= 11;
      });
      this.y -= 8;
    } else if (style === "left") {
      let textX = M.left;
      let topY = this.y;
      let blockH = 40;
      if (this.logo) {
        const { w, h } = this.fitImage(this.logo, 110, 52);
        this.page.drawImage(this.logo, { x: M.left, y: topY - h, width: w, height: h });
        textX = M.left + w + 16;
        blockH = Math.max(blockH, h);
      }
      this.text(name, textX, topY - 16, { font: nameFont, size: 17, color: this.accent });
      const addr = this.wrap(this.addressLine(), this.f.regular, 8, PAGE_W - M.right - textX);
      let ay = topY - 30;
      addr.forEach((ln) => {
        this.text(ln, textX, ay, { size: 8, color: this.secondary });
        ay -= 11;
      });
      this.y = Math.min(topY - blockH, ay) - 8;
      this.rect(M.left, this.y, CONTENT_W, 3, { fill: this.accent });
      this.y -= 18;
    } else if (style === "minimal") {
      const nm = name.toUpperCase();
      const w = this.width(nm, nameFont, 13);
      this.text(nm, (PAGE_W - w) / 2, this.y - 12, { font: nameFont, size: 13 });
      this.y -= 24;
      const addr = this.wrap(this.addressLine(), this.f.regular, 8, CONTENT_W);
      addr.forEach((ln) => {
        const lw = this.width(ln, this.f.regular, 8);
        this.text(ln, (PAGE_W - lw) / 2, this.y, { size: 8, color: this.secondary });
        this.y -= 11;
      });
      this.y -= 4;
      this.line(M.left, this.y, PAGE_W - M.right, this.y, this.accent, 1.2);
      this.y -= 20;
    } else {
      const framed = style === "framed";
      if (framed) this.y -= 10;
      if (this.logo) {
        const { w, h } = this.fitImage(this.logo, 150, 54);
        this.page.drawImage(this.logo, { x: (PAGE_W - w) / 2, y: this.y - h, width: w, height: h });
        this.y -= h + 8;
      }
      const label = framed ? name.toUpperCase() : name;
      const size = framed ? 15 : 17;
      const w = this.width(label, nameFont, size);
      this.text(label, (PAGE_W - w) / 2, this.y - size, { font: nameFont, size, color: this.accent });
      this.y -= size + 8;
      const addr = this.wrap(this.addressLine(), this.f.regular, 8, CONTENT_W);
      addr.forEach((ln) => {
        const lw = this.width(ln, this.f.regular, 8);
        this.text(ln, (PAGE_W - lw) / 2, this.y - 6, { size: 8, color: this.secondary });
        this.y -= 11;
      });
      this.y -= 6;
      if (framed) {
        this.line(M.left, this.y, PAGE_W - M.right, this.y, this.secondary, 0.5);
        this.line(M.left, this.y - 3, PAGE_W - M.right, this.y - 3, this.accent, 1.4);
        this.y -= 22;
      } else {
        this.line(M.left, this.y, PAGE_W - M.right, this.y, this.accent, 1.2);
        this.y -= 20;
      }
    }
  }

  compactHeader() {
    const c = this.company();
    this.text(c.name || "", M.left, this.y - 8, { font: this.f.bold, size: 9, color: this.accent });
    const ref = `Ref: ${this.letter.ref_no || ""}`;
    const rw = this.width(ref, this.f.regular, 8.5);
    this.text(ref, PAGE_W - M.right - rw, this.y - 8, { size: 8.5, color: this.secondary });
    this.y -= 16;
    this.line(M.left, this.y, PAGE_W - M.right, this.y, this.secondary, 0.5);
    this.y -= 18;
  }

  ensure(h) {
    if (this.y - h < M.bottom) this.newPage();
  }

  gap(h) {
    this.y -= h;
  }

  paragraph(str, { size = 10.5, font, color, indent = 0, after = 6, width = CONTENT_W - indent, x = M.left + indent } = {}) {
    const fnt = font || this.f.regular;
    const lh = size * 1.45;
    const lines = this.wrap(str, fnt, size, width);
    lines.forEach((ln) => {
      this.ensure(lh);
      this.text(ln, x, this.y - size, { font: fnt, size, color });
      this.y -= lh;
    });
    this.y -= after;
  }

  keyValueRow(key, value, size = 10.5) {
    const lh = size * 1.45;
    const keyW = 132;
    const x = M.left + 10;
    const valLines = this.wrap(value, this.f.regular, size, CONTENT_W - 10 - keyW);
    this.ensure(lh * Math.max(1, valLines.length));
    this.text(key, x, this.y - size, { font: this.f.bold, size });
    valLines.forEach((ln, i) => {
      this.text(ln, x + keyW, this.y - size - i * lh, { size });
    });
    this.y -= lh * Math.max(1, valLines.length);
  }

  bullet(str, size = 10.5) {
    const lh = size * 1.45;
    const kv = str.match(/^([^:]{2,30}):\s+(.+)$/);
    if (kv) return this.keyValueRow(kv[1], kv[2], size);
    const lines = this.wrap(str, this.f.regular, size, CONTENT_W - 22);
    lines.forEach((ln, i) => {
      this.ensure(lh);
      if (i === 0) this.page.drawCircle({ x: M.left + 12, y: this.y - size * 0.62, size: 1.6, color: this.accent });
      this.text(ln, M.left + 22, this.y - size, { size });
      this.y -= lh;
    });
  }

  heading(title) {
    if (!title) return;
    this.sectionNo += 1;
    const style = this.t.heading;
    this.ensure(64);
    this.gap(4);
    if (style === "underline") {
      this.text(title, M.left, this.y - 12, { font: this.f.bold, size: 12, color: this.accent });
      this.y -= 18;
      this.line(M.left, this.y, PAGE_W - M.right, this.y, this.secondary, 0.5);
      this.y -= 9;
    } else if (style === "bar") {
      this.rect(M.left, this.y - 14, 3.5, 15, { fill: this.accent });
      this.text(title, M.left + 11, this.y - 11, { font: this.f.bold, size: 12, color: this.accent });
      this.y -= 24;
    } else if (style === "smallcaps") {
      this.text(title.toUpperCase(), M.left, this.y - 11, { font: this.f.bold, size: 10.5, color: this.accent });
      this.y -= 16;
      this.line(M.left, this.y, M.left + 64, this.y, this.secondary, 1.6);
      this.y -= 10;
    } else if (style === "pill") {
      this.rect(M.left, this.y - 20, CONTENT_W, 20, { fill: tint(this.t.accent, 0.9) });
      this.rect(M.left, this.y - 20, 4, 20, { fill: this.accent });
      this.text(title, M.left + 12, this.y - 14, { font: this.f.bold, size: 11, color: this.accent });
      this.y -= 30;
    } else {
      this.text(`${this.sectionNo}.  ${title}`, M.left, this.y - 12, { font: this.f.bold, size: 11.5, color: this.ink });
      this.y -= 22;
    }
  }

  body(str) {
    const lines = String(str || "").split("\n");
    let buffer = [];
    const flush = () => {
      if (!buffer.length) return;
      this.paragraph(buffer.join(" "), { after: 6 });
      buffer = [];
    };
    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line) {
        flush();
        return;
      }
      if (/^[-*]\s+/.test(line)) {
        flush();
        this.bullet(line.replace(/^[-*]\s+/, ""));
        return;
      }
      buffer.push(line);
    });
    flush();
    this.gap(4);
  }

  titleBlock(subject) {
    const label = this.kind === "APPOINTMENT" ? "LETTER OF APPOINTMENT" : "OFFER OF EMPLOYMENT";
    const w = this.width(label, this.f.bold, 13);
    this.text(label, (PAGE_W - w) / 2, this.y - 13, { font: this.f.bold, size: 13, color: this.accent });
    this.y -= 26;

    const refText = `Ref No: ${this.letter.ref_no || ""}`;
    const dateText = `Date: ${this.ctx.letter_date || ""}`;
    this.text(refText, M.left, this.y - 10, { font: this.f.bold, size: 10 });
    const dw = this.width(dateText, this.f.bold, 10);
    this.text(dateText, PAGE_W - M.right - dw, this.y - 10, { font: this.f.bold, size: 10 });
    this.y -= 24;

    this.text("To,", M.left, this.y - 10, { size: 10.5 });
    this.y -= 15;
    this.text(this.ctx.candidate_name, M.left, this.y - 10, { font: this.f.bold, size: 11 });
    this.y -= 14;
    [this.ctx.candidate_email, this.ctx.candidate_phone].filter(Boolean).forEach((v) => {
      this.text(v, M.left, this.y - 10, { size: 9.5, color: this.secondary });
      this.y -= 13;
    });
    this.y -= 8;

    this.paragraph(`Subject: ${subject}`, { font: this.f.bold, size: 11, after: 10 });
  }

  signatureBlock() {
    this.ensure(150);
    this.gap(6);
    this.paragraph("Yours sincerely,", { after: 2 });
    this.paragraph(`For ${this.ctx.company_name}`, { font: this.f.bold, after: 4 });
    if (this.signature) {
      const { w, h } = this.fitImage(this.signature, 150, 48);
      this.page.drawImage(this.signature, { x: M.left, y: this.y - h, width: w, height: h });
      this.y -= h + 4;
    } else {
      this.y -= 34;
    }
    this.line(M.left, this.y, M.left + 170, this.y, this.secondary, 0.6);
    this.y -= 4;
    this.text(this.ctx.signatory_name || "Authorised Signatory", M.left, this.y - 11, { font: this.f.bold, size: 10.5 });
    this.y -= 15;
    if (this.ctx.signatory_designation) {
      this.text(this.ctx.signatory_designation, M.left, this.y - 10, { size: 10, color: this.secondary });
      this.y -= 14;
    }
    this.gap(12);
  }

  acceptanceBlock(acceptance) {
    const isOffer = this.kind === "OFFER";
    const heading = isOffer ? "ACCEPTANCE OF OFFER" : "ACKNOWLEDGEMENT BY EMPLOYEE";
    const statement = isOffer
      ? `I, ${this.ctx.candidate_name}, have read and understood the terms of this offer and hereby accept the position of ${this.ctx.designation}.`
      : `I, ${this.ctx.candidate_name}, have read and understood the terms of this appointment letter and agree to abide by them.`;
    const stmtLines = this.wrap(statement, this.f.regular, 10, CONTENT_W - 24);
    const boxH = 34 + stmtLines.length * 14 + (acceptance ? 40 : 34);
    this.ensure(boxH + 10);
    const top = this.y;
    this.rect(M.left, top - boxH, CONTENT_W, boxH, { fill: tint(this.t.accent, 0.95), border: this.secondary, borderWidth: 0.6 });
    this.text(heading, M.left + 12, top - 20, { font: this.f.bold, size: 10.5, color: this.accent });
    let cy = top - 36;
    stmtLines.forEach((ln) => {
      this.text(ln, M.left + 12, cy - 4, { size: 10 });
      cy -= 14;
    });
    cy -= 8;
    if (acceptance) {
      this.text(`Digitally accepted on ${fmtDateTimeIst(acceptance.at)} IST`, M.left + 12, cy - 4, { font: this.f.bold, size: 10, color: rgb(0.02, 0.45, 0.25) });
      cy -= 14;
      this.text(`Verified via secure link | IP: ${acceptance.ip || "n/a"}`, M.left + 12, cy - 4, { size: 8.5, color: this.secondary });
    } else {
      this.text("Signature:", M.left + 12, cy - 10, { size: 10 });
      this.line(M.left + 66, cy - 12, M.left + 220, cy - 12, this.secondary, 0.6);
      this.text("Date:", M.left + 244, cy - 10, { size: 10 });
      this.line(M.left + 276, cy - 12, M.left + 380, cy - 12, this.secondary, 0.6);
      this.text("Place:", M.left + 396, cy - 10, { size: 10 });
      this.line(M.left + 430, cy - 12, PAGE_W - M.right - 12, cy - 12, this.secondary, 0.6);
    }
    this.y = top - boxH - 10;
  }

  annexure() {
    const ctc = this.letter.ctc || {};
    const comps = ctc.components || [];
    if (!comps.length) return;
    this.newPage();
    const title = "ANNEXURE A - COMPENSATION STRUCTURE";
    const tw = this.width(title, this.f.bold, 12);
    this.text(title, (PAGE_W - tw) / 2, this.y - 12, { font: this.f.bold, size: 12, color: this.accent });
    this.y -= 22;
    const sub = `Employee: ${this.ctx.candidate_name}   |   Designation: ${this.ctx.designation}`;
    const sw = this.width(sub, this.f.regular, 9.5);
    this.text(sub, (PAGE_W - sw) / 2, this.y - 8, { size: 9.5, color: this.secondary });
    this.y -= 26;

    const colW = [CONTENT_W - 200, 100, 100];
    const rowH = 21;
    const style = this.t.table;
    const cellPad = 8;
    let stripe = false;

    const drawRow = (cells, { header = false, total = false, group = false } = {}) => {
      this.ensure(rowH + 4);
      const top = this.y;
      const y = top - rowH;
      let fill;
      if (header) fill = this.accent;
      else if (total) fill = tint(this.t.accent, 0.86);
      else if (group) fill = tint(this.t.accent, 0.94);
      else if (style === "zebra" && stripe) fill = rgb(0.972, 0.972, 0.98);
      if (!header && !total && !group) stripe = !stripe;
      const border = style === "grid" || style === "box" ? this.secondary : undefined;
      if (fill || border) {
        this.rect(M.left, y, CONTENT_W, rowH, { fill, border: style === "grid" ? border : undefined, borderWidth: 0.5 });
      }
      if (style === "grid") {
        this.line(M.left + colW[0], y, M.left + colW[0], top, this.secondary, 0.5);
        this.line(M.left + colW[0] + colW[1], y, M.left + colW[0] + colW[1], top, this.secondary, 0.5);
      }
      if (style === "box" || style === "zebra") {
        this.line(M.left, y, PAGE_W - M.right, y, style === "box" ? this.secondary : rgb(0.9, 0.9, 0.93), 0.4);
      }
      const font = header || total || group ? this.f.bold : this.f.regular;
      const color = header ? rgb(1, 1, 1) : this.ink;
      const size = 9.5;
      this.text(cells[0], M.left + cellPad, y + 7, { font, size, color });
      if (cells[1] !== undefined) {
        const w1 = this.width(cells[1], font, size);
        this.text(cells[1], M.left + colW[0] + colW[1] - cellPad - w1, y + 7, { font, size, color });
      }
      if (cells[2] !== undefined) {
        const w2 = this.width(cells[2], font, size);
        this.text(cells[2], M.left + CONTENT_W - cellPad - w2, y + 7, { font, size, color });
      }
      this.y = y;
    };

    drawRow(["Component", "Per Month (Rs.)", "Per Annum (Rs.)"], { header: true });
    const earnings = comps.filter((c) => c.type === "earning");
    const variable = comps.filter((c) => c.type === "variable");
    const employer = comps.filter((c) => c.type === "employer");
    const deductions = comps.filter((c) => c.type === "deduction");

    drawRow(["A. Fixed Earnings"], { group: true });
    earnings.forEach((c) => drawRow([c.label, fmtNum(c.monthly), fmtNum(c.annual)]));
    drawRow(["Gross Fixed Pay (A)", fmtNum(ctc.gross_fixed_monthly), fmtNum(ctc.gross_fixed_annual)], { total: true });

    let letterIdx = "B";
    let variableTotal = 0;
    if (variable.length) {
      drawRow([`${letterIdx}. Variable Pay`], { group: true });
      variable.forEach((c) => {
        variableTotal += c.annual;
        drawRow([c.label, "-", fmtNum(c.annual)]);
      });
      letterIdx = "C";
    }
    let employerTotal = 0;
    if (employer.length) {
      drawRow([`${letterIdx}. Employer Contributions and Benefits`], { group: true });
      employer.forEach((c) => {
        employerTotal += c.annual;
        drawRow([c.label, fmtNum(c.monthly), fmtNum(c.annual)]);
      });
    }
    const totalAnnual = ctc.gross_fixed_annual + variableTotal + employerTotal;
    drawRow(["Total Cost to Company (CTC)", fmtNum(Math.round(totalAnnual / 12)), fmtNum(totalAnnual)], { total: true });

    if (deductions.length) {
      this.gap(12);
      drawRow(["Employee Statutory Deductions (Indicative)"], { group: true });
      deductions.forEach((c) => drawRow([c.label, fmtNum(c.monthly), fmtNum(c.annual)]));
      drawRow(["Estimated Net Take-home (before income tax)", fmtNum(ctc.net_take_home_monthly), fmtNum(ctc.net_take_home_annual)], { total: true });
    }

    this.gap(14);
    this.paragraph(
      "Notes: Figures are in Indian Rupees. Variable pay, if any, is paid subject to company and individual performance. Deductions shown are indicative; actual deductions including income tax (TDS) will be as per applicable law and your investment declarations. Gratuity is payable as per the Payment of Gratuity Act, 1972.",
      { size: 8.5, color: this.secondary, font: this.f.italic }
    );
  }

  footers(watermark) {
    const pages = this.pdf.getPages();
    const total = pages.length;
    const c = this.company();
    pages.forEach((page, i) => {
      this.page = page;
      const y = 40;
      if (this.t.footer === "line") this.line(M.left, y + 14, PAGE_W - M.right, y + 14, this.secondary, 0.5);
      const left = `${c.name || ""}${c.website ? `  |  ${c.website}` : ""}`;
      this.text(left, M.left, y, { size: 8, color: this.secondary });
      const right = `Page ${i + 1} of ${total}`;
      const rw = this.width(right, this.f.regular, 8);
      this.text(right, PAGE_W - M.right - rw, y, { size: 8, color: this.secondary });
      const conf = "Private and Confidential";
      const cw = this.width(conf, this.f.italic, 8);
      this.text(conf, (PAGE_W - cw) / 2, y, { font: this.f.italic, size: 8, color: this.secondary });
      if (watermark) {
        const label = watermark;
        const size = 110;
        const w = this.f.bold.widthOfTextAtSize(label, size);
        page.drawText(label, {
          x: PAGE_W / 2 - (w / 2) * Math.cos(Math.PI / 4) + (size / 2) * Math.sin(Math.PI / 4) * 0.5,
          y: PAGE_H / 2 - (w / 2) * Math.sin(Math.PI / 4) - size * 0.2,
          size,
          font: this.f.bold,
          color: rgb(0.6, 0.6, 0.6),
          opacity: 0.12,
          rotate: degrees(45),
        });
      }
    });
  }
}

const loadFonts = async (pdf, family) => {
  if (family === "Times") {
    return {
      regular: await pdf.embedFont(StandardFonts.TimesRoman),
      bold: await pdf.embedFont(StandardFonts.TimesRomanBold),
      italic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
    };
  }
  return {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };
};

const generateLetterPdf = async ({ kind = "OFFER", letter, context, watermark = null, acceptance = null, preloaded = {} }) => {
  const base = getTemplate(letter.template_key);
  const theme = { ...base, accent: letter.accent_color || base.accent };

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${kind === "APPOINTMENT" ? "Appointment Letter" : "Offer Letter"} - ${context.candidate_name}`);
  pdf.setAuthor(context.company_name || "");
  pdf.setCreator("TorchX Talent");

  const fonts = await loadFonts(pdf, theme.font);
  const logoBytes = preloaded.logo !== undefined ? preloaded.logo : await fetchImage(letter.logo_url);
  const signBytes = preloaded.signature !== undefined ? preloaded.signature : await fetchImage(letter.signature_url);
  const logo = await embedImage(pdf, logoBytes);
  const signature = await embedImage(pdf, signBytes);

  const writer = new LetterWriter({ pdf, fonts, theme, letter, kind, logo, signature, ctx: context });
  writer.newPage();

  const subject = kind === "APPOINTMENT" ? `Appointment as ${context.designation}` : `Offer of Employment - ${context.designation}`;
  writer.titleBlock(subject);

  const { sections } = resolveSections(letter.sections, context);
  sections.forEach((s) => {
    writer.heading(s.title);
    writer.body(s.body);
  });

  writer.signatureBlock();
  writer.acceptanceBlock(acceptance);
  writer.annexure();
  writer.footers(watermark);

  return Buffer.from(await pdf.save());
};

module.exports = { generateLetterPdf, fetchImage };