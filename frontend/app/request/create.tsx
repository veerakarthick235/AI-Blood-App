import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { bloodApi } from '../../src/api/bloodApi';
import { BloodTypeSelector } from '../../src/components/BloodTypeSelector';
import { UrgencySelector } from '../../src/components/UrgencySelector';

export default function CreateRequestScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const [bloodType, setBloodType] = useState('');
  const [unitsNeeded, setUnitsNeeded] = useState('1');
  const [urgency, setUrgency] = useState('normal');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [patientName, setPatientName] = useState('');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);

      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addressResult) {
        const addr = [
          addressResult.street,
          addressResult.city,
          addressResult.region,
        ]
          .filter(Boolean)
          .join(', ');
        setHospitalAddress(addr);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!bloodType) {
      Alert.alert('Error', 'Please select a blood type');
      return;
    }

    try {
      setLoading(true);
      const request = await bloodApi.createRequest({
        blood_type: bloodType,
        units_needed: parseInt(unitsNeeded) || 1,
        urgency,
        hospital_name: hospitalName || undefined,
        hospital_address: hospitalAddress || undefined,
        latitude,
        longitude,
        patient_name: patientName || undefined,
        notes: notes || undefined,
      });

      Alert.alert(
        'Request Created',
        `Blood request created successfully! ${request.matched_donors.length} donors found nearby.`,
        [
          {
            text: 'View Request',
            onPress: () => router.replace(`/request/${request.id}`),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Blood Request</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Blood Type */}
          <BloodTypeSelector selected={bloodType} onSelect={setBloodType} />

          {/* Urgency */}
          <UrgencySelector selected={urgency} onSelect={setUrgency} />

          {/* Units Needed */}
          <View style={styles.section}>
            <Text style={styles.label}>Units Needed</Text>
            <View style={styles.unitsRow}>
              {['1', '2', '3', '4', '5+'].map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.unitButton,
                    unitsNeeded === unit && styles.unitButtonSelected,
                  ]}
                  onPress={() => setUnitsNeeded(unit)}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      unitsNeeded === unit && styles.unitButtonTextSelected,
                    ]}
                  >
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.label}>Location</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <>
                  <Ionicons name="locate" size={20} color="#DC2626" />
                  <Text style={styles.locationButtonText}>Use Current Location</Text>
                </>
              )}
            </TouchableOpacity>

            {latitude && longitude && (
              <View style={styles.coordsDisplay}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.coordsText}>Location set successfully</Text>
              </View>
            )}
          </View>

          {/* Hospital Details */}
          <View style={styles.section}>
            <Text style={styles.label}>Hospital / Clinic Details</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="business" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Hospital Name"
                placeholderTextColor="#9CA3AF"
                value={hospitalName}
                onChangeText={setHospitalName}
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="location" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Hospital Address"
                placeholderTextColor="#9CA3AF"
                value={hospitalAddress}
                onChangeText={setHospitalAddress}
              />
            </View>
          </View>

          {/* Patient Details */}
          <View style={styles.section}>
            <Text style={styles.label}>Patient Details (Optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Patient Name"
                placeholderTextColor="#9CA3AF"
                value={patientName}
                onChangeText={setPatientName}
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="document-text" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional Notes"
                placeholderTextColor="#9CA3AF"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Create Request</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  unitsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  unitButtonSelected: {
    backgroundColor: '#DC2626',
  },
  unitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  unitButtonTextSelected: {
    color: '#FFFFFF',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  coordsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  coordsText: {
    fontSize: 14,
    color: '#059669',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 16,
  },
  input: {
    flex: 1,
    minHeight: 52,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    height: 52,
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
