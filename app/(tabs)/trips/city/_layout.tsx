import { Stack } from 'expo-router';

export default function CityLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[cityId]" />
    </Stack>
  );
}
