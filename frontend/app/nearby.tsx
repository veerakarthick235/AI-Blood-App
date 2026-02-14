import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { bloodApi, DonorMatch } from '../src/api/bloodApi';
import { BloodTypeSelector } from '../src/components/BloodTypeSelector';

export default function NearbyDonorsScreen() {
  const router = useRouter();
  const [bloodType, setBloodType] = useState('O+');
  const [donors, setDonors] = useState<DonorMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const getLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to find nearby donors.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setLocationLoading(false);
    }
  };

  const searchDonors = async () => {
    if (!location) {
      Alert.alert('Location Required', 'Please get your location first.');
      return;
    }

    try {
      setLoading(true);
      const data = await bloodApi.getNearbyDonors(
        bloodType,
        location.latitude,
        location.longitude,
        100
      );
      setDonors(data);
    } catch (error) {
      console.error('Failed to fetch donors:', error);
      Alert.alert('Error', 'Failed to find nearby donors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (location) {
      searchDonors();
    }
  }, [location, bloodType]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Nearby Donors</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Blood Type Selector */}
        <BloodTypeSelector selected={bloodType} onSelect={setBloodType} />

        {/* Location Status */}
        <View style={styles.locationCard}>
          {locationLoading ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator color="#DC2626" />
              <Text style={styles.locationLoadingText}>Getting your location...</Text>
            </View>
          ) : location ? (
            <View style={styles.locationReady}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationReadyText}>Location Ready</Text>
                <Text style={styles.locationCoords}>
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </Text>
              </View>
              <TouchableOpacity onPress={getLocation}>
                <Ionicons name="refresh" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
              <Ionicons name="locate" size={20} color="#DC2626" />
              <Text style={styles.locationButtonText}>Get Location</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Button */}
        <TouchableOpacity
          style={[styles.searchButton, (!location || loading) && styles.searchButtonDisabled]}
          onPress={searchDonors}
          disabled={!location || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#FFFFFF" />
              <Text style={styles.searchButtonText}>Search Donors</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Results */}
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>
            {donors.length > 0 ? `${donors.length} Donors Found` : 'No donors found'}
          </Text>

          {donors.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No compatible donors found in your area</Text>
            </View>
          )}

          {donors.map((donor, index) => (
            <View key={index} style={styles.donorCard}>
              <View style={styles.donorHeader}>
                <View style={styles.donorInfo}>
                  <Text style={styles.donorName}>{donor.donor_name}</Text>
                  <View style={styles.donorBadges}>
                    <View style={styles.bloodBadge}>
                      <Text style={styles.bloodBadgeText}>{donor.blood_type}</Text>
                    </View>
                    <View style={[styles.statusBadge, !donor.is_available && styles.unavailableBadge]}>
                      <Text style={[styles.statusBadgeText, !donor.is_available && styles.unavailableText]}>
                        {donor.is_available ? 'Available' : 'Unavailable'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreValue}>{donor.compatibility_score.toFixed(0)}</Text>
                  <Text style={styles.scoreLabel}>Score</Text>
                </View>
              </View>
              <View style={styles.donorDetails}>
                <View style={styles.donorDetail}>
                  <Ionicons name="location" size={16} color="#6B7280" />
                  <Text style={styles.donorDetailText}>{donor.distance_km.toFixed(1)} km away</Text>
                </View>
                {donor.last_donation_date && (
                  <View style={styles.donorDetail}>
                    <Ionicons name="calendar" size={16} color="#6B7280" />
                    <Text style={styles.donorDetailText}>
                      Last donated: {new Date(donor.last_donation_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    padding: 16,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  locationReady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationReadyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  locationCoords: {
    fontSize: 12,
    color: '#6B7280',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    height: 52,
    marginBottom: 24,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
    textAlign: 'center',
  },
  donorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  donorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  donorBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  bloodBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bloodBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unavailableBadge: {
    backgroundColor: '#F3F4F6',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  unavailableText: {
    color: '#6B7280',
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 8,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  donorDetails: {
    gap: 8,
  },
  donorDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  donorDetailText: {
    fontSize: 13,
    color: '#6B7280',
  },
});
