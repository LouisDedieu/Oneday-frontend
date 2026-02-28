import { Stack } from 'expo-router';

export default function TripsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[tripId]" />
      <Stack.Screen name="city" />
    </Stack>
  );
}
