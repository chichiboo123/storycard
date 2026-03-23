import { useState } from 'react';
import { motion } from 'framer-motion';

interface StoryCardProps {
  id: number;
  backgroundColor: string;
  emoji: string;
  onFlip: (id: number) => void;
  imageUrl: string | null;
  isFlipped: boolean;
  isLoading?: boolean;
}

export default function StoryCard({
  id,
  backgroundColor,
  emoji,
  onFlip,
  imageUrl,
  isFlipped,
  isLoading = false
}: StoryCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleCardClick = () => {
    if (!isFlipped) {
      onFlip(id);
    }
  };

  const adjustBrightness = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  return (
    <div className="card-item group cursor-pointer w-full h-48 min-h-[192px]" onClick={handleCardClick}>
      <div className="relative w-full h-full perspective-1000">
        <motion.div
          className={`card-inner absolute inset-0 w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            isFlipped ? 'flipped' : ''
          }`}
          whileHover={!isFlipped ? { rotateY: 5, rotateX: 5 } : {}}
          transition={{ duration: 0.2 }}
        >
          {/* Card Back - Visible by default */}
          <div
            className="card-face card-back absolute inset-0 w-full h-full rounded-2xl shadow-lg border-2 border-white/20 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${backgroundColor}, ${adjustBrightness(backgroundColor, -10)})`
            }}
          >
            <div className="text-center flex flex-col items-center justify-center w-full h-full p-4">
              <div className="text-xs font-noto text-gray-700 opacity-70">클릭해서 뒤집기</div>
            </div>
          </div>

          {/* Card Front */}
          <div className="card-face card-front absolute inset-0 w-full h-full bg-white rounded-2xl shadow-lg backface-hidden rotate-y-180 overflow-hidden">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-2xl mb-2 animate-spin">🔄</div>
                  <div className="text-xs font-noto">이미지 로딩중...</div>
                </div>
              </div>
            ) : imageUrl && !imageError ? (
              <img
                src={imageUrl}
                className="w-full h-full object-cover rounded-2xl"
                alt="Random story card image"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-2xl mb-2">❌</div>
                  <div className="text-xs font-noto">
                    이미지 로딩 실패
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
