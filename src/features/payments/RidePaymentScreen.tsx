import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import Constants from 'expo-constants';
import { apiClient } from '../../lib/apiClient';

// ── Razorpay publishable key loaded from Expo config ─────────────────────────
// In app.config.js  → expo.extra.razorpayKeyId = "rzp_test_xxxx"
const RAZORPAY_KEY_ID: string =
  (Constants.expoConfig?.extra?.razorpayKeyId as string) ?? '';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RidePaymentProps {
  rideId: string;
  ridePassengerId: string;
  fareAmount: number;
  /** Called after a successful payment (online or cash) to dismiss this screen */
  onPaymentComplete: () => void;
}

// Shape of the backend's POST /payments/create-app-order response
interface CreateOrderResponse {
  success: boolean;
  order: {
    id: string;       // Razorpay order_id  e.g. "order_Abc123"
    amount: number;   // Amount in paise    e.g. 15000
    currency: string; // "INR"
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RidePaymentScreen({
  rideId,
  ridePassengerId,
  fareAmount,
  onPaymentComplete,
}: RidePaymentProps) {
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [cashLoading, setCashLoading] = useState(false);
  const isAnyLoading = onlineLoading || cashLoading;

  // ── Online / UPI Payment ───────────────────────────────────────────────────
  const handleOnlinePayment = async () => {
    setOnlineLoading(true);
    try {
      // Step 1 — Create Razorpay order on the backend
      const { data } = await apiClient.post<CreateOrderResponse>(
        '/payments/create-app-order',
        {
          rideId: Number(rideId),
          ridePassengerId: Number(ridePassengerId),
          amount: fareAmount,
          currency: 'INR',
        }
      );

      if (!data.success || !data.order?.id) {
        throw new Error('Backend did not return a valid Razorpay order.');
      }

      const { id: orderId, amount: orderAmountPaise, currency } = data.order;

      // Step 2 — Open Razorpay Checkout SDK
      const checkoutOptions = {
        description: 'Ride Fare Payment',
        currency,
        key: RAZORPAY_KEY_ID,
        amount: orderAmountPaise,   // already in paise from backend
        name: 'Rydo Rides',
        order_id: orderId,
        theme: { color: '#BEFF00' },
        prefill: {
          // These will be pre-populated in the checkout sheet;
          // replace with actual user profile data if available.
          email: '',
          contact: '',
          name: '',
        },
      };

      let checkoutData: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      };

      try {
        checkoutData = await RazorpayCheckout.open(checkoutOptions) as typeof checkoutData;
      } catch (checkoutError: any) {
        // code 0 = user dismissed the sheet — treat as a soft cancel, not an error
        const code: number = checkoutError?.code ?? -1;
        if (code === 0) {
          setOnlineLoading(false);
          return;
        }
        throw new Error(
          checkoutError?.description ?? 'Payment was declined. Please try again.'
        );
      }

      // Step 3 — Verify payment on the backend (signature check + wallet credit)
      await apiClient.post('/payments/verify', {
        razorpay_payment_id: checkoutData.razorpay_payment_id,
        razorpay_order_id: checkoutData.razorpay_order_id,
        razorpay_signature: checkoutData.razorpay_signature,
        rideId: Number(rideId),
      });

      // Step 4 — Success!
      Alert.alert('Payment Successful 🎉', 'Your payment has been received.', [
        { text: 'OK', onPress: onPaymentComplete },
      ]);
    } catch (err: any) {
      Alert.alert(
        'Payment Failed',
        err?.message ?? 'Something went wrong. Please try again or pay cash.',
        [{ text: 'Retry', style: 'default' }, { text: 'Cancel', style: 'cancel' }]
      );
    } finally {
      setOnlineLoading(false);
    }
  };

  // ── Cash Payment ───────────────────────────────────────────────────────────
  const handleCashPayment = () => {
    Alert.alert(
      'Pay with Cash',
      `Hand ₹${fareAmount.toFixed(2)} to your driver to complete the ride.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `I've Paid`,
          onPress: async () => {
            setCashLoading(true);
            try {
              await apiClient.post('/payments/cash', {
                rideId: Number(rideId),
                ridePassengerId: Number(ridePassengerId),
                amountCollected: fareAmount,
              });
              onPaymentComplete();
            } catch {
              Alert.alert('Error', 'Could not record your payment. Please try again.');
            } finally {
              setCashLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Ride Completed</Text>
        <Text style={styles.subtitle}>Hope you had a great journey!</Text>

        {/* Fare display */}
        <View style={styles.fareCard}>
          <Text style={styles.fareLabel}>Total Fare</Text>
          <Text style={styles.fareAmount}>₹{fareAmount.toFixed(2)}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {/* Primary — Online / UPI */}
          <TouchableOpacity
            id="btn-pay-online"
            style={[styles.primaryBtn, isAnyLoading && styles.btnDisabled]}
            onPress={handleOnlinePayment}
            disabled={isAnyLoading}
            activeOpacity={0.85}
          >
            {onlineLoading ? (
              <ActivityIndicator color="#060A07" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Pay via UPI / Card</Text>
                <Text style={styles.primaryBtnSub}>Powered by Razorpay</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary — Cash */}
          <TouchableOpacity
            id="btn-pay-cash"
            style={[styles.secondaryBtn, isAnyLoading && styles.btnDisabled]}
            onPress={handleCashPayment}
            disabled={isAnyLoading}
            activeOpacity={0.85}
          >
            {cashLoading ? (
              <ActivityIndicator color="#BEFF00" />
            ) : (
              <Text style={styles.secondaryBtnText}>Pay with Cash</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06090A',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#101C12',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(190,255,0,0.2)',
    borderBottomWidth: 0,
  },

  // Header
  title: {
    color: '#EEF0E8',
    fontSize: 28,
    fontFamily: 'Outfit_800ExtraBold',
    marginBottom: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    marginBottom: 28,
  },

  // Fare card
  fareCard: {
    backgroundColor: '#06090A',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  fareLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  fareAmount: {
    color: '#BEFF00',
    fontSize: 52,
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: -1,
  },

  // Buttons
  actions: { gap: 14 },

  primaryBtn: {
    backgroundColor: '#BEFF00',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#060A07',
    fontSize: 16,
    fontFamily: 'Outfit_800ExtraBold',
  },
  primaryBtnSub: {
    color: 'rgba(6,10,7,0.5)',
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    marginTop: 2,
  },

  secondaryBtn: {
    backgroundColor: '#172018',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(190,255,0,0.25)',
  },
  secondaryBtnText: {
    color: '#BEFF00',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },

  btnDisabled: { opacity: 0.45 },
});