import { useEffect } from "react";
import { Pressable, Text, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import { Camera, Check } from "lucide-react-native";
import { useThemeColors } from "../../stores/theme";
import { radius, space } from "../../theme/tokens";

// ══════════════════════════════════════════════════════
//  Botões de ação de refeição (reutilizados no diário e no
//  plano alimentar ativo). Fonte única — evita duplicação.
//  Hierarquia: Segui (fill sólido) > Foto (tonal indigo) > Parcial (link).
// ══════════════════════════════════════════════════════

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Base compartilhada dos dois botões da linha (largura igual).
const BASE_BTN: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingVertical: space.md, // 12 (≈ py-3)
  borderRadius: radius.lg, // 16
};

// ── Foto — afordância "inteligente" tonal indigo + 1 passe de brilho especular ──
// `index` escalona o brilho quando há vários cards (lista), p/ cascatear sem ruído.
export function PhotoActionButton({
  onPress,
  disabled = false,
  label = "Foto",
  index = 0,
  accessibilityLabel = "Registrar refeição com foto",
}: {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
  index?: number;
  accessibilityLabel?: string;
}) {
  const t = useThemeColors();
  const scale = useSharedValue(1);
  const sheenX = useSharedValue(-120);

  useEffect(() => {
    sheenX.value = withDelay(
      index * 140,
      withSequence(
        withTiming(-120, { duration: 280 }), // pausa curta
        withTiming(180, { duration: 820 }), // varredura
      ),
    );
  }, []);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sheenX.value }, { rotate: "18deg" }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 140 });
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        BASE_BTN,
        {
          overflow: "hidden",
          backgroundColor: t.accentLight,
          borderWidth: 1,
          borderColor: t.accent + "26", // ~15% — hairline indigo, calmo
        },
        btnStyle,
      ]}
    >
      {/* Brilho especular — clipado pelo overflow-hidden, passa 1x */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: -8,
            bottom: -8,
            width: 22,
            backgroundColor: "rgba(255,255,255,0.45)",
          },
          sheenStyle,
        ]}
      />
      <Camera size={16} color={t.accent} />
      <Text
        style={{ color: t.accent, fontFamily: "Inter_600SemiBold", fontSize: 14 }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

// ── Segui — ação primária (único fill sólido + bold) + press-scale ──
// `color` permite a cor do método no plano (emerald/teal/indigo); default = primary.
export function FollowActionButton({
  onPress,
  disabled = false,
  label = "Segui",
  color,
  fg,
}: {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
  color?: string;
  fg?: string;
}) {
  const t = useThemeColors();
  const bg = color ?? t.primary;
  const fgColor = fg ?? t.primaryFg;
  const scale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 140 });
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Marcar como seguida"
      accessibilityState={{ disabled, busy: disabled }}
      style={[BASE_BTN, { backgroundColor: bg }, btnStyle]}
    >
      <Check size={16} color={fgColor} />
      <Text style={{ color: fgColor, fontFamily: "Inter_700Bold", fontSize: 14 }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

// ── Parcial — link quieto (ação terciária, não compete com os botões) ──
export function PartialActionLink({
  onPress,
  disabled = false,
  label = "Segui parcialmente",
}: {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const t = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Marcar que segui parcialmente"
      style={{
        marginTop: 10,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          color: t.textMuted,
          fontFamily: "Inter_500Medium",
          fontSize: 12,
          lineHeight: 16,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
