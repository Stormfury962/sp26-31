import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Config } from '../config';

/* TODO: Google Sign-In — re-enable when ready
import { useDispatch, useSelector } from 'react-redux';
import { GoogleSignin, GoogleSigninButton, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from '../types';
import { loginWithGoogle, clearUser } from '../redux/slices/userSlice';

GoogleSignin.configure({ webClientId: Config.GOOGLE_WEB_CLIENT_ID });
*/

const ProfileScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Icon name="person" size={44} color="#fff" />
        </View>
        <Text style={styles.userName}>Demo User</Text>
        <Text style={styles.userEmail}>Rutgers University</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Student</Text>
        </View>
      </View>

      <View style={styles.section}>
        <InfoRow icon="local-parking" label="Favorite lots" value="Coming soon" />
        <InfoRow icon="history" label="Parking history" value="Coming soon" />
        <InfoRow icon="notifications" label="Notifications" value="Coming soon" />
      </View>

      <View style={styles.signInNote}>
        <Icon name="info-outline" size={18} color="#999" />
        <Text style={styles.signInNoteText}>Google Sign-In coming soon</Text>
      </View>
    </ScrollView>
  );
};

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Icon name={icon} size={22} color="#666" style={styles.infoIcon} />
    <View style={styles.infoText}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Config.SPACE_COLORS.available,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  roleText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  infoIcon: {
    marginRight: 14,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#1A1A2E',
    fontWeight: '500',
  },
  signInNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  signInNoteText: {
    color: '#999',
    fontSize: 13,
  },
});

export default ProfileScreen;
