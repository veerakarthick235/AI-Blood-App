import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BloodRequest } from '../api/bloodApi';

interface Props {
  request: BloodRequest;
  onPress: () => void;
  showAccept?: boolean;
  onAccept?: () => void;
}

export const RequestCard: React.FC<Props> = ({ request, onPress, showAccept, onAccept }) => {
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

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.bloodType}>
          <Ionicons name="water" size={20} color="#DC2626" />
          <Text style={styles.bloodTypeText}>{request.blood_type}</Text>
        </View>
        <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(request.urgency) }]}>
          <Text style={styles.urgencyText}>{request.urgency.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.info}>
        {request.hospital_name && (
          <View style={styles.infoRow}>
            <Ionicons name="business" size={16} color="#6B7280" />
            <Text style={styles.infoText}>{request.hospital_name}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Ionicons name="person" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            {request.patient_name || request.requester_name}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="water" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            {request.units_fulfilled}/{request.units_needed} units
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
            {request.status.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.date}>
          {new Date(request.created_at).toLocaleDateString()}
        </Text>
      </View>

      {showAccept && request.status !== 'fulfilled' && (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={(e) => {
            e.stopPropagation();
            onAccept?.();
          }}
        >
          <Ionicons name="heart" size={18} color="#FFFFFF" />
          <Text style={styles.acceptButtonText}>Accept & Donate</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bloodType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bloodTypeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DC2626',
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  info: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
