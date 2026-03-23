import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getShuffledPastelColors } from '@/lib/pastel-colors';

interface CardData {
  id: number;
  color: string;
  imageUrl: string | null;
  flipped: boolean;
}

interface CardGeneratorProps {
  onCardsGenerated: (cards: CardData[]) => void;
  cards?: CardData[];
  onCardFlip?: (id: number) => void;
  onImageSettingsChange?: (useRealPhotos: boolean, useIllustrations: boolean) => void;
}

export default function CardGenerator({ onCardsGenerated, cards = [], onCardFlip, onImageSettingsChange }: CardGeneratorProps) {
  const [cardCount, setCardCount] = useState('');
  const [useRealPhotos, setUseRealPhotos] = useState(true);
  const [useIllustrations, setUseIllustrations] = useState(true);

  // 설정 변경 시 부모 컴포넌트에 알림
  const handleRealPhotosChange = (checked: boolean) => {
    setUseRealPhotos(checked);
    onImageSettingsChange?.(checked, useIllustrations);
  };

  const handleIllustrationsChange = (checked: boolean) => {
    setUseIllustrations(checked);
    onImageSettingsChange?.(useRealPhotos, checked);
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const getPicsumImage = (usedImages: Set<string>): string => {
    let randomId: number;
    let imageUrl: string;
    
    // 중복되지 않는 이미지 ID 찾기
    do {
      randomId = Math.floor(Math.random() * 1000);
      imageUrl = `https://picsum.photos/200/300?random=${randomId}`;
    } while (usedImages.has(imageUrl) && usedImages.size < 1000);
    
    usedImages.add(imageUrl);
    return `${imageUrl}&t=${Date.now()}`;
  };

  const getIllustrationImage = (usedImages: Set<string>): string => {
    const illustrations = [
      '/src/assets/illustration1.png',
      '/src/assets/illustration2.png', 
      '/src/assets/illustration3.png',
      '/src/assets/illustration4.png',
      '/src/assets/illustration5.png',
      '/src/assets/illustration6.png',
      '/src/assets/illustration7.png',
      '/src/assets/illustration8.png',
      '/src/assets/illustration9.png',
      '/src/assets/illustration10.png',
      '/src/assets/illustration11.png',
      '/src/assets/illustration12.png',
      '/src/assets/illustration13.png',
      '/src/assets/illustration14.png',
      '/src/assets/illustration15.png',
      '/src/assets/illustration16.png',
      '/src/assets/illustration17.png',
      '/src/assets/illustration18.png',
      '/src/assets/illustration19.png',
      '/src/assets/illustration20.png',
      '/src/assets/illustration21.png',
      '/src/assets/illustration22.png',
      '/src/assets/illustration23.png',
      '/src/assets/illustration24.png',
      '/src/assets/illustration25.png',
      '/src/assets/illustration26.png',
      '/src/assets/illustration27.png',
      '/src/assets/illustration28.png',
      '/src/assets/illustration29.png',
      '/src/assets/illustration30.png',
      '/src/assets/illustration31.png',
      '/src/assets/illustration32.png',
      '/src/assets/illustration33.png',
      '/src/assets/illustration34.png',
      '/src/assets/illustration35.png',
      '/src/assets/illustration36.png',
      '/src/assets/illustration37.png'
    ];
    
    // 사용되지 않은 일러스트만 필터링
    const availableIllustrations = illustrations.filter(img => !usedImages.has(img));
    
    // 사용 가능한 일러스트가 없다면 전체 목록에서 선택
    const sourceList = availableIllustrations.length > 0 ? availableIllustrations : illustrations;
    const randomIndex = Math.floor(Math.random() * sourceList.length);
    const selectedImage = sourceList[randomIndex];
    
    usedImages.add(selectedImage);
    return selectedImage;
  };

  const getRandomImage = async (usedImages: Set<string>): Promise<string> => {
    if (!useRealPhotos && !useIllustrations) {
      throw new Error('이미지 타입을 최소 하나는 선택해주세요.');
    }

    // 규칙 적용: 실물사진만 체크되면 picsum만, 일러스트만 체크되면 업로드 이미지만, 둘 다 체크되면 랜덤
    if (useRealPhotos && !useIllustrations) {
      // 실물사진만 체크된 경우: picsum 이미지만
      return getPicsumImage(usedImages);
    } else if (!useRealPhotos && useIllustrations) {
      // 일러스트만 체크된 경우: 업로드한 이미지만
      return getIllustrationImage(usedImages);
    } else if (useRealPhotos && useIllustrations) {
      // 둘 다 체크된 경우: 랜덤하게 섞여서
      const useReal = Math.random() > 0.5;
      return useReal ? getPicsumImage(usedImages) : getIllustrationImage(usedImages);
    } else {
      // 기본값 (일러스트)
      return getIllustrationImage(usedImages);
    }
  };

  const generateCards = async () => {
    const count = parseInt(cardCount);
    if (!cardCount || count < 1 || count > 30) {
      toast({
        title: "오류",
        description: "카드 개수는 1-30 사이로 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (!useRealPhotos && !useIllustrations) {
      toast({
        title: "오류",
        description: "이미지 타입을 최소 하나는 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    const shuffledColors = getShuffledPastelColors();
    const newCards: CardData[] = [];
    const usedImages = new Set<string>(); // 중복 방지를 위한 Set
    
    try {
      // 카드를 미리 생성하되, 이미지는 나중에 로드하도록 수정
      for (let i = 0; i < count; i++) {
        newCards.push({
          id: i,
          color: shuffledColors[i % shuffledColors.length],
          imageUrl: null, // 처음에는 null로 시작
          flipped: false
        });
      }

      onCardsGenerated(newCards);
    } catch (error) {
      console.error('카드 생성 중 오류:', error);
      toast({
        title: "오류", 
        description: "카드 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  function adjustBrightness(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  return (
    <div className="space-y-8">
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8">
        <h2 className="text-3xl font-do-hyeon text-center text-gray-800 mb-8">
          카드 개수 입력
        </h2>
        
        <div className="flex flex-col items-center space-y-6">
          <div className="flex justify-center">
            <input
              id="cardCount"
              type="number"
              min="1"
              max="30"
              value={cardCount}
              onChange={(e) => setCardCount(e.target.value)}
              placeholder="1~30"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-center font-noto focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex flex-col items-center space-y-3">
            <p className="text-lg font-noto text-gray-700">이미지 종류 선택</p>
            <div className="flex space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useRealPhotos}
                  onChange={(e) => handleRealPhotosChange(e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="font-noto text-gray-700">실물사진</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useIllustrations}
                  onChange={(e) => handleIllustrationsChange(e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="font-noto text-gray-700">일러스트</span>
              </label>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={generateCards}
              disabled={isGenerating || !cardCount || parseInt(cardCount) < 1 || parseInt(cardCount) > 30}
              className={`
                px-8 py-3 rounded-full font-noto text-lg font-medium transition-all duration-200
                ${isGenerating || !cardCount || parseInt(cardCount) < 1 || parseInt(cardCount) > 30
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                }
              `}
            >
              {isGenerating ? '생성 중...' : '카드 만들기'}
            </button>
            
            {cards.length > 0 && (
              <button
                onClick={() => {
                  // 모든 카드를 한 번에 열기
                  cards.forEach((card) => {
                    if (!card.flipped && onCardFlip) {
                      onCardFlip(card.id);
                    }
                  });
                }}
                className="px-6 py-3 rounded-full font-noto text-lg font-medium bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                한 번에 열기
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card Display Section */}
      {cards.length > 0 && (
        <div className="mb-24">
          <div className="flex flex-wrap justify-center gap-4">
            {cards.map((card) => (
              <div key={card.id} className="relative">
                <div
                  onClick={() => onCardFlip && onCardFlip(card.id)}
                  className="w-[200px] h-[300px] rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 transform-gpu shadow-lg"
                  style={{
                    background: card.flipped ? '#ffffff' : `linear-gradient(135deg, ${card.color}, ${adjustBrightness(card.color, -10)})`
                  }}
                >
                  {card.flipped ? (
                    <div className="w-full h-full rounded-2xl overflow-hidden">
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          className="w-full h-full object-cover rounded-2xl"
                          alt="Story card"
                          onError={(e) => {
                            console.error('Image failed to load:', card.imageUrl);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <div className="text-2xl mb-2">❌</div>
                            <div className="text-xs font-noto">이미지 없음</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center rounded-2xl">
                      <div className="text-xs font-noto text-gray-700 opacity-70">클릭해서 뒤집기</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}