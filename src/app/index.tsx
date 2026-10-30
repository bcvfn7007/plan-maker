import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAppState } from '../logic/AppState';
import { colors } from '../ui';

export default function Index() {
  const { ready, profile } = useAppState();
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return <Redirect href={profile ? '/today' : '/onboarding'} />;
}
