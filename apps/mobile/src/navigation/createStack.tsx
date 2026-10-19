// Helper to declare a tab's native stack from a route table; headers are drawn by the design-system Screen.
import type { ComponentType } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

export interface StackRoute {
  name: string;
  component: ComponentType;
}

/** Returns a component rendering a headerless native stack of `routes`; first route is initial. */
export function createStack(routes: readonly StackRoute[]): ComponentType {
  const Stack = createNativeStackNavigator();
  function TabStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {routes.map((r) => (
          <Stack.Screen key={r.name} name={r.name} component={r.component} />
        ))}
      </Stack.Navigator>
    );
  }
  return TabStack;
}
