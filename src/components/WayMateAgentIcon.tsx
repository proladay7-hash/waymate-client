import React from 'react';
import Svg, {
  Path,
  Circle,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';

export interface WayMateAgentIconProps {
  size?: number;
  width?: number;
  height?: number;
  color?: string;
  useGradient?: boolean;
  gradientColors?: [string, string, string];
  showAccents?: boolean;
}

/**
 * WayMate AI Agent Custom Futuristic Mascot Icon
 * Designed from the official WayMate AI Agent mascot helmet with:
 * - Dual-tone neon cyber gradient (Electric Cyan #00E5FF -> Purple #7B2CBF -> Crimson Coral #FF2A6D)
 * - Headphone / ear comms modules on both sides
 * - Forehead AI neural circuit nodes
 * - Stadium visor screen with glowing eyes
 * - Soundwave / "WM" ECG heartbeat mouth waveform
 * - Orbiting GPS route pin (top-left) & chat speech bubble (top-right)
 */
export default function WayMateAgentIcon({
  size = 24,
  width,
  height,
  color,
  useGradient = true,
  gradientColors = ['#00E5FF', '#7B2CBF', '#FF2A6D'],
  showAccents = true,
}: WayMateAgentIconProps) {
  const computedWidth = width ?? size;
  const computedHeight = height ?? (width && !height ? width : size);

  // Gradient IDs unique to each instance if custom colors are passed
  const gradId = 'wmAgentNeonGrad';
  const visorId = 'wmAgentVisorBg';

  const strokeColor = color ? color : (useGradient ? `url(#${gradId})` : '#00A3E0');
  const eyeColor = color ? color : '#00E5FF';
  const pinColor = color ? color : gradientColors[0];
  const chatColor = color ? color : gradientColors[2];

  return (
    <Svg
      width={computedWidth}
      height={computedHeight}
      viewBox="0 0 100 100"
      fill="none"
    >
      <Defs>
        <SvgLinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={gradientColors[0]} />
          <Stop offset="52%" stopColor={gradientColors[1]} />
          <Stop offset="100%" stopColor={gradientColors[2]} />
        </SvgLinearGradient>

        <SvgLinearGradient id={visorId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#0B1324" stopOpacity="0.94" />
          <Stop offset="100%" stopColor="#05070D" stopOpacity="0.98" />
        </SvgLinearGradient>
      </Defs>

      {/* Orbiting Accents: GPS Pin (Top-Left) & Chat Bubble (Top-Right) */}
      {showAccents && (
        <>
          {/* Top-Left GPS Map Pin */}
          <Path
            d="M 15 6 C 10.5 6 7 9.5 7 14 C 7 19.5 15 26 15 26 C 15 26 23 19.5 23 14 C 23 9.5 19.5 6 15 6 Z"
            fill="none"
            stroke={pinColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="15" cy="14" r="2.2" fill={pinColor} />

          {/* Top-Right Chat Speech Bubble */}
          <Path
            d="M 85 6 C 79.5 6 75 9.5 75 14 C 75 16.5 76.5 18.8 79 20.3 L 77.5 24.5 L 82 22 C 83 22.3 84 22.5 85 22.5 C 90.5 22.5 95 19 95 14 C 95 9.5 90.5 6 85 6 Z"
            fill="none"
            stroke={chatColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Accent Sparks next to chat bubble */}
          <Path
            d="M 88 27 L 91 29 M 86 31 L 87 34"
            stroke={chatColor}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Side Headphone / Ear Modules */}
      {/* Left Ear Comms Pill */}
      <Rect
        x="9"
        y="37"
        width="8"
        height="24"
        rx="4"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
      />
      <Path
        d="M 17 49 L 20 49"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Right Ear Comms Pill */}
      <Rect
        x="83"
        y="37"
        width="8"
        height="24"
        rx="4"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
      />
      <Path
        d="M 80 49 L 83 49"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Neck Collar / Base Support */}
      <Path
        d="M 38 85 C 38 91 42 94 50 94 C 58 94 62 91 62 85"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <Path
        d="M 42 94 C 44 97 47 98 50 98 C 53 98 56 97 58 94"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Outer Helmet Shell Outline */}
      <Path
        d="M 50 14 C 30 14 18 28 18 50 C 18 69 29 82 40 85 L 60 85 C 71 82 82 69 82 50 C 82 28 70 14 50 14 Z"
        fill="none"
        stroke={strokeColor}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Forehead Brain Neural Circuit Nodes */}
      <Path
        d="M 50 28 L 50 20"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Circle cx="50" cy="19" r="2.2" fill={strokeColor} />

      {/* Left Circuit Branch */}
      <Path
        d="M 50 24 L 43 24 L 40 20 M 43 24 L 38 27"
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="40" cy="20" r="1.8" fill={strokeColor} />
      <Circle cx="38" cy="27" r="1.8" fill={strokeColor} />

      {/* Right Circuit Branch */}
      <Path
        d="M 50 24 L 57 24 L 60 20 M 57 24 L 62 27"
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="60" cy="20" r="1.8" fill={strokeColor} />
      <Circle cx="62" cy="27" r="1.8" fill={strokeColor} />

      {/* Visor Screen Faceplate */}
      <Rect
        x="23"
        y="32"
        width="54"
        height="46"
        rx="17"
        fill={`url(#${visorId})`}
        stroke={strokeColor}
        strokeWidth="2.8"
      />

      {/* Visor Eyes (Glowing Cyan / Electric Blue) */}
      <Circle cx="37" cy="46" r="5.2" fill={eyeColor} />
      <Circle cx="38.5" cy="44.5" r="1.6" fill="#FFFFFF" />

      <Circle cx="63" cy="46" r="5.2" fill={eyeColor} />
      <Circle cx="64.5" cy="44.5" r="1.6" fill="#FFFFFF" />

      {/* Visor Mouth: Audio / "W M" Soundwave Heartbeat Waveform */}
      <Path
        d="M 30 63 L 37 63 L 41 71 L 45 52 L 49 70 L 53 56 L 57 68 L 61 63 L 70 63"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
