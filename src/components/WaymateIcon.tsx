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
 * Waymate Custom Route Logo
 * Custom drawing representing the WayMate route with W and M between two GPS location pins.
 */
export default function WaymateIcon({
  width,
  height,
  size,
  color = '#FFFFFF',
  useGradient = false,
  gradientColors = ['#00A3E0', '#0066B1', '#E20613'],
  strokeWidth = 12,
}: WaymateIconProps) {
  // Original bounds: 26 to 506 (w: 480), 32 to 232 (h: 200) -> Aspect ratio = 2.4 : 1
  const computedHeight = height ?? (size ? size : 20);
  const computedWidth = width ?? (size ? size * 2.4 : computedHeight * 2.4);

  const strokeColor = useGradient ? 'url(#wmIconGrad)' : color;
  const startDotColor = useGradient ? gradientColors[0] : color;
  const endDotColor = useGradient ? gradientColors[2] : color;

  return (
    <Svg
      width={computedWidth}
      height={computedHeight}
      viewBox="26 32 480 200"
      fill="none"
    >
      {useGradient && (
        <Defs>
          <SvgLinearGradient id="wmIconGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={gradientColors[0]} />
            <Stop offset="50%" stopColor={gradientColors[1]} />
            <Stop offset="100%" stopColor={gradientColors[2]} />
          </SvgLinearGradient>
        </Defs>
      )}

      {/* Left Location Pin */}
      <Path
        d="M 61 40 C 46.5 40 35 51.5 35 66 C 35 83 48.5 97 61 107 C 73.5 97 87 83 87 66 C 87 51.5 75.5 40 61 40 Z"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="61" cy="66" r="7.5" fill={startDotColor} />

      {/* Continuous Route line forming W and M */}
      <Path
        d="M 61 107 C 65 111 72 112 80 112 L 105 112 C 118 114 127 126 133 145 L 145 185 C 149 208 153 222 160 222 C 167 222 171 205 175 185 L 183 148 C 186 131 192 126 198 126 C 204 126 208 133 211 148 L 220 188 C 224 208 227 221 234 221 C 241 221 247 203 254 175 L 274 98 C 278 81 284 75 290 75 C 297 75 303 83 307 98 L 321 145 C 325 159 329 167 334 167 C 340 167 344 159 348 145 L 362 98 C 366 81 372 75 378 75 C 385 75 391 83 395 98 L 409 170 C 413 195 420 221 433 221 L 458 221"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right Location Pin */}
      <Path
        d="M 458 221 C 445 203 445 188 445 176 C 445 162.7 455.7 152 469 152 C 482.3 152 493 162.7 493 176 C 493 196 478 212 458 221 Z"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="469" cy="176" r="7.5" fill={endDotColor} />
    </Svg>
  );
}
