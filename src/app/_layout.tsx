import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider } from '../logic/AppState';
import { colors } from '../ui';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
            headerTintColor: colors.text,
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
