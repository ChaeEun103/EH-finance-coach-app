import multer from "multer";
import fetch from "node-fetch";

const upload = multer({
  storage: multer.memoryStorage(),
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      message: "POST만 가능합니다.",
    });
  }

  try {
    await runMiddleware(req, res, upload.single("image"));

    if (!req.file) {
      return res.status(400).json({
        message: "이미지가 없습니다.",
      });
    }

    if (!process.env.CLOVA_OCR_URL || !process.env.CLOVA_OCR_SECRET) {
      return res.status(500).json({
        message: "CLOVA OCR 환경변수가 설정되지 않았습니다.",
      });
    }

    const base64Image = req.file.buffer.toString("base64");

    const fileFormat = req.file.mimetype.includes("png") ? "png" : "jpg";

    const response = await fetch(process.env.CLOVA_OCR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OCR-SECRET": process.env.CLOVA_OCR_SECRET,
      },
      body: JSON.stringify({
        version: "V2",
        requestId: String(Date.now()),
        timestamp: Date.now(),
        images: [
          {
            format: fileFormat,
            name: "receipt",
            data: base64Image,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("OCR error:", error);

    return res.status(500).json({
      message: "OCR 분석 중 오류가 발생했습니다.",
    });
  }
}