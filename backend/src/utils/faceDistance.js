// backend/src/utils/faceDistance.js
export const euclideanDistance = (v1, v2) => {
  if (!Array.isArray(v1) || !Array.isArray(v2) || v1.length !== v2.length) {
    return Infinity;
  }
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};
