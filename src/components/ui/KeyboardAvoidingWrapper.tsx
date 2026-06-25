import { KeyboardAvoidingView, Platform, type ViewStyle, type StyleProp } from 'react-native'

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  /** extra offset (e.g. header height) for iOS */
  offset?: number
}

/**
 * Standard keyboard-avoiding wrapper for input screens.
 * iOS uses 'padding'; Android relies on adjustResize (behavior undefined).
 * Place a ScrollView inside with keyboardShouldPersistTaps="handled".
 */
export function KeyboardAvoidingWrapper({ children, style, offset = 0 }: KeyboardAvoidingWrapperProps) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={offset}
    >
      {children}
    </KeyboardAvoidingView>
  )
}
