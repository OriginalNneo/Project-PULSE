export const pulseTokens = {
  color: {
    text: {
      primary: "#20242a",
      muted: "#5f6b76",
      inverse: "#ffffff",
    },
    surface: {
      default: "#ffffff",
      raised: "#f7f9fb",
      selected: "#e8f1fb",
      divider: "#d9e0e7",
    },
    intent: {
      info: "#1f6fb2",
      warning: "#9a6700",
      danger: "#b42318",
      success: "#157347",
    },
  },
  font: {
    size: {
      body: "14px",
      control: "14px",
      summary: "16px",
      heading: "22px",
    },
  },
  space: {
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "24px",
  },
  radius: {
    control: "4px",
    panel: "6px",
  },
} as const;

export type PulseTokens = typeof pulseTokens;

export const pulseCssVariables = {
  "--pulse-text-primary": pulseTokens.color.text.primary,
  "--pulse-text-muted": pulseTokens.color.text.muted,
  "--pulse-text-inverse": pulseTokens.color.text.inverse,
  "--pulse-surface-default": pulseTokens.color.surface.default,
  "--pulse-surface-raised": pulseTokens.color.surface.raised,
  "--pulse-surface-selected": pulseTokens.color.surface.selected,
  "--pulse-surface-divider": pulseTokens.color.surface.divider,
  "--pulse-intent-info": pulseTokens.color.intent.info,
  "--pulse-intent-warning": pulseTokens.color.intent.warning,
  "--pulse-intent-danger": pulseTokens.color.intent.danger,
  "--pulse-intent-success": pulseTokens.color.intent.success,
  "--pulse-font-body": pulseTokens.font.size.body,
  "--pulse-font-control": pulseTokens.font.size.control,
  "--pulse-font-summary": pulseTokens.font.size.summary,
  "--pulse-font-heading": pulseTokens.font.size.heading,
  "--pulse-space-1": pulseTokens.space[1],
  "--pulse-space-2": pulseTokens.space[2],
  "--pulse-space-3": pulseTokens.space[3],
  "--pulse-space-4": pulseTokens.space[4],
  "--pulse-space-5": pulseTokens.space[5],
  "--pulse-radius-control": pulseTokens.radius.control,
  "--pulse-radius-panel": pulseTokens.radius.panel,
} as const;
