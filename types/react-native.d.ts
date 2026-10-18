/**
 * Typings for the part of React Native that Saykind uses, as implemented by react-native-web.
 *
 * Why this file exists: the real `react-native` typings redeclare browser globals such as FormData and clash with
 * the DOM types this Next.js project needs, and react-native-web ships none of its own. This is deliberately small
 * and honest: add what you use. At build time `react-native` is aliased to `react-native-web` (see next.config.ts).
 */
declare module "react-native" {
  import type { ComponentType, ReactNode, Ref, RefObject } from "react";

  type Falsy = false | null | undefined;
  export type StyleProp<T> = T | Falsy | ReadonlyArray<StyleProp<T>>;
  /** React Native Web also passes ordinary CSS strings through, so values are loose on purpose. */
  export type ViewStyle = { [property: string]: unknown };
  export type TextStyle = ViewStyle;
  export type ImageStyle = ViewStyle;

  export type LayoutRectangle = { x: number; y: number; width: number; height: number };
  export type LayoutChangeEvent = { nativeEvent: { layout: LayoutRectangle } };
  export type GestureResponderEvent = { nativeEvent: Record<string, unknown>; preventDefault(): void; stopPropagation(): void };
  export type AccessibilityRole = string;

  type Common = {
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
    testID?: string;
    nativeID?: string;
    pointerEvents?: "auto" | "none" | "box-none" | "box-only";
    onLayout?: (event: LayoutChangeEvent) => void;
    accessible?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: AccessibilityRole;
    accessibilityState?: { selected?: boolean; disabled?: boolean; busy?: boolean; expanded?: boolean; checked?: boolean | "mixed" };
    accessibilityLiveRegion?: "none" | "polite" | "assertive";
    accessibilityElementsHidden?: boolean;
    accessibilityViewIsModal?: boolean;
    importantForAccessibility?: "auto" | "yes" | "no" | "no-hide-descendants";
    role?: string;
    "aria-label"?: string;
    "aria-hidden"?: boolean;
    "aria-live"?: "off" | "polite" | "assertive";
    "aria-modal"?: boolean;
    "aria-busy"?: boolean;
    "aria-expanded"?: boolean;
    "aria-selected"?: boolean;
    "aria-pressed"?: boolean;
    "aria-describedby"?: string;
    "aria-labelledby"?: string;
    tabIndex?: number;
    inert?: boolean;
    dataSet?: Record<string, string | number | boolean | undefined>;
  };

  export type ViewProps = Common & { ref?: Ref<unknown> };
  export const View: ComponentType<ViewProps>;

  export type TextProps = Omit<Common, "style"> & {
    numberOfLines?: number;
    selectable?: boolean;
    adjustsFontSizeToFit?: boolean;
    onPress?: () => void;
    accessibilityRole?: string;
    style?: StyleProp<TextStyle>;
  };
  export const Text: ComponentType<TextProps>;

  export type PressableProps = Omit<Common, "style" | "children"> & {
    onPress?: (event: GestureResponderEvent) => void;
    onPressIn?: (event: GestureResponderEvent) => void;
    onPressOut?: (event: GestureResponderEvent) => void;
    onLongPress?: (event: GestureResponderEvent) => void;
    delayLongPress?: number;
    disabled?: boolean;
    hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
    style?: StyleProp<ViewStyle> | ((state: { pressed: boolean; hovered?: boolean; focused?: boolean }) => StyleProp<ViewStyle>);
    children?: ReactNode | ((state: { pressed: boolean; hovered?: boolean; focused?: boolean }) => ReactNode);
    ref?: Ref<unknown>;
  };
  export const Pressable: ComponentType<PressableProps>;

  export type ScrollViewProps = Common & {
    horizontal?: boolean;
    showsVerticalScrollIndicator?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    contentContainerStyle?: StyleProp<ViewStyle>;
    keyboardShouldPersistTaps?: "always" | "never" | "handled";
    bounces?: boolean;
    snapToInterval?: number;
    decelerationRate?: number | "normal" | "fast";
    ref?: Ref<unknown>;
  };
  export const ScrollView: ComponentType<ScrollViewProps>;

  export type ImageProps = Omit<Common, "style"> & {
    source: number | { uri: string } | { uri: string; width?: number; height?: number };
    resizeMode?: "cover" | "contain" | "stretch" | "center" | "repeat";
    style?: StyleProp<ImageStyle>;
    alt?: string;
  };
  export const Image: ComponentType<ImageProps>;

  export type TextInputProps = Omit<Common, "style"> & {
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    placeholderTextColor?: string;
    keyboardType?: string;
    autoComplete?: string;
    autoCapitalize?: string;
    maxLength?: number;
    multiline?: boolean;
    numberOfLines?: number;
    style?: StyleProp<TextStyle>;
    onSubmitEditing?: () => void;
  };
  export const TextInput: ComponentType<TextInputProps>;

  export const Switch: ComponentType<Common & { value?: boolean; onValueChange?: (value: boolean) => void; trackColor?: { true?: string; false?: string }; thumbColor?: string; disabled?: boolean }>;

  export const StyleSheet: {
    create<T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(styles: T): T;
    flatten(style: StyleProp<ViewStyle>): ViewStyle;
    absoluteFill: ViewStyle;
    absoluteFillObject: ViewStyle;
    hairlineWidth: number;
  };

  export const Platform: { OS: "web"; select<T>(spec: { web?: T; default?: T }): T | undefined };
  export const Linking: { openURL(url: string): Promise<void>; canOpenURL(url: string): Promise<boolean> };
  export const AccessibilityInfo: {
    isReduceMotionEnabled(): Promise<boolean>;
    addEventListener(name: "reduceMotionChanged", handler: (enabled: boolean) => void): { remove(): void };
    announceForAccessibility(message: string): void;
  };
  export function useWindowDimensions(): { width: number; height: number; scale: number; fontScale: number };
  export const Dimensions: { get(which: "window" | "screen"): { width: number; height: number } };

  export type EasingFunction = (value: number) => number;
  export const Easing: {
    linear: EasingFunction;
    ease: EasingFunction;
    quad: EasingFunction;
    sin: EasingFunction;
    cubic: EasingFunction;
    bezier(x1: number, y1: number, x2: number, y2: number): EasingFunction;
    in(easing: EasingFunction): EasingFunction;
    out(easing: EasingFunction): EasingFunction;
    inOut(easing: EasingFunction): EasingFunction;
  };

  export namespace Animated {
    type Interpolation = AnimatedNode;
    class AnimatedNode {
      interpolate(config: {
        inputRange: number[];
        outputRange: (number | string)[];
        extrapolate?: "extend" | "clamp" | "identity";
        extrapolateLeft?: "extend" | "clamp" | "identity";
        extrapolateRight?: "extend" | "clamp" | "identity";
      }): Interpolation;
    }
    class Value extends AnimatedNode {
      constructor(value: number);
      setValue(value: number): void;
      stopAnimation(callback?: (value: number) => void): void;
      addListener(callback: (state: { value: number }) => void): string;
      removeListener(id: string): void;
    }
    type CompositeAnimation = {
      start(callback?: (result: { finished: boolean }) => void): void;
      stop(): void;
      reset(): void;
    };
    type TimingConfig = { toValue: number; duration?: number; delay?: number; easing?: EasingFunction; useNativeDriver: boolean };
    type SpringConfig = { toValue: number; speed?: number; bounciness?: number; friction?: number; tension?: number; useNativeDriver: boolean };
    function timing(value: Value, config: TimingConfig): CompositeAnimation;
    function spring(value: Value, config: SpringConfig): CompositeAnimation;
    function loop(animation: CompositeAnimation, config?: { iterations?: number }): CompositeAnimation;
    function sequence(animations: CompositeAnimation[]): CompositeAnimation;
    function parallel(animations: CompositeAnimation[], config?: { stopTogether?: boolean }): CompositeAnimation;
    function stagger(time: number, animations: CompositeAnimation[]): CompositeAnimation;
    function delay(time: number): CompositeAnimation;
    function add(a: AnimatedNode | number, b: AnimatedNode | number): AnimatedNode;
    function subtract(a: AnimatedNode | number, b: AnimatedNode | number): AnimatedNode;
    function multiply(a: AnimatedNode | number, b: AnimatedNode | number): AnimatedNode;
    const View: ComponentType<Common & { style?: StyleProp<ViewStyle> | Record<string, unknown> | unknown }>;
    const Text: ComponentType<Common & { style?: unknown; numberOfLines?: number }>;
    const Image: ComponentType<Common & { source: unknown; style?: unknown; resizeMode?: string }>;
    function createAnimatedComponent<P>(component: ComponentType<P>): ComponentType<P>;
  }
  export const Animated: typeof Animated;

  export type { RefObject };
}
