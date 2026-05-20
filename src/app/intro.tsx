// src/app/intro.tsx  — Rydo Cinematic Intro Screen

import { useEffect } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Easing,
  runOnJS,
  SharedValue,          // ✅ Fix 1: import directly
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const CX = W / 2;
const CY = H / 2;

function generateParticles(count: number) {
  const particles = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const R = 90;

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;

    const x3d = Math.cos(theta) * radius;
    const z3d = Math.sin(theta) * radius;
    const y3d = y;

    const fov = 280;
    const z = z3d * R + fov;
    const px = (x3d * R * fov) / z;
    const py = (y3d * R * fov) / z;
    const scale = fov / z;

    const isFront = z3d > 0;

    const len = Math.sqrt(x3d * x3d + y3d * y3d + z3d * z3d) || 1;
    const ex = (x3d / len) * (W * 0.7);
    const ey = (y3d / len) * (H * 0.7);

    particles.push({
      id: i,
      px, py, ex, ey, scale, isFront,
      size: isFront ? 3 + scale * 1.8 : 1.5 + scale * 0.8,
    });
  }
  return particles;
}

const PARTICLES = generateParticles(180);

// ── Single Particle ───────────────────────────────────────────────────────────
function Particle({ p, phase }: { p: typeof PARTICLES[0]; phase: SharedValue<number> }) {  // ✅ Fix 1
  const animStyle = useAnimatedStyle(() => {
    const ph = phase.value;
    let tx = 0, ty = 0, opacity = 0, sc = 1;

    if (ph < 1) {
      opacity = interpolate(ph, [0, 0.6], [0, 1]);
      tx = interpolate(ph, [0, 1], [p.ex * 0.3, p.px]);
      ty = interpolate(ph, [0, 1], [p.ey * 0.3, p.py]);
      sc = interpolate(ph, [0, 1], [0.3, p.scale]);
    } else if (ph < 2) {
      opacity = 1;
      tx = p.px;
      ty = p.py;
      sc = p.scale;
    } else {
      const t = ph - 2;
      opacity = interpolate(t, [0, 0.7], [1, 0]);
      tx = interpolate(t, [0, 1], [p.px, p.px + p.ex]);
      ty = interpolate(t, [0, 1], [p.py, p.py + p.ey]);
      sc = interpolate(t, [0, 1], [p.scale, p.scale * 2.5]);
    }

    return { opacity, transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }] };
  });

  const dotSize = p.size;
  const color = p.isFront ? '#BEFF00' : '#5599FF';

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        width: dotSize, height: dotSize,
        borderRadius: dotSize / 2,
        backgroundColor: color,
        left: CX - dotSize / 2,
        top: CY - dotSize / 2,
        shadowColor: color,
        shadowOpacity: 0.9,
        shadowRadius: 4,
        elevation: 4,
      }, animStyle]}
    />
  );
}

// ── Glow Ring ─────────────────────────────────────────────────────────────────
function GlowRing({ phase }: { phase: SharedValue<number> }) {  // ✅ Fix 1
  const style = useAnimatedStyle(() => {
    const ph = phase.value;
    const opacity = ph >= 0.5 && ph < 2.5
      ? interpolate(ph, [0.5, 1, 2, 2.5], [0, 0.35, 0.35, 0])
      : 0;
    const scale = ph < 2
      ? interpolate(ph, [0.5, 1], [0.6, 1])
      : interpolate(ph - 2, [0, 1], [1, 2.2]);
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: 'rgba(190,255,0,0.3)' }} />
      <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 0.5, borderColor: 'rgba(190,255,0,0.15)' }} />
      <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 0.5, borderColor: 'rgba(85,153,255,0.12)' }} />
    </Animated.View>
  );
}

// ── Logo Text ─────────────────────────────────────────────────────────────────
function LogoText({ phase }: { phase: SharedValue<number> }) {  // ✅ Fix 1
  const style = useAnimatedStyle(() => {
    const ph = phase.value;
    const opacity = interpolate(ph, [1.8, 2.4, 2.8, 3.2], [0, 1, 1, 0], 'clamp');
    const scale   = interpolate(ph, [1.8, 2.4], [0.7, 1], 'clamp');
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View style={[{ position: 'absolute', alignItems: 'center' }, style]}>
      <Text style={{ fontSize: 58, fontWeight: '900', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -3 }}>
        ridzo
      </Text>
      <View style={{ width: 36, height: 2.5, backgroundColor: '#BEFF00', borderRadius: 2, marginTop: 4 }} />
      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit_400Regular', letterSpacing: 4, marginTop: 7, textTransform: 'uppercase' }}>
        your ride awaits
      </Text>
    </Animated.View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function IntroScreen() {
  const router = useRouter();
  const phase = useSharedValue(0);

  const navigate = () => {
    router.replace('/(auth)/register');
  };

  useEffect(() => {
    phase.value = withSequence(
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }),
      withTiming(2, { duration: 600,  easing: Easing.inOut(Easing.sin) }),  // ✅ Fix 2: sin not sine
      withTiming(3, { duration: 900,  easing: Easing.in(Easing.cubic) }),
      withDelay(500, withTiming(3.5, { duration: 400, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(navigate)();
      })),
    );
  }, []);

  const flashStyle = useAnimatedStyle(() => {
    const opacity = interpolate(phase.value, [1.9, 2.1, 2.4], [0, 0.18, 0], 'clamp');
    return { opacity };
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#06090A' }}>
      {PARTICLES.map((p) => (
        <Particle key={p.id} p={p} phase={phase} />
      ))}
      <GlowRing phase={phase} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <LogoText phase={phase} />
        </View>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#BEFF00' }, flashStyle]} pointerEvents="none" />
    </View>
  );
}