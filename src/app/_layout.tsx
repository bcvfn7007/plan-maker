import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Unbounded_600SemiBold, Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider } from '../logic/AppState';
import { colors, fonts } from '../ui';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Unbounded_600SemiBold,
    Unbounded_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  // Without the fonts the screens would jump once they arrive; a font error falls back to system fonts.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            headerTitleStyle: { fontFamily: fonts.displayMedium, fontSize: 15 },
            contentStyle: { backgroundColor: colors.bg },
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ title: 'О тебе' }} />
          <Stack.Screen name="today" options={{ title: 'Plan Maker' }} />
          <Stack.Screen name="workout" options={{ title: 'Тренировка', gestureEnabled: false }} />
          <Stack.Screen name="library" options={{ title: 'Все упражнения' }} />
          <Stack.Screen name="exercise/[id]" options={{ title: '' }} />
        </Stack>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
