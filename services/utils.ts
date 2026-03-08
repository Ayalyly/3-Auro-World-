export const sanitizePayload = (data: any): any => {
    if (data === undefined || data === null) return null;
    if (typeof data !== "object") return data;
    if (Array.isArray(data)) return data.map((item) => sanitizePayload(item));
    if (data instanceof Date) return data.getTime();
    if (Object.prototype.toString.call(data) !== "[object Object]") return null;

    const cleanObj: any = {};
    Object.keys(data).forEach((key) => {
      if (typeof data[key] === "function") return;
      const val = sanitizePayload(data[key]);
      if (val !== undefined) cleanObj[key] = val;
    });
    return cleanObj;
};

export const parseSystemTag = (text: string) => {
    // Regex robust hơn để bắt thẻ <system> bao gồm cả khoảng trắng/xuống dòng
    const systemMatch = text.match(/<system>([\s\S]*?)<\/system>/i);
    const cleanText = text.replace(/<system>[\s\S]*?<\/system>/gi, "").trim();
    let systemData = null;
    if (systemMatch && systemMatch[1]) {
        try {
            systemData = JSON.parse(systemMatch[1].trim());
        } catch (e) {
            console.error("Failed to parse system tag JSON:", e);
        }
    }
    return { cleanText, systemData };
};

export const compressBase64 = async (base64: string, maxWidth = 1200, quality = 0.9): Promise<string> => {
    if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image")) return base64;
    if (base64.length < 100 * 1024) return base64;

    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          const ratio = width / height;
          if (ratio > 1) {
            width = maxWidth;
            height = maxWidth / ratio;
          } else {
            height = maxWidth;
            width = maxWidth * ratio;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve(base64);
        }
      };
      img.onerror = () => {
        resolve(base64);
      };
    });
};
