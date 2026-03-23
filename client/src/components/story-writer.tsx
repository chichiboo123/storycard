import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { downloadTxtFile, downloadJpgScreenshot } from '@/lib/pdf-utils';

interface CardData {
  id: number;
  color: string;
  imageUrl: string | null;
  flipped: boolean;
}

interface StoryWriterProps {
  flippedCards: CardData[];
  onRemoveCard?: (id: number) => void;
}

export default function StoryWriter({ flippedCards, onRemoveCard }: StoryWriterProps) {
  const [storyText, setStoryText] = useState('');
  const { toast } = useToast();

  const handleDownloadTxt = () => {
    if (!storyText.trim()) {
      toast({
        title: "오류",
        description: "이야기를 먼저 작성해주세요.",
        variant: "destructive"
      });
      return;
    }

    try {
      downloadTxtFile(storyText);
      toast({
        title: "성공",
        description: "TXT 파일이 성공적으로 다운로드되었습니다!"
      });
    } catch (error) {
      console.error('TXT 다운로드 오류:', error);
      toast({
        title: "오류",
        description: "파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadJpg = async () => {
    if (!storyText.trim()) {
      toast({
        title: "오류",
        description: "이야기를 먼저 작성해주세요.",
        variant: "destructive"
      });
      return;
    }

    try {
      await downloadJpgScreenshot();
      toast({
        title: "다운로드 완료",
        description: "이야기가 JPG 이미지로 저장되었습니다.",
      });
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: "이미지 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 mt-8 story-section">
      <h2 className="text-3xl font-do-hyeon text-center text-gray-800 mb-8">
        이야기 만들기
      </h2>
      
      {flippedCards.length > 0 && (
        <div className="mb-6">
          <p className="text-lg font-noto text-gray-700 mb-4 text-center">
            뽑은 카드 {flippedCards.length}장을 보고 자유롭게 이야기를 써보세요!
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {flippedCards.map((card) => (
              <div
                key={card.id}
                className="relative w-16 h-16 rounded-lg shadow-lg overflow-hidden border-2 border-white group"
                style={{ backgroundColor: card.color }}
              >
                {card.imageUrl && (
                  <img
                    src={card.imageUrl}
                    className="w-full h-full object-cover"
                    alt="Story card preview"
                  />
                )}
                {/* X 버튼 */}
                {onRemoveCard && (
                  <button
                    onClick={() => onRemoveCard(card.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                    title="카드 제거"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label htmlFor="story" className="block text-lg font-noto text-gray-700 mb-2">
            나만의 이야기
          </label>
          <Textarea
            id="story"
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            placeholder="카드에서 영감을 받아 자유롭게 이야기를 써보세요..."
            className="min-h-[200px] p-4 text-lg font-noto resize-none border-2 border-gray-200 focus:border-purple-500 rounded-lg leading-relaxed"
          />
        </div>

        <div className="story-section">
          <div className="flex flex-col sm:flex-row gap-4 justify-center download-buttons">
            <button
              onClick={handleDownloadTxt}
              disabled={!storyText.trim()}
              className={`
                px-6 py-3 rounded-lg font-noto transition-all duration-200
                ${!storyText.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-300 hover:bg-green-400 text-gray-800 shadow-lg hover:shadow-xl transform hover:scale-105'
                }
              `}
            >
              TXT 다운로드
            </button>
            
            <button
              onClick={handleDownloadJpg}
              disabled={!storyText.trim()}
              className={`
                px-6 py-3 rounded-lg font-noto transition-all duration-200
                ${!storyText.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-300 hover:bg-blue-400 text-gray-800 shadow-lg hover:shadow-xl transform hover:scale-105'
                }
              `}
            >
              JPG 다운로드
            </button>
            
            <button
              onClick={() => {
                const confirmed = window.confirm("모든 내용이 사라집니다. 처음 화면으로 이동하시겠습니까?");
                if (confirmed) {
                  window.location.reload();
                }
              }}
              className="px-6 py-3 rounded-lg font-noto bg-red-300 hover:bg-red-400 text-gray-800 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              처음으로
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}