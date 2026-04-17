import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { ParkingSpace } from '../types';

interface Props {
  space: ParkingSpace;
}

const STATUS_COLORS: Record<ParkingSpace['status'], string> = {
  available: '#4CAF50',
  occupied: '#F44336',
  reserved: '#FF9800',
  offline: '#9E9E9E',
};

const SpaceMarker: React.FC<Props> = ({ space }) => (
  <Marker
    coordinate={space.location}
    anchor={{ x: 0.5, y: 0.5 }}
    tracksViewChanges={false}
  >
    <View style={[styles.marker, { backgroundColor: STATUS_COLORS[space.status] ?? STATUS_COLORS.offline }]} />
  </Marker>
);

const styles = StyleSheet.create({
  marker: {
    width: 10,
    height: 18,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    opacity: 0.85,
  },
});

export default SpaceMarker;
