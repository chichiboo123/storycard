export const pastelColors = [
  '#FDE2E4', '#FAD2CF', '#F2CC8F', '#F4F3EE', '#E3D5CA', '#D6EAF8',
  '#B5EAD7', '#C7CEEA', '#FFF5BA', '#FFDFBA', '#FFE5E5', '#E5F3FF',
  '#E5FFE5', '#FFF5E5', '#F5E5FF', '#E5FFFF', '#FFFEE5', '#FFE5F5',
  '#E5E5FF', '#F5FFE5', '#FFE5D5', '#D5E5FF', '#E5D5FF', '#D5FFE5',
  '#FFE5C5', '#C5E5FF', '#E5C5FF', '#C5FFE5', '#FFC5E5', '#E5FFC5',
  '#DAD7FE', '#E0F7FA', '#F1F8E9', '#FCE4EC', '#FFF3E0', '#F3E5F5',
  '#FFECB3', '#E8F5E8', '#FFF8E1', '#F9FBE7', '#E1F5FE', '#E8EAF6'
];

export function getShuffledPastelColors(): string[] {
  const shuffled = [...pastelColors];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}