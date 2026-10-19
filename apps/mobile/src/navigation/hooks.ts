// Typed navigation hooks for feature screens (public API of the shell navigation).
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppParamList } from './types';

export const useAppNavigation = () => useNavigation<NativeStackNavigationProp<AppParamList>>();

/** `const { workshopId } = useAppRoute<'WorkshopDetail'>().params;` */
export const useAppRoute = <N extends keyof AppParamList>() =>
  useRoute<RouteProp<AppParamList, N>>();
