import type { ComponentType } from 'react';
import { TextInput as AstryxTextInput, type TextInputProps } from '@astryxdesign/core/TextInput';

// @astryxdesign/core 0.1.4's TextInput has no `autoComplete` prop — input-specific
// HTML attributes (autoComplete, maxLength, minLength, ...) live on React's
// InputHTMLAttributes, not the generic HTMLAttributes that BaseProps extends, and
// TextInputProps doesn't re-declare autoComplete itself. The component DOES forward
// it correctly at runtime (its rest props spread straight onto the underlying
// <input>) — only the type is incomplete. Widening the type here (once, in one
// place) is safer than a per-callsite cast, and losing autofill hints on
// login/password fields would be a real UX regression, not just a cosmetic one.
export const TextInput = AstryxTextInput as ComponentType<
  TextInputProps & { autoComplete?: string }
>;
