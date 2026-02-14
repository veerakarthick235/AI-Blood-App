import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { URGENCY_LEVELS } from '../constants/bloodTypes';

interface Props {
  selected: string;
  onSelect: (urgency: string) => void;
}

export const UrgencySelector: React.FC<Props> = ({ selected, onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Urgency Level</Text>
      <View style={styles.row}>
        {URGENCY_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.button,
              { borderColor: level.color },
              selected === level.value && { backgroundColor: level.color },
            ]}
            onPress={() => onSelect(level.value)}
          >
            <Text
              style={[
                styles.buttonText,
                { color: selected === level.value ? '#FFFFFF' : level.color },
              ]}
            >
              {level.label}
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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
