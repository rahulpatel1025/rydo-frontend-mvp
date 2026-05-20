// src/app/index.tsx
import { Redirect } from 'expo-router';

export default function RootIndex() {
  // Temporarily route to the Auth flow to test our new screens!
  // In Week 2, we will add Zustand logic here to check if the user has a valid JWT token.
  return <Redirect href="/intro" />;
}