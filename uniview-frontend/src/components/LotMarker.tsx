/**
 * Lot Marker Component
 * Custom marker for parking lots on the map
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { ParkingLot } from '../types';

interface LotMarkerProps {
  lot: ParkingLot;
  color: string;
  onPress: () => void;
}

const LotMarker: React.FC<LotMarkerProps> = ({ lot, color, onPress }) => {
  const availabilityPercent = Math.round(
    (lot.availableSpaces / lot.totalSpaces) * 100
  );

  return (
    <Marker
      coordinate={lot.location}
      onPress={onPress}
      tracksViewChanges={false} // Performance optimization
    >
      <View style={[styles.markerContainer, { backgroundColor: color }]}>
        <Text style={styles.markerText}>{lot.availableSpaces}</Text>
        <View style={styles.markerArrow} />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  markerArrow: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
});

export default React.memo(LotMarker);
