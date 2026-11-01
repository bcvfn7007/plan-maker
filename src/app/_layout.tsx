import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Unbounded_600SemiBold, Unbounded_700Bold, Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider } from '../logic/AppState';
import { colors, fonts } from '../ui';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Unbounded_600SemiBold,
    Unbounded_700Bold,
    Unbounded_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
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
            headerTitleStyle: { fontFamily: fonts.bodyBold, fontSize: 16 },
            contentStyle: { backgroundColor: colors.bg },
            headerBackButtonDisplayMode: 'minimal',
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="today" options={{ headerShown: false }} />
          <Stack.Screen name="workout" options={{ headerShown: false, gestureEnabled: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="library" options={{ title: 'Упражнения' }} />
          <Stack.Screen name="exercise/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="skill/index" options={{ headerShown: false }} />
          <Stack.Screen name="skill/session" options={{ headerShown: false, gestureEnabled: false, animation: 'slide_from_bottom' }} />
        </Stack>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
