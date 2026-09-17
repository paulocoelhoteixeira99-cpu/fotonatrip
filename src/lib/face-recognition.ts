import * as faceapi from "face-api.js";

let modelsLoaded = false;
let modelsLoading: Promise<void> | null = null;

export async function loadModels() {
  if (modelsLoaded) return;

  if (!modelsLoading) {
    modelsLoading = (async () => {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      modelsLoaded = true;
    })();
  }

  await modelsLoading;
}

export async function getEmbeddingFromFile(
  file: File
): Promise<Float32Array | null> {
  await loadModels();

  const img = await createImageFromFile(file);

  const detection = await faceapi
    .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  cleanupImage(img);

  if (!detection) {
    console.warn("No face detected in selfie");
    return null;
  }

  return detection.descriptor;
}

export async function getAllEmbeddingsFromFile(
  file: File
): Promise<{ descriptor: Float32Array; box: faceapi.Box }[]> {
  await loadModels();

  const img = await createImageFromFile(file);

  const detections = await faceapi
    .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  cleanupImage(img);

  console.log(`face-api.js detected ${detections.length} face(s)`);

  return detections.map((d) => ({
    descriptor: d.descriptor,
    box: d.detection.box,
  }));
}

function createImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Resize if too large (face-api.js struggles with huge images)
        const maxSize = 1600;
        if (img.width > maxSize || img.height > maxSize) {
          const canvas = document.createElement("canvas");
          const scale = maxSize / Math.max(img.width, img.height);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const resizedImg = new Image();
          resizedImg.onload = () => resolve(resizedImg);
          resizedImg.onerror = reject;
          resizedImg.src = canvas.toDataURL("image/jpeg");
        } else {
          resolve(img);
        }
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function cleanupImage(img: HTMLImageElement) {
  img.src = "";
}
