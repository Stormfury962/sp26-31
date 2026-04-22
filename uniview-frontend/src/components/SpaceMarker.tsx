import React, { useEffect, useRef, useState } from 'react';
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

const SpaceMarker: React.FC<Props> = ({ space }) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTracksViewChanges(true);
    timerRef.current = setTimeout(() => setTracksViewChanges(false), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [space.status]);

  return (
    <Marker
      coordinate={space.location}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={[styles.marker, { backgroundColor: STATUS_COLORS[space.status] ?? STATUS_COLORS.offline }]} />
    </Marker>
  );
};

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
