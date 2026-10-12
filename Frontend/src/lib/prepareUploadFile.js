const MAX_BYTES = 1.8 * 1024 * 1024;
const MAX_DIMENSION = 1800;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image"));
    };
    img.src = url;
  });

const toBlob = (canvas, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

export const prepareUploadFile = async (file) => {
  if (file.size <= MAX_BYTES) return file;

  if (!file.type.startsWith("image/")) {
    throw new Error("File size must be less than 2MB");
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let quality = 0.85;
  let blob = await toBlob(canvas, quality);
  while (blob && blob.size > MAX_BYTES && quality > 0.4) {
    quality -= 0.15;
    blob = await toBlob(canvas, quality);
  }

  if (!blob || blob.size > MAX_BYTES) {
    throw new Error("File size must be less than 2MB");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
};