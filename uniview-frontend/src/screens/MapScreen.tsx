/**
 * Map Screen Component
 * Interactive map showing parking lot availability in real-time
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import Geolocation from '@react-native-community/geolocation';
import { fetchLots, selectAllLots, selectLotsLoading } from '../redux/slices/lotsSlice';
import { selectLot, setMapRegion, selectMapRegion } from '../redux/slices/uiSlice';
import { websocketService } from '../services/websocketService';
import { Config } from '../config';
import { ParkingLot } from '../types';
import { AppDispatch } from '../redux/store';
import LotMarker from '../components/LotMarker';
import LotDetailSheet from '../components/LotDetailSheet';
import FilterButton from '../components/FilterButton';
import LocationButton from '../components/LocationButton';

const MapScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const lots = useSelector(selectAllLots);
  const loading = useSelector(selectLotsLoading);
  const mapRegion = useSelector(selectMapRegion);
  
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [visibleLots, setVisibleLots] = useState<string[]>([]);

  // Fetch parking lots on mount
  useEffect(() => {
    dispatch(fetchLots());
    
    // Connect to WebSocket for real-time updates
    websocketService.connect().catch(console.error);

    return () => {
      websocketService.disconnect();
    };
  }, [dispatch]);

  // Get user location
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Subscribe to visible lots for real-time updates
  useEffect(() => {
    if (visibleLots.length > 0) {
      websocketService.subscribeToVisible(visibleLots);
    }
  }, [visibleLots]);

  const getCurrentLocation = useCallback(() => {
    setLocationLoading(true);
    
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        
        // Animate to user location
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, Config.MAP_ANIMATION_DURATION);
        
        setLocationLoading(false);
      },
      (error) => {
        console.error('Location error:', error);
        setLocationLoading(false);
      },
      Config.GEOLOCATION_OPTIONS
    );
  }, []);

  const handleRegionChange = useCallback((region: Region) => {
    dispatch(setMapRegion(region));
    
    // Calculate visible lots based on map bounds
    const visible = lots
      .filter(lot => {
        const latDiff = Math.abs(lot.location.latitude - region.latitude);
        const lonDiff = Math.abs(lot.location.longitude - region.longitude);
        return latDiff < region.latitudeDelta && lonDiff < region.longitudeDelta;
      })
      .map(lot => lot.lotId);
    
    setVisibleLots(visible);
  }, [lots, dispatch]);

  const handleMarkerPress = useCallback((lot: ParkingLot) => {
    dispatch(selectLot(lot.lotId));
    
    // Center map on selected lot
    mapRef.current?.animateToRegion({
      ...lot.location,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, Config.MAP_ANIMATION_DURATION);
  }, [dispatch]);

  const getLotColor = (lot: ParkingLot): string => {
    const occupancyRate = lot.occupancyRate / 100;
    
    if (occupancyRate < Config.LOT_OCCUPANCY_THRESHOLDS.low) {
      return Config.SPACE_COLORS.available;
    } else if (occupancyRate < Config.LOT_OCCUPANCY_THRESHOLDS.medium) {
      return '#FFC107'; // Yellow
    } else if (occupancyRate < Config.LOT_OCCUPANCY_THRESHOLDS.high) {
      return Config.SPACE_COLORS.reserved;
    } else {
      return Config.SPACE_COLORS.occupied;
    }
  };

  if (loading && lots.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Config.SPACE_COLORS.available} />
        <Text style={styles.loadingText}>Loading parking lots...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion || Config.DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        toolbarEnabled={false}
      >
        {/* Parking Lot Markers */}
        {lots.map((lot) => (
          <LotMarker
            key={lot.lotId}
            lot={lot}
            color={getLotColor(lot)}
            onPress={() => handleMarkerPress(lot)}
          />
        ))}

        {/* User Location Marker (optional custom marker) */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            anchor={{ x: 0.5, y: 0.5 }}
          />
        )}
      </MapView>

      {/* Filter Button */}
      <View style={styles.topControls}>
        <FilterButton />
      </View>

      {/* Location Button */}
      <View style={styles.locationButton}>
        <LocationButton 
          onPress={getCurrentLocation}
          loading={locationLoading}
        />
      </View>

      {/* Lot Detail Bottom Sheet */}
      <LotDetailSheet />

      {/* Connection Status Indicator */}
      {!websocketService.isConnected() && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionText}>
            Reconnecting to live updates...
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 16,
    zIndex: 10,
  },
  locationButton: {
    position: 'absolute',
    bottom: 140,
    right: 16,
    zIndex: 10,
  },
  connectionBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    left: 16,
    right: 16,
    backgroundColor: '#FFC107',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    zIndex: 10,
  },
  connectionText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default MapScreen;
