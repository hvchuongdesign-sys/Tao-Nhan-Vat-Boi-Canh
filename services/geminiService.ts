
import { GoogleGenAI, Modality } from "@google/genai";
import type { Character, Background } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // A simple alert for demonstration. In a real app, you might have a more robust error display.
  alert("API key is missing. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const fileToGenerativePart = (base64: string, mimeType: string) => {
    return {
        inlineData: {
            data: base64.split(',')[1],
            mimeType,
        },
    };
};

export const generateImageFromPrompt = async (prompt: string, style: string, type: 'character' | 'background'): Promise<string> => {
    const fullPrompt = type === 'character'
        ? `${prompt}, phong cách ${style}, nhân vật toàn thân, chỉ có nhân vật, nền trắng đơn giản, chi tiết cao, chất lượng 4k`
        : `${prompt}, phong cách ${style}, chỉ có phong cảnh, không có người hoặc động vật, bối cảnh chi tiết, chất lượng 4k`;

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        } else {
            throw new Error("Không thể tạo ảnh từ câu lệnh.");
        }
    } catch (error) {
        console.error("Lỗi khi tạo ảnh:", error);
        throw error;
    }
};

export const composeFinalImage = async (
  characters: Character[],
  background: Background,
  finalPrompt: string,
  style: string
): Promise<string> => {
  const selectedCharacters = characters.filter(c => c.selected && c.image);
  
  if (selectedCharacters.length === 0) {
    throw new Error("Vui lòng chọn ít nhất một nhân vật.");
  }
  if (!background.image) {
    throw new Error("Vui lòng cung cấp bối cảnh.");
  }

  const parts: any[] = [];
  let promptParts = [
      `Nhiệm vụ: Tạo một hình ảnh mới bằng cách tích hợp liền mạch các hình ảnh nhân vật được cung cấp vào hình ảnh bối cảnh.`,
      `Bối cảnh:`,
      `- Hình ảnh đầu tiên là bối cảnh.`,
  ];

  parts.push(fileToGenerativePart(background.image, 'image/jpeg'));

  selectedCharacters.forEach((char, index) => {
    promptParts.push(`- Hình ảnh ${index + 2} là Nhân vật ${String.fromCharCode(65 + index)}.`);
    parts.push(fileToGenerativePart(char.image!, 'image/jpeg'));
  });

  const compositionInstructions = background.useAsReference
      ? "Giữ nguyên bối cảnh và chỉ thay đổi nhân vật hoặc hành động của nhân vật theo mô tả."
      : "Kết hợp các nhân vật vào bối cảnh một cách tự nhiên.";

  promptParts.push(
      `Hướng dẫn cho ảnh cuối cùng:`,
      `- Mô tả cảnh: ${finalPrompt}`,
      `- Phong cách: Ảnh cuối cùng phải khớp với phong cách ${style} của các ảnh đầu vào.`,
      `- Bố cục: ${compositionInstructions}`,
      `- Tính chân thực và nhất quán: Đảm bảo ánh sáng, bóng đổ, phối cảnh và tỷ lệ của các nhân vật được điều chỉnh để phù hợp thực tế với bối cảnh. Các nhân vật phải trông như một phần tự nhiên của môi trường. Duy trì nhận dạng và ngoại hình của các nhân vật từ ảnh tham chiếu của họ.`,
      `- Xuất ra hình ảnh chất lượng cao, phân giải 4K.`
  );

  parts.unshift({ text: promptParts.join('\n') });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts },
      config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (imagePart?.inlineData) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    } else {
        throw new Error("Không nhận được ảnh từ API. Phản hồi văn bản: " + response.text);
    }
  } catch(error) {
    console.error("Lỗi khi tạo ảnh cuối cùng:", error);
    throw error;
  }
};
