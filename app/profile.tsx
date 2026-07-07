import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Ruler,
  Weight,
  Phone,
  Mail,
  Settings,
  Calendar,
  TrendingDown,
  TrendingUp,
  ChevronLeft,
  Camera,
  Image as ImageIcon,
  Trash2,
  X,
} from "lucide-react-native";
import {
  LineChart,
  type LineChartPoint,
} from "../src/components/charts/LineChart";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";
import { router } from "expo-router";
import { haptics } from "../src/lib/haptics";
import * as ImagePicker from "expo-image-picker";
import {
  usePortalProfile,
  useEvolution,
  useUploadProfilePhoto,
  useDeleteProfilePhoto,
} from "../src/hooks/usePortal";
import type { PortalEvolution } from "../src/types/portal";
import { useThemeColors } from "../src/stores/theme";
import { useFeaturesStore } from "../src/stores/features";
import { toast } from "../src/stores/toast";
import { confirm } from "../src/stores/confirm";
import {
  Card,
  LoadingScreen,
  ErrorState,
  ScreenHeader,
} from "../src/components/ui";
import {
  shadows,
  radius,
  space,
  typography,
  SCREEN_PADDING,
  fmtDateLabel,
} from "../src/theme/tokens";

const { width: SCREEN_W } = Dimensions.get("window");
const AVATAR_SIZE = 100;

export default function ProfileScreen() {
  const t = useThemeColors();
  const {
    data: profile,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = usePortalProfile();
  const canWrite = useFeaturesStore((s) => s.canWrite);
  const { mutateAsync: uploadPhoto, isPending: isUploading } =
    useUploadProfilePhoto();
  const { mutateAsync: deletePhoto, isPending: isDeleting } =
    useDeleteProfilePhoto();
  const [menuOpen, setMenuOpen] = useState(false);

  const hasPhoto = !!profile?.profile_photo_url;
  const isBusy = isUploading || isDeleting;

  const runPicker = useCallback(
    async (source: "library" | "camera") => {
      setMenuOpen(false);
      try {
        if (source === "library") {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            toast.error("Precisamos de acesso às fotos.");
            return;
          }
        } else {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            toast.error("Precisamos de acesso à câmera.");
            return;
          }
        }

        const opts: ImagePicker.ImagePickerOptions = {
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.9,
        };
        const result =
          source === "library"
            ? await ImagePicker.launchImageLibraryAsync(opts)
            : await ImagePicker.launchCameraAsync(opts);

        if (result.canceled || !result.assets?.[0]) return;

        haptics.medium();
        await uploadPhoto(result.assets[0].uri);
        haptics.success();
        toast.success("Foto de perfil atualizada!");
      } catch {
        toast.error("Não foi possível atualizar a foto. Tente novamente.");
      }
    },
    [uploadPhoto],
  );

  const handleRemove = useCallback(() => {
    setMenuOpen(false);
    confirm({
      title: "Remover foto de perfil?",
      message: "Sua foto voltará a mostrar suas iniciais.",
      confirmLabel: "Remover",
      cancelLabel: "Cancelar",
      destructive: true,
      onConfirm: async () => {
        try {
          await deletePhoto();
          haptics.success();
          toast.success("Foto removida.");
        } catch {
          toast.error("Não foi possível remover a foto.");
        }
      },
    });
  }, [deletePhoto]);

  const openMenu = useCallback(() => {
    if (!canWrite || isBusy) return;
    haptics.selection();
    setMenuOpen(true);
  }, [canWrite, isBusy]);

  if (isLoading) return <LoadingScreen />;

  if (isError) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: t.background }}
        edges={["top"]}
      >
        <ScreenHeader title="Perfil" onBack={() => router.back()} />
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  const infoRows: { icon: React.ReactNode; label: string; value: string }[] =
    [];
  if (profile?.phone)
    infoRows.push({
      icon: <Phone size={15} color={t.primary} />,
      label: "Telefone",
      value: profile.phone,
    });
  if (profile?.email)
    infoRows.push({
      icon: <Mail size={15} color={t.primary} />,
      label: "E-mail",
      value: profile.email,
    });
  if (profile?.height_cm)
    infoRows.push({
      icon: <Ruler size={15} color={t.primary} />,
      label: "Altura",
      value: `${(profile.height_cm / 100).toFixed(2).replace(".", ",")} m`,
    });
  if (profile?.weight_kg)
    infoRows.push({
      icon: <Weight size={15} color={t.primary} />,
      label: "Peso",
      value: `${profile.weight_kg.toFixed(1).replace(".", ",")} kg`,
    });
  if (profile?.birth_date)
    infoRows.push({
      icon: <Calendar size={15} color={t.primary} />,
      label: "Nascimento",
      value: new Date(profile.birth_date + "T00:00:00").toLocaleDateString(
        "pt-BR",
      ),
    });

  const displayName = profile?.preferred_name || profile?.name || "Paciente";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: t.background }}
      edges={["top"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={t.primary}
          />
        }
      >
        {/* ═══════ HEADER BAR ═══════ */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space.md,
            paddingBottom: space.xs,
          }}
        >
          <Pressable
            onPress={() => {
              haptics.light();
              router.back();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={{
              width: 38,
              height: 38,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.surfaceSecondary,
            }}
          >
            <ChevronLeft size={20} color={t.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Configurações"
            style={{
              width: 38,
              height: 38,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.surfaceSecondary,
            }}
          >
            <Settings size={18} color={t.textSecondary} strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* ═══════ AVATAR + NAME ═══════ */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={{
            alignItems: "center",
            paddingBottom: space["3xl"],
          }}
        >
          <Pressable
            onPress={openMenu}
            disabled={!canWrite || isBusy}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              hasPhoto ? "Alterar foto de perfil" : "Adicionar foto de perfil"
            }
            style={{ marginBottom: space.lg }}
          >
            {hasPhoto ? (
              <View
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                  overflow: "hidden",
                  borderWidth: 3,
                  borderColor: t.primaryLight,
                  ...shadows.md,
                }}
              >
                <Image
                  source={{ uri: profile!.profile_photo_url! }}
                  style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
              </View>
            ) : (
              <View
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: t.primary,
                  ...shadows.md,
                }}
              >
                <Text style={[typography.displaySm, { color: t.primaryFg }]}>
                  {initials}
                </Text>
              </View>
            )}

            {/* Overlay de upload/remoção em andamento */}
            {isBusy && (
              <View
                style={{
                  position: "absolute",
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.45)",
                }}
              >
                <ActivityIndicator color="#fff" />
              </View>
            )}

            {/* Badge de edição (câmera) — só quando pode escrever e não está ocupado */}
            {canWrite && !isBusy && (
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: t.primary,
                  borderWidth: 2,
                  borderColor: t.background,
                  ...shadows.sm,
                }}
              >
                <Camera size={15} color={t.primaryFg} strokeWidth={2} />
              </View>
            )}
          </Pressable>
          <Text style={[typography.displaySm, { color: t.text }]}>
            {displayName}
          </Text>
        </Animated.View>

        {/* ═══════ INFO CARD ═══════ */}
        {infoRows.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(350).delay(80)}
            style={{
              paddingHorizontal: SCREEN_PADDING,
              marginBottom: space.xl,
            }}
          >
            <Card padded={false}>
              {infoRows.map((row, i) => (
                <View key={i}>
                  {i > 0 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: t.borderLight,
                        marginHorizontal: space.lg,
                      }}
                    />
                  )}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: space.lg,
                      paddingVertical: space.md + 2,
                      gap: space.md,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        //borderRadius: radius.md,
                        //backgroundColor: t.primaryLight,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {row.icon}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          typography.overline,
                          { color: t.textMuted, marginBottom: 2 },
                        ]}
                      >
                        {row.label}
                      </Text>
                      <Text style={[typography.labelMd, { color: t.text }]}>
                        {row.value}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* ═══════ EVOLUTION CHART ═══════ */}
        <WeightChart />
      </ScrollView>

      {/* ═══════ BOTTOM SHEET: opções da foto de perfil ═══════ */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          onPress={() => setMenuOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: t.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingTop: space.md,
              paddingBottom: space["2xl"] + space.md,
              paddingHorizontal: SCREEN_PADDING,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: space.lg }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: t.borderLight,
                }}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: space.md,
              }}
            >
              <Text style={[typography.headingSm, { color: t.text }]}>
                Foto de perfil
              </Text>
              <Pressable
                onPress={() => setMenuOpen(false)}
                hitSlop={12}
                accessibilityLabel="Fechar"
              >
                <X size={20} color={t.textSecondary} />
              </Pressable>
            </View>

            <SheetOption
              icon={<Camera size={19} color={t.primary} />}
              label="Tirar foto"
              onPress={() => runPicker("camera")}
            />
            <SheetOption
              icon={<ImageIcon size={19} color={t.primary} />}
              label="Escolher da galeria"
              onPress={() => runPicker("library")}
            />
            {hasPhoto && (
              <SheetOption
                icon={<Trash2 size={19} color={t.error} />}
                label="Remover foto atual"
                destructive
                onPress={handleRemove}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function SheetOption({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const t = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingVertical: space.md + 2,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: destructive ? t.errorLight : t.primaryLight,
        }}
      >
        {icon}
      </View>
      <Text
        style={[typography.labelMd, { color: destructive ? t.error : t.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function WeightChart() {
  const t = useThemeColors();
  const { data: evolution } = useEvolution();

  const points = (evolution ?? []).filter(
    (e: PortalEvolution) => e.weight_kg !== null,
  ) as (PortalEvolution & { weight_kg: number })[];
  if (points.length < 2) return null;

  const W = SCREEN_W - SCREEN_PADDING * 2 - space.lg * 2;

  const chartData: LineChartPoint[] = points.map((p) => ({
    label: fmtDateLabel(p.evaluation_date),
    value: p.weight_kg,
  }));

  const first = points[0].weight_kg;
  const last = points[points.length - 1].weight_kg;
  const diff = last - first;
  const diffStr = `${diff > 0 ? "+" : ""}${diff.toFixed(1).replace(".", ",")} kg`;
  const trendColor = diff <= 0 ? t.success : t.warning;
  const TrendIcon = diff <= 0 ? TrendingDown : TrendingUp;
  const summary = `Evolução de peso: atual ${last.toFixed(1).replace(".", ",")} kg, ${diff === 0 ? "sem variação" : `${diff > 0 ? "aumento" : "redução"} de ${Math.abs(diff).toFixed(1).replace(".", ",")} kg`} em ${points.length} medições.`;

  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(160)}
      style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space.lg }}
    >
      <Card>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: space.md,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: radius.sm,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: diff <= 0 ? t.successLight : t.warningLight,
              }}
            >
              <TrendIcon size={14} color={trendColor} />
            </View>
            <Text
              style={[
                typography.headingSm,
                { color: t.text, marginLeft: space.sm },
              ]}
            >
              Evolução de peso
            </Text>
          </View>
          <Text style={[typography.captionBold, { color: trendColor }]}>
            {diffStr}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: space.sm,
          }}
        >
          <Text style={[typography.headingLg, { color: t.text }]}>
            {last.toFixed(1).replace(".", ",")}
            <Text style={[typography.caption, { color: t.textMuted }]}>
              {" "}
              kg
            </Text>
          </Text>
          <Text style={[typography.caption, { color: t.textMuted }]}>
            {fmtDateLabel(points[0].evaluation_date)} —{" "}
            {fmtDateLabel(points[points.length - 1].evaluation_date)}
          </Text>
        </View>

        <LineChart
          data={chartData}
          width={W}
          height={100}
          unit="kg"
          decimals={1}
          accessibilityLabel={summary}
        />
      </Card>
    </Animated.View>
  );
}
