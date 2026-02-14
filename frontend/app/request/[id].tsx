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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { bloodApi, BloodRequest, DonorMatch } from '../../src/api/bloodApi';

export default function RequestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptLoading, setAcceptLoading] = useState(false);

  const fetchRequest = async () => {
    try {
      const data = await bloodApi.getRequest(id as string);
      setRequest(data);
    } catch (error) {
      console.error('Failed to fetch request:', error);
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleAccept = async () => {
    try {
      setAcceptLoading(true);
      await bloodApi.acceptRequest(id as string);
      Alert.alert('Success', 'Thank you for accepting to donate!');
      fetchRequest();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to accept request');
    } finally {
      setAcceptLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return '#EF4444';
      case 'urgent':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return '#10B981';
      case 'matching':
        return '#3B82F6';
      case 'cancelled':
        return '#6B7280';
      default:
        return '#F59E0B';
    }
  };

  const isDonor = user?.role === 'donor';
  const isMyRequest = request?.requester_id === user?.id;
  const amMatched = request?.matched_donors.some((d) => d.donor_id === user?.id);
  const myMatch = request?.matched_donors.find((d) => d.donor_id === user?.id);
  const hasAccepted = myMatch?.status === 'accepted';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Request not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Blood Type Card */}
        <View style={styles.bloodCard}>
          <View style={styles.bloodHeader}>
            <View style={styles.bloodTypeContainer}>
              <Ionicons name="water" size={32} color="#FFFFFF" />
              <Text style={styles.bloodType}>{request.blood_type}</Text>
            </View>
            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(request.urgency) }]}>
              <Text style={styles.urgencyText}>{request.urgency.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.bloodStats}>
            <View style={styles.bloodStat}>
              <Text style={styles.bloodStatValue}>{request.units_needed}</Text>
              <Text style={styles.bloodStatLabel}>Units Needed</Text>
            </View>
            <View style={styles.bloodStatDivider} />
            <View style={styles.bloodStat}>
              <Text style={styles.bloodStatValue}>{request.units_fulfilled}</Text>
              <Text style={styles.bloodStatLabel}>Fulfilled</Text>
            </View>
            <View style={styles.bloodStatDivider} />
            <View style={styles.bloodStat}>
              <Text style={styles.bloodStatValue}>{request.matched_donors.length}</Text>
              <Text style={styles.bloodStatLabel}>Donors Matched</Text>
            </View>
          </View>
        </View>

        {/* Status */}
        <View style={styles.section}>
          <View style={[styles.statusCard, { borderLeftColor: getStatusColor(request.status) }]}>
            <View style={[styles.statusIcon, { backgroundColor: getStatusColor(request.status) + '20' }]}>
              <Ionicons
                name={
                  request.status === 'fulfilled'
                    ? 'checkmark-circle'
                    : request.status === 'matching'
                    ? 'search'
                    : 'time'
                }
                size={24}
                color={getStatusColor(request.status)}
              />
            </View>
            <View>
              <Text style={[styles.statusLabel, { color: getStatusColor(request.status) }]}>
                {request.status.toUpperCase()}
              </Text>
              <Text style={styles.statusDesc}>
                {request.status === 'fulfilled'
                  ? 'Blood request has been fulfilled'
                  : request.status === 'matching'
                  ? 'Searching for compatible donors'
                  : 'Waiting for donor matches'}
              </Text>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailCard}>
            {request.hospital_name && (
              <View style={styles.detailRow}>
                <Ionicons name="business" size={20} color="#6B7280" />
                <Text style={styles.detailText}>{request.hospital_name}</Text>
              </View>
            )}
            {request.hospital_address && (
              <View style={styles.detailRow}>
                <Ionicons name="location" size={20} color="#6B7280" />
                <Text style={styles.detailText}>{request.hospital_address}</Text>
              </View>
            )}
            {request.patient_name && (
              <View style={styles.detailRow}>
                <Ionicons name="person" size={20} color="#6B7280" />
                <Text style={styles.detailText}>{request.patient_name}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="person-circle" size={20} color="#6B7280" />
              <Text style={styles.detailText}>Requested by: {request.requester_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={20} color="#6B7280" />
              <Text style={styles.detailText}>
                {new Date(request.created_at).toLocaleString()}
              </Text>
            </View>
            {request.notes && (
              <View style={styles.detailRow}>
                <Ionicons name="document-text" size={20} color="#6B7280" />
                <Text style={styles.detailText}>{request.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* AI Recommendation */}
        {request.ai_recommendation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Recommendation</Text>
            <View style={styles.aiCard}>
              <Ionicons name="bulb" size={24} color="#8B5CF6" />
              <Text style={styles.aiText}>{request.ai_recommendation}</Text>
            </View>
          </View>
        )}

        {/* Matched Donors (for requester) */}
        {isMyRequest && request.matched_donors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Matched Donors ({request.matched_donors.length})</Text>
            {request.matched_donors.map((donor: DonorMatch, index: number) => (
              <View key={index} style={styles.donorCard}>
                <View style={styles.donorHeader}>
                  <View style={styles.donorInfo}>
                    <Text style={styles.donorName}>{donor.donor_name}</Text>
                    <View style={styles.donorBadges}>
                      <View style={styles.bloodBadge}>
                        <Text style={styles.bloodBadgeText}>{donor.blood_type}</Text>
                      </View>
                      {donor.is_available && (
                        <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
                          <Text style={[styles.statusBadgeText, { color: '#059669' }]}>Available</Text>
                        </View>
                      )}
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
                  {donor.status && (
                    <View style={[styles.donorStatusBadge, donor.status === 'accepted' && styles.acceptedBadge]}>
                      <Text style={[styles.donorStatusText, donor.status === 'accepted' && styles.acceptedText]}>
                        {donor.status.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Accept Button (for donors) */}
        {isDonor && amMatched && !hasAccepted && request.status !== 'fulfilled' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.acceptButton, acceptLoading && styles.acceptButtonDisabled]}
              onPress={handleAccept}
              disabled={acceptLoading}
            >
              {acceptLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="heart" size={24} color="#FFFFFF" />
                  <Text style={styles.acceptButtonText}>Accept & Donate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Already Accepted */}
        {isDonor && hasAccepted && (
          <View style={styles.section}>
            <View style={styles.acceptedCard}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              <Text style={styles.acceptedText}>You have accepted this request</Text>
              <Text style={styles.acceptedDesc}>Please contact the hospital for donation arrangements.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
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
  },
  bloodCard: {
    backgroundColor: '#DC2626',
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  bloodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  bloodTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bloodType: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  urgencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bloodStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
  },
  bloodStat: {
    alignItems: 'center',
  },
  bloodStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bloodStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  bloodStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    gap: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 16,
  },
  aiText: {
    flex: 1,
    fontSize: 14,
    color: '#5B21B6',
    lineHeight: 20,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  donorDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  donorDetailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  donorStatusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  acceptedBadge: {
    backgroundColor: '#D1FAE5',
  },
  donorStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  acceptedText: {
    color: '#059669',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    height: 56,
  },
  acceptButtonDisabled: {
    opacity: 0.7,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  acceptedCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  acceptedDesc: {
    fontSize: 13,
    color: '#059669',
    marginTop: 4,
    textAlign: 'center',
  },
});
