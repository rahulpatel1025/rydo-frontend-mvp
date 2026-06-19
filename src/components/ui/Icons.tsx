// src/components/ui/Icons.tsx
import { Svg, Circle, Path, Rect, Line, Text as SvgText } from 'react-native-svg';

export const SearchIcon = ({ color = "rgba(255,255,255,0.4)" }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={6.5} cy={6.5} r={5} stroke={color} strokeWidth={1.5} />
    <Path d="M10.5 10.5L14 14" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

export const PlusIcon = ({ color = "#06090A" }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M9 2L9 16M2 9L16 9" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

export const BikeIcon = ({ active, theme }: { active: boolean, theme: any }) => {
  // Use accent color if active, otherwise use textSub (which changes based on theme)
  const c = active ? theme.accent : theme.textSub;
  return (
    <Svg width={38} height={26} viewBox="0 0 40 28" fill="none">
      <Circle cx={8} cy={22} r={6} stroke={c} strokeWidth={2} />
      <Circle cx={32} cy={22} r={6} stroke={c} strokeWidth={2} />
      <Path d="M8 22L16 8L24 14L30 8L32 22" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx={24} cy={12} r={2} fill={c} />
    </Svg>
  );
};

export const AutoIcon = ({ active, theme }: { active: boolean, theme: any }) => {
  const c = active ? theme.accent : theme.textSub;
  const lineC = active ? theme.accentSoft : theme.border;
  return (
    <Svg width={38} height={26} viewBox="0 0 40 28" fill="none">
      <Rect x={8} y={8} width={22} height={14} rx={4} stroke={c} strokeWidth={1.8} />
      <Circle cx={12} cy={22} r={4} stroke={c} strokeWidth={1.8} />
      <Circle cx={28} cy={22} r={4} stroke={c} strokeWidth={1.8} />
      <Path d="M8 14L4 14L4 20L8 20" stroke={c} strokeWidth={1.5} />
      <Line x1={12} y1={8} x2={12} y2={14} stroke={lineC} strokeWidth={1} />
      <Line x1={20} y1={8} x2={20} y2={14} stroke={lineC} strokeWidth={1} />
    </Svg>
  );
};

export const SharedAutoIcon = ({ active, theme }: { active: boolean, theme: any }) => {
  const c = active ? theme.accent : theme.textSub;
  const lineC = active ? theme.accentSoft : theme.border;
  return (
    <Svg width={38} height={26} viewBox="0 0 40 28" fill="none">
      <Rect x={4} y={8} width={22} height={14} rx={4} stroke={c} strokeWidth={1.8} />
      <Circle cx={9} cy={22} r={4} stroke={c} strokeWidth={1.8} />
      <Circle cx={22} cy={22} r={4} stroke={c} strokeWidth={1.8} />
      <Path d="M26 12L32 12L34 18L26 18" stroke={c} strokeWidth={1.5} />
      <Circle cx={30} cy={22} r={4} stroke={c} strokeWidth={1.8} />
      <Line x1={13} y1={8} x2={13} y2={14} stroke={lineC} strokeWidth={1} />
    </Svg>
  );
};

export const MapPreview = () => (
  <Svg width="100%" height={185} viewBox="0 0 330 195">
    <Rect width={330} height={195} fill="#0C1610" />
    <Rect x={8} y={12} width={58} height={40} rx={4} fill="#0F1C12" />
    <Rect x={76} y={6} width={44} height={28} rx={4} fill="#0F1C12" />
    <Rect x={218} y={18} width={66} height={50} rx={4} fill="#0F1C12" />
    <Rect x={8} y={130} width={50} height={55} rx={4} fill="#0F1C12" />
    <Rect x={258} y={128} width={62} height={58} rx={4} fill="#0F1C12" />
    <Rect x={78} y={156} width={40} height={38} rx={4} fill="#0F1C12" />
    <Rect x={216} y={148} width={34} height={44} rx={4} fill="#0F1C12" />
    <Rect x={0} y={60} width={330} height={12} fill="#142018" />
    <Rect x={0} y={128} width={330} height={10} fill="#142018" />
    <Rect x={66} y={0} width={9} height={195} fill="#142018" />
    <Rect x={172} y={0} width={8} height={195} fill="#142018" />
    <Rect x={262} y={0} width={8} height={195} fill="#142018" />
    <Line x1={0} y1={66} x2={330} y2={66} stroke="rgba(255,255,255,0.04)" strokeWidth={1} strokeDasharray="14 10" />
    <Line x1={0} y1={133} x2={330} y2={133} stroke="rgba(255,255,255,0.04)" strokeWidth={1} strokeDasharray="14 10" />
    <Circle cx={165} cy={97} r={30} fill="rgba(190,255,0,0.05)" />
    <Circle cx={165} cy={97} r={17} fill="rgba(190,255,0,0.13)" />
    <Circle cx={165} cy={97} r={7} fill="#BEFF00" />
    <Circle cx={165} cy={97} r={44} fill="none" stroke="rgba(190,255,0,0.07)" strokeWidth={1} />
    <Circle cx={92} cy={74} r={9} fill="rgba(0,212,160,0.12)" />
    <Circle cx={92} cy={74} r={5} fill="#00D4A0" />
    <Circle cx={232} cy={80} r={9} fill="rgba(0,212,160,0.12)" />
    <Circle cx={232} cy={80} r={5} fill="#00D4A0" />
    <Circle cx={118} cy={148} r={5} fill="#00D4A0" />
    <Circle cx={282} cy={115} r={5} fill="#00D4A0" />
    <Circle cx={48} cy={118} r={5} fill="#5599FF" />
    <SvgText x={16} y={185} fill="rgba(255,255,255,0.28)" fontSize={9}>6 riders nearby</SvgText>
  </Svg>
);

// Profile Icons
export const StarIcon = ({ color = "#BEFF00" }: { color?: string }) => (
  <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
    <Path d="M6 1L7.5 4.2L11 4.7L8.5 7.1L9.1 10.6L6 9L2.9 10.6L3.5 7.1L1 4.7L4.5 4.2L6 1Z" fill={color} />
  </Svg>
);

export const WalletIcon = ({ color = "#BEFF00" }: { color?: string }) => (
  <Svg width={15} height={15} viewBox="0 0 16 16" fill="none">
    <Rect x={1} y={4} width={14} height={10} rx={2} stroke={color} strokeWidth={1.5} />
    <Path d="M4 4V3C4 1.9 4.9 1 6 1H10C11.1 1 12 1.9 12 3V4" stroke={color} strokeWidth={1.5} />
    <Line x1={8} y1={7.5} x2={8} y2={10.5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={6.5} y1={9} x2={9.5} y2={9} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

export const PinIcon = ({ color = "#BEFF00", centerColor = "transparent" }: { color?: string; centerColor?: string }) => (
  <Svg width={15} height={15} viewBox="0 0 16 16" fill="none">
    <Path d="M8 1C5.8 1 4 2.8 4 5C4 7.5 7 11 8 12C9 11 12 7.5 12 5C12 2.8 10.2 1 8 1Z" stroke={color} strokeWidth={1.5} />
    <Circle cx={8} cy={5} r={1.5} stroke={color} fill={centerColor} strokeWidth={1.5} />
  </Svg>
);

export const BellIcon = ({ color = "rgba(255,255,255,0.4)" }: { color?: string }) => (
  <Svg width={15} height={15} viewBox="0 0 16 16" fill="none">
    <Circle cx={8} cy={8} r={3} stroke={color} strokeWidth={1.5} />
    <Path d="M8 1V2.5M8 13.5V15M1 8H2.5M13.5 8H15M3.1 3.1L4.1 4.1M11.9 11.9L12.9 12.9M3.1 12.9L4.1 11.9M11.9 4.1L12.9 3.1" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

export const HelpIcon = ({ color = "rgba(255,255,255,0.4)" }: { color?: string }) => (
  <Svg width={15} height={15} viewBox="0 0 16 16" fill="none">
    <Circle cx={8} cy={8} r={6.5} stroke={color} strokeWidth={1.5} />
    <Path d="M8 6C8 5 8.5 4.5 9.5 4.5C10.5 4.5 11 5 11 6C11 7 10 7.5 8 8.5V10" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Circle cx={8} cy={12} r={0.75} fill={color} />
  </Svg>
);