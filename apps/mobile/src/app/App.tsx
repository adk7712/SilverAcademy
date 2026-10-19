// App entry: providers (safe area, theme, toast, session) wrapping the navigation container.
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, ToastProvider } from '../design';
import { SessionProvider } from '../features/auth';
import { RootNavigator } from '../navigation/RootNavigator';
import { ForegroundRefresh } from './ForegroundRefresh';

export default function App() {
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
