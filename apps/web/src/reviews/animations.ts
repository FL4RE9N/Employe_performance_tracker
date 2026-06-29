import { keyframes } from '@mui/material/styles';

/** Comparison container reveal — slides and fades in from slightly below. */
export const reveal = keyframes`
  from { transform: scale(.99) translateY(8px); opacity: 0 }
  to   { transform: none; opacity: 1 }
`;

/** Seal/lock icon break — expands and rotates away when the review is released. */
export const sealBreak = keyframes`
  0%   { transform: scale(1)    rotate(0deg);  opacity: 1 }
  35%  { transform: scale(1.08) rotate(-3deg); opacity: 1 }
  100% { transform: scale(1.9)  rotate(8deg);  opacity: 0 }
`;
