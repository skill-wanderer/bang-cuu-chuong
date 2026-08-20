import confetti from 'canvas-confetti';

export function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#6366F1', '#10B981', '#F59E0B', '#38BDF8', '#EC4899']
  });
}
