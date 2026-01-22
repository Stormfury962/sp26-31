/**
 * List Screen Component
 * Alternative view showing parking lots in a sortable list
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { fetchLots, selectAllLots, selectLotsLoading, refreshLots } from '../redux/slices/lotsSlice';
import { ParkingLot } from '../types';
import { AppDispatch } from '../redux/store';
import { Config } from '../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

type SortOption = 'distance' | 'availability' | 'name';

const ListScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const lots = useSelector(selectAllLots);
  const loading = useSelector(selectLotsLoading);
  
  const [sortBy, setSortBy] = useState<SortOption>('availability');
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (lots.length === 0) {
      dispatch(fetchLots());
    }
  }, [dispatch, lots.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(refreshLots());
    setRefreshing(false);
  }, [dispatch]);

  const calculateDistance = (lot: ParkingLot): number => {
    if (!userLocation) return 0;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lot.location.latitude - userLocation.latitude) * Math.PI / 180;
    const dLon = (lot.location.longitude - userLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * 
      Math.cos(lot.location.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getSortedLots = (): ParkingLot[] => {
    const sorted = [...lots];
    
    switch (sortBy) {
      case 'distance':
        return sorted.sort((a, b) => calculateDistance(a) - calculateDistance(b));
      case 'availability':
        return sorted.sort((a, b) => b.availableSpaces - a.availableSpaces);
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  };

  const renderLotItem = ({ item }: { item: ParkingLot }) => (
    <LotListItem 
      lot={item} 
      distance={userLocation ? calculateDistance(item) : null}
      onPress={() => {
        // Navigate to map view with this lot selected
        navigation.navigate('Map' as never);
      }}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Parking Lots</Text>
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortButtons}>
          <SortButton 
            label="Availability" 
            active={sortBy === 'availability'}
            onPress={() => setSortBy('availability')}
          />
          <SortButton 
            label="Distance" 
            active={sortBy === 'distance'}
            onPress={() => setSortBy('distance')}
          />
          <SortButton 
            label="Name" 
            active={sortBy === 'name'}
            onPress={() => setSortBy('name')}
          />
        </View>
      </View>
    </View>
  );

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
      <FlatList
        data={getSortedLots()}
        renderItem={renderLotItem}
        keyExtractor={(item) => item.lotId}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

interface LotListItemProps {
  lot: ParkingLot;
  distance: number | null;
  onPress: () => void;
}

const LotListItem: React.FC<LotListItemProps> = ({ lot, distance, onPress }) => {
  const occupancyRate = lot.occupancyRate / 100;
  const color = occupancyRate < Config.LOT_OCCUPANCY_THRESHOLDS.low 
    ? Config.SPACE_COLORS.available
    : occupancyRate < Config.LOT_OCCUPANCY_THRESHOLDS.high
    ? '#FFC107'
    : Config.SPACE_COLORS.occupied;

  return (
    <TouchableOpacity style={styles.lotItem} onPress={onPress}>
      <View style={styles.lotInfo}>
        <View style={styles.lotHeader}>
          <Text style={styles.lotName}>{lot.name}</Text>
          {distance !== null && (
            <View style={styles.distanceBadge}>
              <Icon name="location-on" size={14} color="#666" />
              <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
            </View>
          )}
        </View>
        
        <View style={styles.availabilityRow}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={styles.availabilityText}>
            {lot.availableSpaces} of {lot.totalSpaces} available
          </Text>
        </View>

        <View style={styles.occupancyBar}>
          <View 
            style={[
              styles.occupancyFill, 
              { width: `${lot.occupancyRate}%`, backgroundColor: color }
            ]} 
          />
        </View>
      </View>

      <Icon name="chevron-right" size={24} color="#CCC" />
    </TouchableOpacity>
  );
};

const SortButton: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
  label,
  active,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.sortButton, active && styles.sortButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.sortButtonText, active && styles.sortButtonTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  sortButtonActive: {
    backgroundColor: Config.SPACE_COLORS.available,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingVertical: 8,
  },
  lotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  lotInfo: {
    flex: 1,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lotName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  availabilityText: {
    fontSize: 14,
    color: '#666',
  },
  occupancyBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  occupancyFill: {
    height: '100%',
  },
});

export default ListScreen;
