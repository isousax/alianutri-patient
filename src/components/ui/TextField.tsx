import { useState } from 'react'
import { View, Text, TextInput, type TextInputProps, type ViewStyle, type StyleProp } from 'react-native'
import { useThemeColors } from '../../stores/theme'
import { radius, space, typography } from '../../theme/tokens'

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string
  error?: string
  helper?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  containerStyle?: StyleProp<ViewStyle>
}

/**
 * Standard text input with label, helper/error text and optional icons.
 * Uses theme tokens; focus ring + error state built in.
 */
export function TextField({
  label, error, helper, leftIcon, rightIcon, containerStyle, editable = true, ...inputProps
}: TextFieldProps) {
  const t = useThemeColors()
  const [focused, setFocused] = useState(false)
  const borderColor = error ? t.error : focused ? t.primary : t.border

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[typography.labelMd, { color: t.textSecondary, marginBottom: space.xs }]}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: t.surfaceSecondary,
          paddingHorizontal: space.lg,
          minHeight: 50,
          opacity: editable ? 1 : 0.6,
        }}
      >
        {leftIcon}
        <TextInput
          editable={editable}
          {...inputProps}
          onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e) }}
          placeholderTextColor={t.textMuted}
          style={[typography.bodyLg, { flex: 1, color: t.text, paddingVertical: space.md }]}
        />
        {rightIcon}
      </View>
      {(error || helper) && (
        <Text style={[typography.caption, { color: error ? t.error : t.textMuted, marginTop: space.xs }]}>
          {error || helper}
        </Text>
      )}
    </View>
  )
}
