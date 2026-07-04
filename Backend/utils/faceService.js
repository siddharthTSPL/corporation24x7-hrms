const axios = require("axios");

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || "http://localhost:8000";

// Sends a base64 image to the Python microservice and gets back a
// 512-number "embedding" — a numeric fingerprint of that face.
const getEmbedding = async (imageBase64) => {
  let data;
  try {
    const response = await axios.post(
      `${FACE_SERVICE_URL}/embed`,
      { image_base64: imageBase64 },
      { timeout: 10000 }
    );
    data = response.data;
  } catch (err) {
    const error = new Error("Face recognition service unavailable");
    error.statusCode = 503;
    throw error;
  }

  if (data.error) {
    const message =
      data.error === "no_face_detected"
        ? "No face detected in image, please try again"
        : data.error === "invalid_image"
        ? "Image could not be read"
        : data.error;
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }

  return data.embedding;
};

// Cosine similarity: 1.0 = identical direction (same face), 0 = unrelated.
// This is how we compare a live scan against every stored employee embedding.
const cosineSimilarity = (a, b) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

module.exports = { getEmbedding, cosineSimilarity };
