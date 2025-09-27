
import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Character, Background, GeneratedImage } from './types';
import { IMAGE_STYLES, MAX_CHARACTERS } from './constants';
import { generateImageFromPrompt, composeFinalImage } from './services/geminiService';
import Spinner from './components/Spinner';
import ImagePreviewModal from './components/ImagePreviewModal';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const CharacterInput: React.FC<{
  character: Character;
  onUpdate: (id: string, updates: Partial<Character>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}> = ({ character, onUpdate, onRemove, canRemove }) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpdate(character.id, { isLoading: true });
      const base64 = await fileToBase64(e.target.files[0]);
      onUpdate(character.id, { image: base64, isLoading: false });
    }
  };

  const handleGenerate = async () => {
    if (!character.prompt) return;
    onUpdate(character.id, { isLoading: true });
    try {
      const imageUrl = await generateImageFromPrompt(character.prompt, character.style, 'character');
      onUpdate(character.id, { image: imageUrl });
    } catch (error) {
      alert(`Lỗi tạo ảnh nhân vật: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      onUpdate(character.id, { isLoading: false });
    }
  };

  return (
    <div className="bg-brand-secondary p-4 rounded-lg space-y-3 relative">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">Nhân vật</h3>
        {canRemove && (
          <button onClick={() => onRemove(character.id)} className="text-red-400 hover:text-red-300">&times;</button>
        )}
      </div>
      <div className="w-full h-40 bg-brand-light rounded-md flex items-center justify-center relative group">
        {character.isLoading ? <Spinner /> :
          character.image ? (
            <>
              <img src={character.image} alt="Nhân vật" className="w-full h-full object-contain rounded-md" />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <input type="checkbox" id={`char-select-${character.id}`} checked={character.selected} onChange={(e) => onUpdate(character.id, { selected: e.target.checked })} className="w-6 h-6 mr-2" />
                 <label htmlFor={`char-select-${character.id}`} className="text-white font-bold">Chọn</label>
              </div>
            </>
          ) : (
            <label htmlFor={`upload-char-${character.id}`} className="cursor-pointer text-brand-subtext hover:text-brand-text">
              + Tải ảnh lên
              <input id={`upload-char-${character.id}`} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          )}
      </div>
      <textarea
        placeholder="Nhập câu lệnh tạo ảnh"
        value={character.prompt}
        onChange={(e) => onUpdate(character.id, { prompt: e.target.value })}
        className="w-full bg-brand-light p-2 rounded-md h-20 resize-none text-sm"
      />
      {character.prompt && (
        <button onClick={handleGenerate} disabled={character.isLoading} className="w-full bg-brand-accent text-white py-2 rounded-md hover:bg-blue-500 transition-colors disabled:bg-brand-light">
          {character.isLoading ? "Đang tạo..." : "Tạo ảnh nhân vật"}
        </button>
      )}
      <select
        value={character.style}
        onChange={(e) => onUpdate(character.id, { style: e.target.value })}
        className="w-full bg-brand-light p-2 rounded-md text-sm"
      >
        {IMAGE_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
};


const BackgroundInput: React.FC<{
  background: Background;
  onUpdate: (updates: Partial<Background>) => void;
  style: string;
}> = ({ background, onUpdate, style }) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpdate({ isLoading: true });
      const base64 = await fileToBase64(e.target.files[0]);
      onUpdate({ image: base64, isLoading: false });
    }
  };

  const handleGenerate = async () => {
    if (!background.prompt) return;
    onUpdate({ isLoading: true });
    try {
      const imageUrl = await generateImageFromPrompt(background.prompt, style, 'background');
      onUpdate({ image: imageUrl });
    } catch (error) {
       alert(`Lỗi tạo ảnh bối cảnh: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      onUpdate({ isLoading: false });
    }
  };

  return (
    <div className="bg-brand-secondary p-4 rounded-lg space-y-3">
      <h3 className="font-bold">Bối cảnh tham chiếu</h3>
      <div className="w-full h-40 bg-brand-light rounded-md flex items-center justify-center relative">
        {background.isLoading ? <Spinner /> :
          background.image ? (
            <img src={background.image} alt="Bối cảnh" className="w-full h-full object-cover rounded-md" />
          ) : (
            <label htmlFor="upload-bg" className="cursor-pointer text-brand-subtext hover:text-brand-text">
              + Tải ảnh lên
              <input id="upload-bg" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          )}
      </div>
      <textarea
        placeholder="Nhập câu lệnh tạo ảnh bối cảnh"
        value={background.prompt}
        onChange={(e) => onUpdate({ prompt: e.target.value })}
        className="w-full bg-brand-light p-2 rounded-md h-20 resize-none text-sm"
      />
      {background.prompt && (
        <button onClick={handleGenerate} disabled={background.isLoading} className="w-full bg-brand-accent text-white py-2 rounded-md hover:bg-blue-500 transition-colors disabled:bg-brand-light">
          {background.isLoading ? "Đang tạo..." : "Tạo ảnh bối cảnh"}
        </button>
      )}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="use-bg-ref"
          checked={background.useAsReference}
          onChange={(e) => onUpdate({ useAsReference: e.target.checked })}
          className="w-4 h-4"
        />
        <label htmlFor="use-bg-ref" className="text-sm">Chọn bối cảnh</label>
      </div>
    </div>
  );
};

const ResultImage: React.FC<{ 
  image: GeneratedImage;
  onDelete: (id: string) => void;
  onPreview: (src: string) => void;
}> = ({ image, onDelete, onPreview }) => {
    return (
        <div className="relative group aspect-square">
            <img src={image.src} alt="Kết quả" className="w-full h-full object-cover rounded-lg shadow-md" />
            <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-2 space-y-2">
                <button onClick={() => onPreview(image.src)} className="bg-gray-700 text-white px-3 py-1 text-sm rounded hover:bg-gray-600 w-full">Xem</button>
                <a href={image.src} download={`GiVa-Photo-AI-${image.id}.png`} className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-500 w-full text-center">Download</a>
                <button onClick={() => onDelete(image.id)} className="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-500 w-full">Xóa</button>
            </div>
        </div>
    );
}

export default function App() {
  const [characters, setCharacters] = useState<Character[]>([
    { id: uuidv4(), image: null, prompt: '', style: IMAGE_STYLES[0], selected: false, isLoading: false },
  ]);
  const [background, setBackground] = useState<Background>({ image: null, prompt: '', useAsReference: false, isLoading: false });
  const [finalPrompt, setFinalPrompt] = useState<string>('');
  const [numImages, setNumImages] = useState<number>(1);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGeneratingFinal, setIsGeneratingFinal] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleUpdateCharacter = useCallback((id: string, updates: Partial<Character>) => {
    setCharacters(prev =>
      prev.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  }, []);
  
  const handleRemoveCharacter = useCallback((id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleAddCharacter = () => {
    if (characters.length < MAX_CHARACTERS) {
      const newCharacter: Character = {
        id: uuidv4(),
        image: null,
        prompt: '',
        style: characters[0]?.style || IMAGE_STYLES[0],
        selected: false,
        isLoading: false,
      };
      setCharacters(prev => [...prev, newCharacter]);
    }
  };

  const handleUpdateBackground = useCallback((updates: Partial<Background>) => {
    setBackground(prev => ({ ...prev, ...updates }));
  }, []);
  
  const handleDeleteResult = (id: string) => {
      setGeneratedImages(prev => prev.filter(img => img.id !== id));
  };
  
  const handleGenerateFinal = async () => {
    const selectedCharacters = characters.filter(c => c.selected && c.image);
    if (selectedCharacters.length === 0) {
        alert("Vui lòng chọn ít nhất một nhân vật có ảnh.");
        return;
    }
    if (!background.image) {
        alert("Vui lòng cung cấp ảnh bối cảnh.");
        return;
    }
    if (!finalPrompt.trim()) {
        alert("Vui lòng nhập câu lệnh tạo ảnh cuối cùng.");
        return;
    }

    setIsGeneratingFinal(true);
    try {
        const promises = Array.from({ length: numImages }).map(() => 
            composeFinalImage(characters, background, finalPrompt, characters[0].style)
        );
        const results = await Promise.all(promises);
        const newImages: GeneratedImage[] = results.map(src => ({ id: uuidv4(), src }));
        setGeneratedImages(prev => [...newImages, ...prev]);

    } catch (error) {
        alert(`Lỗi tạo ảnh cuối cùng: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setIsGeneratingFinal(false);
    }
  };

  const isGenerateButtonDisabled = isGeneratingFinal || characters.filter(c => c.selected).length === 0 || !background.image || !finalPrompt;

  return (
    <>
      <div className="min-h-screen bg-brand-dark text-brand-text p-4 md:p-6">
        <header className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
            GiVa Photo AI
          </h1>
          <p className="text-brand-subtext mt-1">Tạo ảnh nhân vật đồng nhất với AI</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái - Bảng điều khiển */}
          <div className="lg:col-span-1 flex flex-col space-y-4">
            <div className="space-y-4">
              {characters.map((char) => (
                <CharacterInput 
                  key={char.id} 
                  character={char} 
                  onUpdate={handleUpdateCharacter}
                  onRemove={handleRemoveCharacter}
                  canRemove={characters.length > 1}
                />
              ))}
            </div>
            {characters.length < MAX_CHARACTERS && (
              <button onClick={handleAddCharacter} className="w-full bg-brand-light py-2 rounded-md hover:bg-brand-secondary transition-colors">
                + Thêm nhân vật
              </button>
            )}

            <BackgroundInput background={background} onUpdate={handleUpdateBackground} style={characters[0]?.style || IMAGE_STYLES[0]}/>

            <div className="bg-brand-secondary p-4 rounded-lg space-y-3">
                <h3 className="font-bold">Câu lệnh tạo ảnh</h3>
                <textarea
                    placeholder="Mô tả hành động/bố cục cho ảnh..."
                    value={finalPrompt}
                    onChange={(e) => setFinalPrompt(e.target.value)}
                    className="w-full bg-brand-light p-2 rounded-md h-24 resize-none text-sm"
                />
            </div>
            
            <div className="bg-brand-secondary p-4 rounded-lg space-y-3 sticky bottom-4">
              <div className="flex items-center space-x-4">
                  <label htmlFor="num-images" className="text-sm flex-shrink-0">Số ảnh:</label>
                  <select
                      id="num-images"
                      value={numImages}
                      onChange={(e) => setNumImages(Number(e.target.value))}
                      className="bg-brand-light p-2 rounded-md text-sm"
                  >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                  </select>
              </div>
              <button 
                onClick={handleGenerateFinal} 
                disabled={isGenerateButtonDisabled}
                className="w-full bg-blue-600 text-white py-3 rounded-md font-bold hover:bg-blue-500 transition-colors disabled:bg-brand-light disabled:cursor-not-allowed flex items-center justify-center"
              >
                  {isGeneratingFinal && <Spinner size="w-5 h-5 mr-2" />}
                  {isGeneratingFinal ? "Đang tạo..." : "Tạo ảnh cuối cùng"}
              </button>
            </div>
          </div>

          {/* Cột phải - Kết quả */}
          <div className="lg:col-span-2 bg-brand-secondary p-4 rounded-lg min-h-[60vh]">
            <h2 className="text-xl font-bold mb-4 border-b border-brand-light pb-2">Kết quả</h2>
            {isGeneratingFinal && generatedImages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-brand-subtext">
                    <Spinner size="w-12 h-12" />
                    <p className="mt-4">Đang tạo ảnh của bạn...</p>
                </div>
            )}
            {!isGeneratingFinal && generatedImages.length === 0 && (
                <div className="flex items-center justify-center h-full text-brand-subtext">
                    <p>Hình ảnh được tạo sẽ xuất hiện ở đây.</p>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
                {generatedImages.map(img => (
                    <ResultImage key={img.id} image={img} onDelete={handleDeleteResult} onPreview={setPreviewImage} />
                ))}
            </div>
          </div>
        </main>
      </div>
      <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
    </>
  );
}
