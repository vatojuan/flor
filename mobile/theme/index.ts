import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { colors } from './colors';

const fontConfig = {
  fontFamily: 'System',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    primaryContainer: '#FFE0D0',
    onPrimaryContainer: colors.primaryDark,
    secondary: colors.secondary,
    secondaryContainer: '#B2DFDB',
    onSecondaryContainer: colors.secondary,
    background: colors.background.light,
    surface: colors.surface.light,
    surfaceVariant: colors.surfaceVariant.light,
    error: colors.error,
    onPrimary: colors.white,
    onSecondary: colors.white,
    onBackground: colors.text.light.primary,
    onSurface: colors.text.light.primary,
    onSurfaceVariant: colors.text.light.secondary,
    outline: colors.grey[400],
    elevation: {
      level0: 'transparent',
      level1: colors.surface.light,
      level2: colors.surfaceVariant.light,
      level3: '#EDE7E0',
      level4: '#E8E0D8',
      level5: '#E3DAD1',
    },
  },
  fonts: configureFonts({ config: fontConfig }),
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    primaryContainer: '#5C2810',
    onPrimaryContainer: '#FFE0D0',
    secondary: '#80CBC4',
    secondaryContainer: colors.secondary,
    onSecondaryContainer: '#B2DFDB',
    background: colors.background.dark,
    surface: colors.surface.dark,
    surfaceVariant: colors.surfaceVariant.dark,
    error: '#EF9A9A',
    onPrimary: colors.white,
    onSecondary: colors.black,
    onBackground: colors.text.dark.primary,
    onSurface: colors.text.dark.primary,
    onSurfaceVariant: colors.text.dark.secondary,
    outline: colors.grey[600],
    elevation: {
      level0: 'transparent',
      level1: colors.surface.dark,
      level2: colors.surfaceVariant.dark,
      level3: '#5D4037',
      level4: '#6D4C41',
      level5: '#795548',
    },
  },
  fonts: configureFonts({ config: fontConfig }),
};

export type AppTheme = typeof lightTheme;
