import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Vehicle, ServiceRecord } from '../data/mockVehicles';
import {
  createMaintenanceHistoryApi,
  updateVehicleApi,
  deleteMaintenanceHistoryApi,
} from '../services/vehicleApi';

interface VehiclesScreenProps {
  vehicles: Vehicle[];
  onAddVehicle: (newVeh: Vehicle) => void | Promise<void>;
  onUpdateVehicle: (updatedVeh: Vehicle) => void | Promise<void>;
  onDeleteVehicle: (vehicleId: string) => void | Promise<void>;
  onRefreshVehicles?: () => Promise<void>;
  isRefreshing?: boolean;
  showToast: (message: string, type?: 'success' | 'info') => void;
}

export default function VehiclesScreen({
  vehicles,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onRefreshVehicles,
  isRefreshing,
  showToast,
}: VehiclesScreenProps) {
  const { t, formatDistance } = useLanguage();
  const { colors, isDark } = useTheme();

  // Add Vehicle Modal state
  const [isAddVehModalOpen, setIsAddVehModalOpen] = useState(false);
  const [newVehType, setNewVehType] = useState<'bike' | 'car'>('bike');
  const [newVehName, setNewVehName] = useState('');
  const [newVehBrand, setNewVehBrand] = useState('');
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehOdo, setNewVehOdo] = useState('');
  const [newVehYear, setNewVehYear] = useState('2024');

  // Add Service Record Modal state
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [selectedVehForService, setSelectedVehForService] = useState<Vehicle | null>(null);
  const [newServiceItem, setNewServiceItem] = useState('');
  const [newServiceOdo, setNewServiceOdo] = useState('');
  const [newServiceCost, setNewServiceCost] = useState('');
  const [newServiceNotes, setNewServiceNotes] = useState('');

  // Quick Replace Oil Modal state
  const [isQuickOilModalOpen, setIsQuickOilModalOpen] = useState(false);
  const [quickOilVeh, setQuickOilVeh] = useState<Vehicle | null>(null);
  const [quickOilOdo, setQuickOilOdo] = useState('');

  // Handle Add New Vehicle
  const handleSaveNewVehicle = () => {
    if (!newVehName.trim() || !newVehBrand.trim() || !newVehOdo.trim()) {
      showToast('Please fill in Model, Brand, and Current ODO', 'info');
      return;
    }

    const odoNum = parseInt(newVehOdo, 10) || 0;
    const yearNum = parseInt(newVehYear, 10) || 2024;
    const today = new Date().toISOString().split('T')[0];

    const newVehicle: Vehicle = {
      id: `veh-${Date.now()}`,
      name: newVehName.trim(),
      brand: newVehBrand.trim(),
      type: newVehType,
      plateNumber: newVehPlate.trim() || 'N/A',
      currentOdoKm: odoNum,
      year: yearNum,
      lastOilDate: today,
      lastOilOdoKm: odoNum,
      oilIntervalKm: newVehType === 'bike' ? 3000 : 5000,
      serviceHistory: [
        {
          id: `srv-${Date.now()}`,
          serviceItem: 'Initial Vehicle Registration & Inspection',
          date: today,
          odoKm: odoNum,
          costVnd: '0 VND',
          notes: 'Registered in WayMate Garage',
        },
      ],
    };

    onAddVehicle(newVehicle);
    setIsAddVehModalOpen(false);
    setNewVehName('');
    setNewVehBrand('');
    setNewVehPlate('');
    setNewVehOdo('');
    showToast(t('vehicleAddedSuccess'), 'success');
  };

  // Handle Quick Oil Replacement Log
  const handleConfirmQuickOil = async () => {
    if (!quickOilVeh) return;
    const odoNum = parseInt(quickOilOdo, 10) || quickOilVeh.currentOdoKm;
    const today = new Date().toISOString().split('T')[0];

    // Sync with backend Neo4j Maintenance API
    let createdRecordId = `srv-${Date.now()}`;
    try {
      const res = await createMaintenanceHistoryApi(quickOilVeh.id, {
        name: 'Engine Oil & Filter Replacement',
        total: 850000,
        location: 'WayMate Quick Service Tracker',
        maintenanceRequests: [
          {
            name: 'Engine Oil Replacement',
            price: 850000,
          },
        ],
      });
      if (res && res.id) {
        createdRecordId = res.id;
      }
      if (odoNum > quickOilVeh.currentOdoKm) {
        await updateVehicleApi({
          id: quickOilVeh.id,
          odo: odoNum,
        });
      }
    } catch (err: any) {
      console.warn('[VehiclesScreen] Quick oil Neo4j sync error:', err.message);
    }

    const updatedVehicle: Vehicle = {
      ...quickOilVeh,
      currentOdoKm: Math.max(quickOilVeh.currentOdoKm, odoNum),
      lastOilDate: today,
      lastOilOdoKm: odoNum,
      serviceHistory: [
        {
          id: createdRecordId,
          serviceItem: 'Engine Oil & Filter Replacement',
          date: today,
          odoKm: odoNum,
          costVnd: '850,000 VND',
          notes: 'Fresh synthetic oil replacement logged via WayMate Tracker',
        },
        ...quickOilVeh.serviceHistory,
      ],
    };

    onUpdateVehicle(updatedVehicle);
    setIsQuickOilModalOpen(false);
    setQuickOilVeh(null);
    showToast(t('oilReplacedSuccess'), 'success');
  };

  // Handle Add Service Record
  const handleSaveServiceRecord = async () => {
    if (!selectedVehForService || !newServiceItem.trim()) {
      showToast('Please enter the service item description', 'info');
      return;
    }

    const odoNum = parseInt(newServiceOdo, 10) || selectedVehForService.currentOdoKm;
    const today = new Date().toISOString().split('T')[0];
    const costNumber = parseFloat(newServiceCost.replace(/[^0-9.]/g, '')) || 0;

    // Sync with backend Neo4j Maintenance API
    let createdRecordId = `srv-${Date.now()}`;
    try {
      const res = await createMaintenanceHistoryApi(selectedVehForService.id, {
        name: newServiceItem.trim(),
        total: costNumber,
        location: newServiceNotes.trim() || 'General maintenance check',
        maintenanceRequests: [
          {
            name: newServiceItem.trim(),
            price: costNumber,
          },
        ],
      });
      if (res && res.id) {
        createdRecordId = res.id;
      }
      if (odoNum > selectedVehForService.currentOdoKm) {
        await updateVehicleApi({
          id: selectedVehForService.id,
          odo: odoNum,
        });
      }
    } catch (err: any) {
      console.warn('[VehiclesScreen] Service record Neo4j sync error:', err.message);
    }

    const newRecord: ServiceRecord = {
      id: createdRecordId,
      serviceItem: newServiceItem.trim(),
      date: today,
      odoKm: odoNum,
      costVnd: newServiceCost.trim() ? `${newServiceCost.trim()} VND` : '0 VND',
      notes: newServiceNotes.trim() || 'General maintenance check',
    };

    const updatedVehicle: Vehicle = {
      ...selectedVehForService,
      currentOdoKm: Math.max(selectedVehForService.currentOdoKm, odoNum),
      serviceHistory: [newRecord, ...selectedVehForService.serviceHistory],
    };

    onUpdateVehicle(updatedVehicle);
    setIsAddServiceModalOpen(false);
    setSelectedVehForService(null);
    setNewServiceItem('');
    setNewServiceOdo('');
    setNewServiceCost('');
    setNewServiceNotes('');
    showToast(t('serviceAddedSuccess'), 'success');
  };

  const handleDeleteServiceRecord = (veh: Vehicle, recordId: string) => {
    Alert.alert(
      'Delete Service Record',
      'Are you sure you want to delete this maintenance record?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMaintenanceHistoryApi(recordId);
            } catch (err: any) {
              console.warn('[VehiclesScreen] Failed to delete maintenance in Neo4j:', err.message);
            }
            const updatedVehicle: Vehicle = {
              ...veh,
              serviceHistory: veh.serviceHistory.filter((s) => s.id !== recordId),
            };
            onUpdateVehicle(updatedVehicle);
            showToast('Service record deleted', 'info');
          },
        },
      ]
    );
  };

  const handleDeletePrompt = (veh: Vehicle) => {
    Alert.alert(
      t('deleteVehicle'),
      `${t('confirmDelete')} (${veh.name})`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('deleteVehicle'),
          style: 'destructive',
          onPress: () => {
            onDeleteVehicle(veh.id);
            showToast(t('vehicleDeletedSuccess'), 'info');
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefreshVehicles ? (
          <RefreshControl
            refreshing={isRefreshing || false}
            onRefresh={onRefreshVehicles}
            tintColor={colors.mBlue}
            colors={[colors.mBlue]}
          />
        ) : undefined
      }
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrapper}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{t('myVehicles')}</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]} numberOfLines={1} ellipsizeMode="tail">{t('vehiclesSubtitle')}</Text>
        </View>

        <TouchableOpacity
          style={[styles.addVehBtn, { backgroundColor: colors.mBlue, shadowColor: colors.mBlue }]}
          onPress={() => setIsAddVehModalOpen(true)}
          activeOpacity={0.8}
        >
          <AntDesign name="plus" size={13} color="#FFFFFF" />
          <Text style={styles.addVehBtnText}>{t('addVehicle')}</Text>
        </TouchableOpacity>
      </View>

      {/* Vehicles List */}
      {vehicles.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AntDesign name="car" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('noVehiclesYet')}</Text>
          <TouchableOpacity
            style={[styles.emptyAddBtn, { backgroundColor: colors.mBlue }]}
            onPress={() => setIsAddVehModalOpen(true)}
          >
            <Text style={styles.emptyAddBtnText}>{t('addVehicle')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        vehicles.map((veh) => {
          const nextDueKm = veh.lastOilOdoKm + veh.oilIntervalKm;
          const remainingKm = nextDueKm - veh.currentOdoKm;
          const isDue = remainingKm <= 0;
          const isWarning = remainingKm <= 500 && remainingKm > 0;

          return (
            <View key={veh.id} style={[styles.vehicleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Vehicle Title & Badge */}
              <View style={styles.cardHeader}>
                <View style={styles.vehTitleRow}>
                  <View style={[styles.vehTypeIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {veh.type === 'bike' ? (
                      <FontAwesome6 name="motorcycle" size={15} color={colors.mBlue} />
                    ) : (
                      <AntDesign name="car" size={16} color={colors.mRed} />
                    )}
                  </View>
                  <View style={styles.vehTextWrapper}>
                    <Text style={[styles.vehName, { color: colors.text }]} numberOfLines={1}>{veh.name}</Text>
                    <Text style={[styles.vehPlate, { color: colors.textMuted }]} numberOfLines={1} ellipsizeMode="tail">
                      {veh.brand} • {veh.plateNumber} • {veh.year}
                    </Text>
                  </View>
                </View>

                {/* Delete button */}
                <TouchableOpacity
                  onPress={() => handleDeletePrompt(veh)}
                  style={styles.deleteBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <AntDesign name="delete" size={14} color={colors.danger} />
                </TouchableOpacity>
              </View>

              {/* Current ODO Banner */}
              <View style={[styles.odoBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.odoLeft}>
                  <AntDesign name="dashboard" size={14} color={colors.textMuted} />
                  <Text style={[styles.odoLabel, { color: colors.textMuted }]}>{t('currentOdo')}</Text>
                </View>
                <Text style={[styles.odoValue, { color: colors.mBlue }]}>{formatDistance(veh.currentOdoKm)}</Text>
              </View>

              {/* Oil Maintenance Status Card */}
              <View style={[styles.oilSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.oilHeaderRow}>
                  <View style={styles.oilTitleRow}>
                    <FontAwesome6 name="oil-can" size={13} color={colors.mBlue} />
                    <Text style={[styles.oilSectionTitle, { color: colors.text }]}>{t('lastOilChange')}</Text>
                  </View>

                  <View
                    style={[
                      styles.oilStatusBadge,
                      isDue
                        ? styles.badgeDue
                        : isWarning
                        ? styles.badgeWarning
                        : styles.badgeGood,
                    ]}
                  >
                    <AntDesign
                      name={isDue ? 'warning' : 'check-circle'}
                      size={10}
                      color={isDue ? colors.danger : isWarning ? colors.warning : colors.success}
                    />
                    <Text
                      style={[
                        styles.oilStatusBadgeText,
                        isDue
                          ? { color: colors.danger }
                          : isWarning
                          ? { color: colors.warning }
                          : { color: colors.success },
                      ]}
                    >
                      {isDue ? t('oilStatusDue') : t('oilStatusGood')}
                    </Text>
                  </View>
                </View>

                {/* Oil Telemetry Details */}
                <View style={[styles.oilGrid, { backgroundColor: colors.cardAlt }]}>
                  <View style={styles.oilGridItem}>
                    <Text style={[styles.oilGridLabel, { color: colors.textMuted }]}>{t('oilChangeDate')}</Text>
                    <Text style={[styles.oilGridValue, { color: colors.text }]}>{veh.lastOilDate}</Text>
                  </View>
                  <View style={styles.oilGridItem}>
                    <Text style={[styles.oilGridLabel, { color: colors.textMuted }]}>{t('oilChangeOdo')}</Text>
                    <Text style={[styles.oilGridValue, { color: colors.text }]}>{formatDistance(veh.lastOilOdoKm)}</Text>
                  </View>
                  <View style={styles.oilGridItem}>
                    <Text style={[styles.oilGridLabel, { color: colors.textMuted }]}>{t('nextOilDue')}</Text>
                    <Text
                      style={[
                        styles.oilGridValue,
                        isDue ? { color: colors.danger } : { color: colors.mBlue },
                      ]}
                    >
                      {formatDistance(nextDueKm)}
                    </Text>
                  </View>
                </View>

                {/* Distance Remaining Notice */}
                <View style={styles.oilRemainingRow}>
                  <Text style={[styles.oilRemainingText, { color: colors.textSecondary }]}>
                    {isDue ? (
                      <Text style={{ color: colors.danger, fontWeight: '800' }}>
                        Overdue by {Math.abs(remainingKm)} KM!
                      </Text>
                    ) : (
                      <>
                        <Text style={{ color: colors.success, fontWeight: '800' }}>
                          {remainingKm} KM
                        </Text>{' '}
                        {t('remainingKm')}
                      </>
                    )}
                  </Text>

                  {/* Quick Replace Oil Log Button */}
                  <TouchableOpacity
                    style={[styles.replaceOilBtn, { backgroundColor: colors.mBlue }]}
                    onPress={() => {
                      setQuickOilVeh(veh);
                      setQuickOilOdo(veh.currentOdoKm.toString());
                      setIsQuickOilModalOpen(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <AntDesign name="tool" size={11} color="#FFFFFF" />
                    <Text style={styles.replaceOilBtnText}>{t('replaceOilNow')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Service & Maintenance History */}
              <View style={[styles.serviceSection, { borderTopColor: colors.border }]}>
                <View style={styles.serviceSectionHeader}>
                  <View style={styles.serviceTitleRow}>
                    <AntDesign name="file-text" size={13} color={colors.mBlue} />
                    <Text style={[styles.serviceSectionTitle, { color: colors.textSecondary }]}>{t('serviceHistory')}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.addRecordBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.mBlue }]}
                    onPress={() => {
                      setSelectedVehForService(veh);
                      setNewServiceOdo(veh.currentOdoKm.toString());
                      setIsAddServiceModalOpen(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <AntDesign name="plus" size={10} color={colors.mBlue} />
                    <Text style={[styles.addRecordBtnText, { color: colors.mBlue }]}>{t('addServiceRecord')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Service History Records */}
                <View style={styles.recordsList}>
                  {veh.serviceHistory.map((srv) => (
                    <View key={srv.id} style={[styles.recordItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.recordMain}>
                        <Text style={[styles.recordTitle, { color: colors.text }]}>{srv.serviceItem}</Text>
                        <Text style={[styles.recordSub, { color: colors.textMuted }]}>
                          {srv.date} • {formatDistance(srv.odoKm)}
                        </Text>
                        {srv.notes ? (
                          <Text style={[styles.recordNotes, { color: colors.textMuted }]}>{srv.notes}</Text>
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={[styles.recordCostBadge, { backgroundColor: colors.mBlueMuted }]}>
                          <Text style={[styles.recordCostText, { color: colors.mBlue }]}>{srv.costVnd}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteServiceRecord(veh, srv.id)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <AntDesign name="delete" size={13} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        })
      )}

      {/* ================= MODAL: ADD VEHICLE ================= */}
      <Modal
        visible={isAddVehModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddVehModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('newVehicleTitle')}</Text>
              <TouchableOpacity onPress={() => setIsAddVehModalOpen(false)}>
                <AntDesign name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Vehicle Type Switcher */}
            <View style={styles.typeSwitcherRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  newVehType === 'bike' && { backgroundColor: colors.mBlue, borderColor: colors.mBlue },
                ]}
                onPress={() => setNewVehType('bike')}
              >
                <FontAwesome6
                  name="motorcycle"
                  size={14}
                  color={newVehType === 'bike' ? '#FFFFFF' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: newVehType === 'bike' ? '#FFFFFF' : colors.textMuted },
                    newVehType === 'bike' && { fontWeight: '800' },
                  ]}
                >
                  {t('bike')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  newVehType === 'car' && { backgroundColor: colors.mBlue, borderColor: colors.mBlue },
                ]}
                onPress={() => setNewVehType('car')}
              >
                <AntDesign
                  name="car"
                  size={15}
                  color={newVehType === 'car' ? '#FFFFFF' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: newVehType === 'car' ? '#FFFFFF' : colors.textMuted },
                    newVehType === 'car' && { fontWeight: '800' },
                  ]}
                >
                  {t('car')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={styles.modalForm}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('vehicleName')}</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="e.g. Superbike 1000 or Civic"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={newVehName}
                  onChangeText={setNewVehName}
                />
              </View>

              <View style={styles.modalRowInputs}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('brand')}</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="e.g. Honda, Yamaha"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={newVehBrand}
                    onChangeText={setNewVehBrand}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('plateNumber')}</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="e.g. 59-A1 999.88"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={newVehPlate}
                    onChangeText={setNewVehPlate}
                  />
                </View>
              </View>

              <View style={styles.modalRowInputs}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('currentOdo')}</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="e.g. 15000"
                    placeholderTextColor={colors.inputPlaceholder}
                    keyboardType="number-pad"
                    value={newVehOdo}
                    onChangeText={setNewVehOdo}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('year')}</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="2024"
                    placeholderTextColor={colors.inputPlaceholder}
                    keyboardType="number-pad"
                    value={newVehYear}
                    onChangeText={setNewVehYear}
                  />
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => setIsAddVehModalOpen(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.mBlue }]}
                onPress={handleSaveNewVehicle}
              >
                <Text style={styles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: QUICK OIL LOG ================= */}
      <Modal
        visible={isQuickOilModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsQuickOilModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('replaceOilNow')}</Text>
              <TouchableOpacity onPress={() => setIsQuickOilModalOpen(false)}>
                <AntDesign name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitleText, { color: colors.textMuted }]}>
              Vehicle: <Text style={{ color: colors.text, fontWeight: '800' }}>{quickOilVeh?.name}</Text>
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Current ODO (KM) at Oil Replacement</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="e.g. 15420"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="number-pad"
                value={quickOilOdo}
                onChangeText={setQuickOilOdo}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => setIsQuickOilModalOpen(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.mBlue }]}
                onPress={handleConfirmQuickOil}
              >
                <Text style={styles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: ADD SERVICE RECORD ================= */}
      <Modal
        visible={isAddServiceModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddServiceModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('addServiceRecord')}</Text>
              <TouchableOpacity onPress={() => setIsAddServiceModalOpen(false)}>
                <AntDesign name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitleText, { color: colors.textMuted }]}>
              Vehicle: <Text style={{ color: colors.text, fontWeight: '800' }}>{selectedVehForService?.name}</Text>
            </Text>

            <View style={styles.modalForm}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('serviceItem')}</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="e.g. Brake Fluid Flush, New Tires"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={newServiceItem}
                  onChangeText={setNewServiceItem}
                />
              </View>

              <View style={styles.modalRowInputs}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ODO (KM)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="e.g. 15420"
                    placeholderTextColor={colors.inputPlaceholder}
                    keyboardType="number-pad"
                    value={newServiceOdo}
                    onChangeText={setNewServiceOdo}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('cost')}</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="e.g. 850,000"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={newServiceCost}
                    onChangeText={setNewServiceCost}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('notes')}</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, height: 60 }]}
                  placeholder="Service center, brand of parts used, etc."
                  placeholderTextColor={colors.inputPlaceholder}
                  multiline
                  value={newServiceNotes}
                  onChangeText={setNewServiceNotes}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => setIsAddServiceModalOpen(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.mBlue }]}
                onPress={handleSaveServiceRecord}
              >
                <Text style={styles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitleWrapper: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  addVehBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FF5E1A',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    flexShrink: 0,
    shadowColor: '#FF5E1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  addVehBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: 'rgba(21, 28, 44, 0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyAddBtn: {
    backgroundColor: '#FF5E1A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vehicleCard: {
    backgroundColor: 'rgba(21, 28, 44, 0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minWidth: 0,
    marginRight: 8,
  },
  vehTextWrapper: {
    flex: 1,
    minWidth: 0,
  },
  vehTypeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vehName: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  vehPlate: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    flexShrink: 0,
  },
  odoBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  odoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  odoLabel: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  odoValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00F2FE',
  },
  oilSection: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 10,
    gap: 8,
  },
  oilHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  oilTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  oilSectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  oilStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeGood: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  badgeDue: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  oilStatusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  oilGrid: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#0B0F19',
    borderRadius: 10,
    padding: 8,
  },
  oilGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  oilGridLabel: {
    fontSize: 9,
    color: '#94A3B8',
    marginBottom: 2,
  },
  oilGridValue: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  oilRemainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
    flexWrap: 'wrap',
    gap: 6,
  },
  oilRemainingText: {
    fontSize: 10,
    color: '#CBD5E1',
    flexShrink: 1,
  },
  replaceOilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF5E1A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  replaceOilBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  serviceSection: {
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 41, 59, 0.6)',
  },
  serviceSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  serviceSectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  addRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addRecordBtnText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FF9F1C',
  },
  recordsList: {
    gap: 6,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  recordMain: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  recordTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  recordSub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  recordNotes: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    fontStyle: 'italic',
  },
  recordCostBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recordCostText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#34D399',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 18,
    width: '100%',
    maxWidth: 440,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  modalSubtitleText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  typeSwitcherRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeBtnActive: {
    backgroundColor: '#FF5E1A',
    borderColor: '#FF5E1A',
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  modalForm: {
    gap: 10,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  modalRowInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  modalInput: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    color: '#FFFFFF',
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  cancelBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FF5E1A',
  },
  saveBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
