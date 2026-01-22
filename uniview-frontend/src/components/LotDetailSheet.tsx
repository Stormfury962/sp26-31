/**
 * Lot Detail Sheet Component
 * Bottom sheet showing detailed parking lot information and predictions
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { LineChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
import {
  selectLotById,
  selectAllLots,
} from '../redux/slices/lotsSlice';
import {
  fetchPrediction,
  selectPredictionByLotId,
  selectPredictionsLoading,
} from '../redux/slices/predictionsSlice';
import {
  selectSelectedLotId,
  selectBottomSheetVisible,
  closeBottomSheet,
} from '../redux/slices/uiSlice';
import { Config } from '../config';
import { AppDispatch, RootState } from '../redux/store';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');
const SHEET_HEIGHT = 400;

const LotDetailSheet: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedLotId = useSelector(selectSelectedLotId);
  const isVisible = useSelector(selectBottomSheetVisible);
  const lots = useSelector(selectAllLots);
  const lot = useSelector((state: RootState) => 
    selectedLotId ? selectLotById(state, selectedLotId) : null
  );
  const prediction = useSelector((state: RootState) =>
    selectedLotId ? selectPredictionByLotId(state, selectedLotId) : null
  );
  const predictionsLoading = useSelector(selectPredictionsLoading);
  const [showPrediction, setShowPrediction] = useState(false);

  useEffect(() => {
    if (selectedLotId && showPrediction) {
      dispatch(fetchPrediction(selectedLotId));
    }
  }, [selectedLotId, showPrediction, dispatch]);

  if (!isVisible || !lot) {
    return null;
  }

  const occupancyPercent = Math.round(lot.occupancyRate);
  const availabilityColor = getAvailabilityColor(lot.occupancyRate / 100);

  const handleClose = () => {
    dispatch(closeBottomSheet());
    setShowPrediction(false);
  };

  const handleTogglePrediction = () => {
    setShowPrediction(!showPrediction);
  };

  const getChartData = () => {
    if (!prediction) return null;

    const labels = prediction.predictions.slice(0, 6).map((p) =>
      format(new Date(p.timestamp), 'HH:mm')
    );

    const data = prediction.predictions.slice(0, 6).map((p) => p.predictedOccupancy);

    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  return (
    <View style={[styles.container, { height: showPrediction ? SHEET_HEIGHT + 200 : SHEET_HEIGHT }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.handle} />
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Icon name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Lot Name */}
        <Text style={styles.lotName}>{lot.name}</Text>

        {/* Availability Summary */}
        <View style={[styles.availabilityCard, { backgroundColor: availabilityColor }]}>
          <View style={styles.availabilityRow}>
            <View style={styles.availabilityColumn}>
              <Text style={styles.availabilityNumber}>{lot.availableSpaces}</Text>
              <Text style={styles.availabilityLabel}>Available</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.availabilityColumn}>
              <Text style={styles.availabilityNumber}>{lot.totalSpaces}</Text>
              <Text style={styles.availabilityLabel}>Total Spaces</Text>
            </View>
          </View>
          <View style={styles.occupancyBar}>
            <View style={[styles.occupancyFill, { width: `${occupancyPercent}%` }]} />
          </View>
          <Text style={styles.occupancyText}>{occupancyPercent}% Occupied</Text>
        </View>

        {/* Quick Info */}
        <View style={styles.infoSection}>
          <InfoRow 
            icon="update" 
            label="Last Updated" 
            value={format(new Date(lot.lastUpdate), 'h:mm a')}
          />
          {lot.operatingHours && (
            <InfoRow 
              icon="schedule" 
              label="Operating Hours" 
              value={`${lot.operatingHours.open} - ${lot.operatingHours.close}`}
            />
          )}
          {lot.amenities && lot.amenities.length > 0 && (
            <InfoRow 
              icon="local-parking" 
              label="Amenities" 
              value={lot.amenities.join(', ')}
            />
          )}
        </View>

        {/* Prediction Toggle */}
        <TouchableOpacity 
          style={styles.predictionButton}
          onPress={handleTogglePrediction}
        >
          <Icon name="show-chart" size={20} color="#fff" />
          <Text style={styles.predictionButtonText}>
            {showPrediction ? 'Hide' : 'Show'} 3-Hour Prediction
          </Text>
          <Icon 
            name={showPrediction ? 'expand-less' : 'expand-more'} 
            size={20} 
            color="#fff" 
          />
        </TouchableOpacity>

        {/* Prediction Chart */}
        {showPrediction && (
          <View style={styles.predictionSection}>
            {predictionsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Config.SPACE_COLORS.available} />
                <Text style={styles.loadingText}>Loading prediction...</Text>
              </View>
            ) : prediction ? (
              <>
                <Text style={styles.sectionTitle}>Predicted Occupancy</Text>
                <LineChart
                  data={getChartData()!}
                  width={width - 32}
                  height={180}
                  chartConfig={{
                    backgroundColor: '#fff',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: Config.SPACE_COLORS.available,
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
                <Text style={styles.predictionNote}>
                  Based on historical patterns and current trends
                </Text>
              </>
            ) : (
              <Text style={styles.errorText}>Unable to load prediction</Text>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="directions" size={24} color={Config.SPACE_COLORS.available} />
            <Text style={styles.actionText}>Navigate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="star-border" size={24} color={Config.SPACE_COLORS.available} />
            <Text style={styles.actionText}>Favorite</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="notifications-none" size={24} color={Config.SPACE_COLORS.available} />
            <Text style={styles.actionText}>Notify</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <View style={styles.infoRow}>
    <Icon name={icon} size={20} color="#666" />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const getAvailabilityColor = (rate: number): string => {
  if (rate < Config.LOT_OCCUPANCY_THRESHOLDS.low) {
    return '#E8F5E9'; // Light green
  } else if (rate < Config.LOT_OCCUPANCY_THRESHOLDS.medium) {
    return '#FFF9C4'; // Light yellow
  } else if (rate < Config.LOT_OCCUPANCY_THRESHOLDS.high) {
    return '#FFE0B2'; // Light orange
  } else {
    return '#FFCDD2'; // Light red
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  content: {
    paddingHorizontal: 16,
  },
  lotName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  availabilityCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  availabilityColumn: {
    alignItems: 'center',
  },
  availabilityNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  availabilityLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    width: 1,
    backgroundColor: '#DDD',
  },
  occupancyBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  occupancyFill: {
    height: '100%',
    backgroundColor: Config.SPACE_COLORS.occupied,
  },
  occupancyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  infoSection: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  predictionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Config.SPACE_COLORS.available,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  predictionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  predictionSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  predictionNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    textAlign: 'center',
    padding: 32,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginBottom: 16,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
  },
});

export default LotDetailSheet;
