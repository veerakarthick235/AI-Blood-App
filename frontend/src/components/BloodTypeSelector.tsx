import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BLOOD_TYPES } from '../constants/bloodTypes';

interface Props {
  selected: string;
  onSelect: (type: string) => void;
}

export const BloodTypeSelector: React.FC<Props> = ({ selected, onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Blood Type</Text>
      <View style={styles.grid}>
        {BLOOD_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.button,
              selected === type && styles.buttonSelected,
            ]}
            onPress={() => onSelect(type)}
          >
            <Text
              style={[
                styles.buttonText,
                selected === type && styles.buttonTextSelected,
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    width: '22%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  buttonSelected: {
    backgroundColor: '#DC2626',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  buttonTextSelected: {
    color: '#FFFFFF',
  },
});
