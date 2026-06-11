// src/app/intro.tsx  — Rydo Cinematic Intro (Expo Go compatible)
// Uses only React Native's built-in Animated API — no reanimated needed

import { useEffect, useRef } from 'react';
import { View, Text, Dimensions, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';

const { width: W, height: H } = Dimensions.get('window');
const CX = W / 2;
const CY = H / 2;

// ── Fibonacci sphere particle generation ─────────────────────────────────────
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

const PARTICLES = generateParticles(120); // slightly fewer for RN Animated perf

// ── Screen ────────────────────────────────────────────────────────────────────
export default function IntroScreen() {
  const router = useRouter();

  // Master progress value 0 → 3.5
  const progress = useRef(new Animated.Value(0)).current;

  // Per-particle animated values
  const particleAnims = useRef(
    PARTICLES.map(() => new Animated.Value(0))
  ).current;

  // Logo + flash + ring
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.7)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const ringScale    = useRef(new Animated.Value(0.6)).current;
  const ringOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ── Phase 1: Assemble sphere (0 → 1200ms) ────────────────────────────────
    const assembleAnims = particleAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 1000,
        delay: i * 2,           // tiny stagger per particle
        useNativeDriver: true,
      })
    );

    // ── Phase 2: Ring fades in ────────────────────────────────────────────────
    const ringIn = Animated.parallel([
      Animated.timing(ringOpacity, { toValue: 0.35, duration: 400, useNativeDriver: true }),
      Animated.timing(ringScale,   { toValue: 1,    duration: 400, useNativeDriver: true }),
    ]);

    // ── Phase 3: Explode + flash + logo ──────────────────────────────────────
    const explodeAnims = particleAnims.map((anim) =>
      Animated.timing(anim, {
        toValue: 2,
        duration: 700,
        useNativeDriver: true,
      })
    );

    const flash = Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.2,  duration: 80,  useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0,    duration: 300, useNativeDriver: true }),
    ]);

    const logoIn = Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1,   duration: 500, useNativeDriver: true }),
      Animated.spring(logoScale,   { toValue: 1,   useNativeDriver: true, damping: 12, stiffness: 100 }),
    ]);

    const ringExpand = Animated.parallel([
      Animated.timing(ringScale,   { toValue: 2.2, duration: 700, useNativeDriver: true }),
      Animated.timing(ringOpacity, { toValue: 0,   duration: 700, useNativeDriver: true }),
    ]);

    // ── Phase 4: Logo fade out → navigate ────────────────────────────────────
    const logoOut = Animated.timing(logoOpacity, {
      toValue: 0, duration: 400, delay: 600, useNativeDriver: true,
    });

  // ── Full sequence ─────────────────────────────────────────────────────────
    Animated.sequence([
      Animated.parallel(assembleAnims),
      ringIn,
      Animated.parallel([
        Animated.parallel(explodeAnims),
        flash,
        logoIn,
        ringExpand,
      ]),
      logoOut,
    ]).start(() => {
      // ✅ FIX: Delay the navigation by 0ms to move it to the end of the JS event queue,
      // allowing Expo Router to finish its mounting process.
      setTimeout(() => {
        router.replace('/(auth)/' as any);
      }, 0);
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#06090A' }}>

      {/* ── Particles ── */}
      {PARTICLES.map((p, i) => {
        const anim = particleAnims[i];
        const color = p.isFront ? '#BEFF00' : '#5599FF';
        const dotSize = p.size;

        const translateX = anim.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [p.ex * 0.3, p.px, p.px + p.ex],
        });
        const translateY = anim.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [p.ey * 0.3, p.py, p.py + p.ey],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.4, 1, 1.5, 2],
          outputRange: [0, 1, 1, 1, 0],
        });
        const scale = anim.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [0.3, p.scale, p.scale * 2.2],
        });

        return (
          <Animated.View
            key={p.id}
            style={{
              position: 'absolute',
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
              left: CX - dotSize / 2,
              top: CY - dotSize / 2,
              opacity,
              transform: [{ translateX }, { translateY }, { scale }],
            }}
          />
        );
      })}

      {/* ── Glow Rings ── */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { alignItems: 'center', justifyContent: 'center', opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
        pointerEvents="none"
      >
        <View style={{ width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: 'rgba(190,255,0,0.3)' }} />
        <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 0.5, borderColor: 'rgba(190,255,0,0.15)' }} />
        <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 0.5, borderColor: 'rgba(85,153,255,0.12)' }} />
      </Animated.View>

      {/* ── Main Logo ── */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
        <Animated.View style={{ alignItems: 'center', opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Text style={{ fontSize: 58, fontWeight: '900', color: '#EEF0E8', fontFamily: 'Outfit_800ExtraBold', letterSpacing: -3 }}>
            ridzo
          </Text>
          <View style={{ width: 36, height: 2.5, backgroundColor: '#BEFF00', borderRadius: 2, marginTop: 4 }} />
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit_400Regular', letterSpacing: 4, marginTop: 7, textTransform: 'uppercase' }}>
            your ride awaits
          </Text>
        </Animated.View>
      </View>

      {/* ── Bottom Branding ("from ahir infotech") ── */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 45,
          left: 0,
          right: 0,
          alignItems: 'center',
          opacity: logoOpacity, // Fades seamlessly with the main logo
        }}
        pointerEvents="none"
      >
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Outfit_400Regular', marginBottom: 2 }}>
          from
        </Text>
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#EEF0E8', fontFamily: 'Outfit_600SemiBold', letterSpacing: 0.5 }}>
          AHIR INFOTECH
        </Text>
      </Animated.View>

      {/* ── Flash ── */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#BEFF00', opacity: flashOpacity }]}
        pointerEvents="none"
      />

    </View>
  );
}