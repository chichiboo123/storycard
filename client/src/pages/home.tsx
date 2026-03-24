import { useState } from 'react';
import CardGenerator from '@/components/card-generator';
import StoryWriter from '@/components/story-writer';

// 파일을 추가하기만 하면 자동으로 인식 (코드 수정 불필요)
const illustrationModules = import.meta.glob<string>(
  '../assets/illustration*.jpg',
  { eager: true, query: '?url', import: 'default' }
);
const ALL_ILLUSTRATIONS = Object.values(illustrationModules);

function adjustBrightness(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

interface CardData {
  id: number;
  color: string;
  imageUrl: string | null;
  flipped: boolean;
}

export default function Home() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [showStorySection, setShowStorySection] = useState(false);
  const [usedImages, setUsedImages] = useState(new Set<string>());
  const [currentUseRealPhotos, setCurrentUseRealPhotos] = useState(true);
  const [currentUseIllustrations, setCurrentUseIllustrations] = useState(true);
  const flippedCards = cards.filter(card => card.flipped);

  const handleCardFlip = async (id: number) => {
    const cardToFlip = cards.find(card => card.id === id);
    
    if (cardToFlip?.flipped) {
      // 이미 뒤집힌 카드를 클릭하면 다시 뒤집기
      setCards(prevCards =>
        prevCards.map(card =>
          card.id === id ? { ...card, flipped: false } : card
        )
      );
    } else {
      // 카드를 먼저 뒤집기
      setCards(prevCards =>
        prevCards.map(card =>
          card.id === id ? { ...card, flipped: true } : card
        )
      );

      // 이미지 URL이 없는 경우에만 이미지 로드
      if (cardToFlip && !cardToFlip.imageUrl) {
        try {
          // 중복 방지를 위해 usedImages Set 전달
          const imageUrl = await getRandomImage(usedImages);
          setCards(prevCards =>
            prevCards.map(card =>
              card.id === id ? { ...card, imageUrl: imageUrl } : card
            )
          );
        } catch (error) {
          console.error('이미지 로딩 실패:', error);
        }
      }
    }
  };

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
    const available = ALL_ILLUSTRATIONS.filter(img => !usedImages.has(img));
    const sourceList = available.length > 0 ? available : ALL_ILLUSTRATIONS;
    const selected = sourceList[Math.floor(Math.random() * sourceList.length)];
    usedImages.add(selected);
    return selected;
  };

  const getRandomImage = async (usedImages: Set<string>): Promise<string> => {
    // 현재 설정된 이미지 타입 사용
    console.log('현재 설정:', { currentUseRealPhotos, currentUseIllustrations });
    
    // 규칙 적용: 실물사진만 체크되면 picsum만, 일러스트만 체크되면 업로드 이미지만, 둘 다 체크되면 랜덤
    if (currentUseRealPhotos && !currentUseIllustrations) {
      // 실물사진만 체크된 경우: picsum 이미지만
      console.log('실물사진만 선택됨');
      return getPicsumImage(usedImages);
    } else if (!currentUseRealPhotos && currentUseIllustrations) {
      // 일러스트만 체크된 경우: 업로드한 이미지만
      console.log('일러스트만 선택됨');
      return getIllustrationImage(usedImages);
    } else if (currentUseRealPhotos && currentUseIllustrations) {
      // 둘 다 체크된 경우: 랜덤하게 섞여서
      const useReal = Math.random() > 0.5;
      console.log('둘 다 선택됨, 랜덤 선택:', useReal ? 'picsum' : 'illustration');
      return useReal ? getPicsumImage(usedImages) : getIllustrationImage(usedImages);
    } else {
      // 아무것도 체크되지 않은 경우 (기본값으로 일러스트)
      console.log('기본값: 일러스트');
      return getIllustrationImage(usedImages);
    }
  };

  const handleCardsGenerated = (newCards: CardData[]) => {
    setCards(newCards);
    setShowStorySection(true);
    // 새로운 카드가 생성되면 사용된 이미지 목록 초기화
    setUsedImages(new Set<string>());
  };

  const handleImageSettingsChange = (useRealPhotos: boolean, useIllustrations: boolean) => {
    setCurrentUseRealPhotos(useRealPhotos);
    setCurrentUseIllustrations(useIllustrations);
    console.log('이미지 설정 변경:', { useRealPhotos, useIllustrations });
  };

  const resetCards = () => {
    const confirmed = window.confirm("모든 내용이 사라집니다. 처음 화면으로 이동하시겠습니까?");
    if (confirmed) {
      setCards([]);
      setShowStorySection(false);
      setUsedImages(new Set<string>());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRemoveCard = (id: number) => {
    setCards(prevCards =>
      prevCards.map(card =>
        card.id === id ? { ...card, flipped: false } : card
      )
    );
  };

  return (
    <div className="bg-gradient-to-br from-pastel-sky via-pastel-yellow to-pastel-purple min-h-screen font-noto flex flex-col">
      {/* Header */}
      <header className="text-center py-8 px-4 relative">
        {/* Little Prince inspired stars decoration */}
        <div className="flex justify-center mb-4">
          <div className="text-2xl">⭐</div>
          <div className="text-lg mx-2">✨</div>
          <div className="text-xl">🌟</div>
          <div className="text-lg mx-2">✨</div>
          <div className="text-2xl">⭐</div>
        </div>

        <h1 className="text-4xl md:text-6xl font-do-hyeon text-gray-800 drop-shadow-lg mb-2">
          상상 이상의 카드
        </h1>
        <p className="text-xl md:text-2xl font-do-hyeon text-gray-700 drop-shadow-md">
          Cards for Storytelling
        </p>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 max-w-6xl flex-1">
        <CardGenerator 
          onCardsGenerated={handleCardsGenerated}
          cards={cards}
          onCardFlip={handleCardFlip}
          onImageSettingsChange={handleImageSettingsChange}
        />
        


        {showStorySection && (
          <div id="story-section" className="mt-16">
            <StoryWriter flippedCards={flippedCards} onRemoveCard={handleRemoveCard} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm mt-12 py-3 px-4">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
          <span className="font-noto text-gray-600">
            실물사진 출처:{' '}
            <a href="https://picsum.photos/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-purple-500 underline transition-colors duration-200">picsum.photos</a>
          </span>
          <span className="text-gray-300">|</span>
          <span className="font-do-hyeon text-gray-700">
            created by.{' '}
            <a href="https://litt.ly/chichiboo" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-blue-500 transition-colors duration-200 underline">교육뮤지컬 꿈꾸는 치수쌤</a>
          </span>
        </div>
      </footer>
    </div>
  );
}