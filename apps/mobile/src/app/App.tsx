// App entry: providers (safe area, theme, toast, session) wrapping the navigation container.
import { useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, ToastProvider } from '../design';
import { SessionProvider } from '../features/auth';
import { RootNavigator } from '../navigation/RootNavigator';
import { ForegroundRefresh } from './ForegroundRefresh';

export default function App() {
  // Start fetching the tab-bar icon font at launch instead of when the first icon mounts.
  useEffect(() => {
    Ionicons.loadFont().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <SessionProvider>
            <ForegroundRefresh />
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
            <StatusBar style="dark" />
          </SessionProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
