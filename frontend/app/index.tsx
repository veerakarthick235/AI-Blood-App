import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { bloodApi, BloodRequest, Notification } from '../src/api/bloodApi';
import { StatCard } from '../src/components/StatCard';
import { RequestCard } from '../src/components/RequestCard';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [statsData, requestsData, notificationsData] = await Promise.all([
        bloodApi.getDashboardStats(),
        bloodApi.getRequests(),
        bloodApi.getNotifications(),
      ]);
      setStats(statsData);
      setRequests(requestsData);
      setNotifications(notificationsData.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await bloodApi.acceptRequest(requestId);
      fetchData();
    } catch (error: any) {
      console.error('Failed to accept request:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  const isDonor = user.role === 'donor';
  const hasProfile = user.donor_profile?.blood_type;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user.full_name}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push('/notifications')}
            >
              <Ionicons name="notifications" size={24} color="#374151" />
              {stats?.unread_notifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{stats.unread_notifications}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
              <Ionicons name="person-circle" size={32} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Blood Type Banner */}
        {isDonor && hasProfile && (
          <View style={styles.bloodBanner}>
            <View style={styles.bloodInfo}>
              <Ionicons name="water" size={32} color="#FFFFFF" />
              <View>
                <Text style={styles.bloodTypeLabel}>Your Blood Type</Text>
                <Text style={styles.bloodTypeValue}>{user.donor_profile?.blood_type}</Text>
              </View>
            </View>
            <View style={[styles.availabilityBadge, !user.donor_profile?.is_available && styles.unavailable]}>
              <Text style={styles.availabilityText}>
                {user.donor_profile?.is_available ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          </View>
        )}

        {/* Setup Profile Prompt */}
        {isDonor && !hasProfile && (
          <TouchableOpacity style={styles.setupPrompt} onPress={() => router.push('/donor/profile')}>
            <Ionicons name="alert-circle" size={24} color="#F59E0B" />
            <View style={styles.setupPromptText}>
              <Text style={styles.setupPromptTitle}>Complete Your Donor Profile</Text>
              <Text style={styles.setupPromptDesc}>Add your blood type and location to start saving lives</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6B7280" />
          </TouchableOpacity>
        )}

        {/* Stats */}
        {loadingData ? (
          <ActivityIndicator style={styles.loading} color="#DC2626" />
        ) : (
          <View style={styles.statsContainer}>
            {isDonor ? (
              <>
                <StatCard icon="heart" label="Donations" value={stats?.total_donations || 0} color="#DC2626" />
                <StatCard icon="time" label="Pending" value={stats?.pending_requests || 0} color="#F59E0B" />
                <StatCard icon="people" label="Lives Saved" value={stats?.lives_saved || 0} color="#10B981" />
              </>
            ) : (
              <>
                <StatCard icon="document-text" label="Requests" value={stats?.total_requests || 0} color="#3B82F6" />
                <StatCard icon="checkmark-circle" label="Fulfilled" value={stats?.fulfilled_requests || 0} color="#10B981" />
                <StatCard icon="time" label="Pending" value={stats?.pending_requests || 0} color="#F59E0B" />
              </>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {!isDonor && (
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/request/create')}>
                <View style={[styles.actionIcon, { backgroundColor: '#DC262620' }]}>
                  <Ionicons name="add-circle" size={28} color="#DC2626" />
                </View>
                <Text style={styles.actionLabel}>New Request</Text>
              </TouchableOpacity>
            )}
            {isDonor && (
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/donor/profile')}>
                <View style={[styles.actionIcon, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="person" size={28} color="#3B82F6" />
                </View>
                <Text style={styles.actionLabel}>My Profile</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/requests')}>
              <View style={[styles.actionIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="list" size={28} color="#10B981" />
              </View>
              <Text style={styles.actionLabel}>All Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/nearby')}>
              <View style={[styles.actionIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="location" size={28} color="#F59E0B" />
              </View>
              <Text style={styles.actionLabel}>Nearby Donors</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isDonor ? 'Requests For You' : 'Your Requests'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/requests')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No requests yet</Text>
            </View>
          ) : (
            requests.slice(0, 3).map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onPress={() => router.push(`/request/${request.id}`)}
                showAccept={isDonor}
                onAccept={() => handleAcceptRequest(request.id)}
              />
            ))
          )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  profileButton: {},
  bloodBanner: {
    marginHorizontal: 20,
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  bloodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bloodTypeLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  bloodTypeValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  availabilityBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  unavailable: {
    backgroundColor: '#6B7280',
  },
  availabilityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  setupPrompt: {
    marginHorizontal: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  setupPromptText: {
    flex: 1,
  },
  setupPromptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  setupPromptDesc: {
    fontSize: 13,
    color: '#B45309',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  loading: {
    marginVertical: 40,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
