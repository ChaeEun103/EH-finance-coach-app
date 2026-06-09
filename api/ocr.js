import fetch from "node-fetch";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function getBoundary(contentType) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return match ? match[1] || match[2] : null;
}

function parseMultipartImage(buffer, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];

  let start = buffer.indexOf(boundaryBuffer);

  while (start !== -1) {
    const next = buffer.indexOf(boundaryBuffer, start + boundaryBuffer.length);

    if (next === -1) break;

    parts.push(buffer.slice(start + boundaryBuffer.length, next));
    start = next;
  }

  for (const part of parts) {
    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));

    if (headerEnd === -1) continue;

    const header = part.slice(0, headerEnd).toString("utf8");
    const body = part.slice(headerEnd + 4, part.length - 2);

    if (header.includes('name="image"')) {
      const filenameMatch = header.match(/filename="([^"]+)"/);
      const contentTypeMatch = header.match(/Content-Type:\s*([^\r\n]+)/i);

      return {
        buffer: body,
        filename: filenameMatch ? filenameMatch[1] : "receipt.jpg",
        mimetype: contentTypeMatch ? contentTypeMatch[1].trim() : "image/jpeg",
      };
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      message: "POST만 가능합니다.",
    });
  }

  try {
    if (!process.env.CLOVA_OCR_URL || !process.env.CLOVA_OCR_SECRET) {
      return res.status(500).json({
        message: "CLOVA OCR 환경변수가 설정되지 않았습니다.",
      });
    }

    const contentType = req.headers["content-type"] || "";
    const boundary = getBoundary(contentType);

    if (!boundary) {
      return res.status(400).json({
        message: "multipart/form-data boundary를 찾을 수 없습니다.",
      });
    }

    const rawBody = await readRawBody(req);
    const imageFile = parseMultipartImage(rawBody, boundary);

    if (!imageFile) {
      return res.status(400).json({
        message: "image 파일을 찾을 수 없습니다.",
      });
    }

    const base64Image = imageFile.buffer.toString("base64");

    const fileFormat = imageFile.mimetype.includes("png") ? "png" : "jpg";

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
      return res.status(response.status).json({
        message: "CLOVA OCR 요청 실패",
        status: response.status,
        data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      message: "OCR 분석 중 오류가 발생했습니다.",
      error: error?.message || String(error),
    });
  }
}