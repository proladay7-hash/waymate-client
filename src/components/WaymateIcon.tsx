import React from 'react';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';

export interface WaymateIconProps {
  width?: number;
  height?: number;
  size?: number;
  color?: string;
  useGradient?: boolean;
  gradientColors?: [string, string, string];
  strokeWidth?: number;
}

/**
 * Waymate Custom Square Route Logo
 * Compact, square-proportioned icon with tight W and M peaks between departure and arrival GPS pins.
 */
export default function WaymateIcon({
  width,
  height,
  size,
  color = '#FFFFFF',
  useGradient = false,
  gradientColors = ['#00A3E0', '#0066B1', '#E20613'],
  strokeWidth = 7,
}: WaymateIconProps) {
  const computedSize = size ?? 24;
  const computedWidth = width ?? computedSize;
  const computedHeight = height ?? (width && !height ? width : computedSize);

  // Normalize strokeWidth to match 100x100 viewBox coordinate scale
  const effectiveStrokeWidth = strokeWidth > 10 ? strokeWidth * 0.5 : strokeWidth;

  const strokeColor = useGradient ? 'url(#wmSquareIconGrad)' : color;
  const startDotColor = useGradient ? gradientColors[0] : color;
  const endDotColor = useGradient ? gradientColors[2] : color;

  return (
    <Svg
      width={computedWidth}
      height={computedHeight}
      viewBox="0 0 100 100"
      fill="none"
    >
      {useGradient && (
        <Defs>
          <SvgLinearGradient id="wmSquareIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradientColors[0]} />
            <Stop offset="50%" stopColor={gradientColors[1]} />
            <Stop offset="100%" stopColor={gradientColors[2]} />
          </SvgLinearGradient>
        </Defs>
      )}

      {/* Start Location Pin (Top-Left) */}
      <Path
        d="M 18 12 C 12 12 7 17 7 23 C 7 30 13 36 18 42 C 23 36 29 30 29 23 C 29 17 24 12 18 12 Z"
        stroke={strokeColor}
        strokeWidth={effectiveStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="18" cy="23" r="3" fill={startDotColor} />

      {/* Tight, Connected Route line forming W and M */}
      <Path
        d="M 18 42 C 20 56 23 72 26 82 C 29 72 32 58 34 48 C 36 58 39 72 42 82 C 45 66 47 38 50 22 C 54 36 57 46 61 54 C 65 46 68 36 72 22 C 76 34 79 48 82 58"
        stroke={strokeColor}
        strokeWidth={effectiveStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End Destination Pin (Bottom-Right) */}
      <Path
        d="M 82 58 C 76 58 71 63 71 69 C 71 76 77 82 82 88 C 87 82 93 76 93 69 C 93 63 88 58 82 58 Z"
        stroke={strokeColor}
        strokeWidth={effectiveStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="82" cy="69" r="3" fill={endDotColor} />
    </Svg>
  );
}
