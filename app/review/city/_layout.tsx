import { Stack } from 'expo-router';

export default function CityReviewLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[cityId]" />
    </Stack>
  );
}
