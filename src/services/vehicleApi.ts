import { API_BASE_URL } from '../config/api';
import { getAuthToken } from './authApi';
import { Vehicle, ServiceRecord } from '../data/mockVehicles';

export interface BackendVehicleResponse {
  id: string;
  name: string;
  capacity?: number;
  odo?: number;
  date?: number;
  brand?: string;
  plateNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVehiclePayload {
  name: string;
  capacity?: number;
  odo?: number;
  date?: number;
  brand?: string;
  plateNumber?: string;
}

export interface UpdateVehiclePayload {
  id: string;
  name?: string;
  capacity?: number;
  odo?: number;
  date?: number;
  brand?: string;
  plateNumber?: string;
}

export interface BackendMaintenanceResponse {
  id?: string;
  name: string;
  price?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendMaintenanceHistoryResponse {
  id: string;
  name: string;
  total?: number;
  location?: string;
  vehicleId?: string;
  maintenances?: BackendMaintenanceResponse[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMaintenanceHistoryPayload {
  name: string;
  total?: number;
  location?: string;
  maintenanceRequests?: Array<{
    id?: string;
    name: string;
    price?: number;
  }>;
}

export interface UpdateMaintenanceHistoryPayload {
  id: string;
  name?: string;
  total?: number;
  location?: string;
  maintenanceRequests?: Array<{
    id?: string;
    name: string;
    price?: number;
  }>;
}

function isNetworkOrAbortError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    error.name === 'AbortError' ||
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('cancel') ||
    msg.includes('abort') ||
    msg.includes('timeout')
  );
}

async function requestWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const token = getAuthToken();
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...authHeaders,
        ...(options.headers || {}),
      },
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Fetch all vehicles owned by a user from Neo4j
 * Endpoint: GET /api/v1/vehicle?userId={userId}
 */
export async function getVehiclesByUserId(userId: string): Promise<BackendVehicleResponse[]> {
  const url = `${API_BASE_URL}/api/v1/vehicle?userId=${encodeURIComponent(userId)}`;
  const response = await requestWithTimeout(url, { method: 'GET' });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch vehicles (${response.status})`);
  }
  return (await response.json()) as BackendVehicleResponse[];
}

/**
 * Create a new vehicle for a user in Neo4j
 * Endpoint: POST /api/v1/vehicle?userId={userId}
 */
export async function createVehicleApi(
  userId: string,
  payload: CreateVehiclePayload
): Promise<BackendVehicleResponse> {
  const url = `${API_BASE_URL}/api/v1/vehicle?userId=${encodeURIComponent(userId)}`;
  const response = await requestWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to create vehicle (${response.status})`);
  }
  return (await response.json()) as BackendVehicleResponse;
}

/**
 * Update an existing vehicle in Neo4j
 * Endpoint: PUT /api/v1/vehicle
 */
export async function updateVehicleApi(payload: UpdateVehiclePayload): Promise<BackendVehicleResponse> {
  const url = `${API_BASE_URL}/api/v1/vehicle`;
  const response = await requestWithTimeout(url, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to update vehicle (${response.status})`);
  }
  return (await response.json()) as BackendVehicleResponse;
}

/**
 * Delete a vehicle by ID from Neo4j
 * Endpoint: DELETE /api/v1/vehicle/{vehicleId}
 */
export async function deleteVehicleApi(vehicleId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/v1/vehicle/${encodeURIComponent(vehicleId)}`;
  const response = await requestWithTimeout(url, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to delete vehicle (${response.status})`);
  }
}

/**
 * Get all maintenance histories for a vehicle from Neo4j
 * Endpoint: GET /api/v1/maintenance?vehicleId={vehicleId}
 */
export async function getMaintenancesByVehicleId(
  vehicleId: string
): Promise<BackendMaintenanceHistoryResponse[]> {
  const url = `${API_BASE_URL}/api/v1/maintenance?vehicleId=${encodeURIComponent(vehicleId)}`;
  const response = await requestWithTimeout(url, { method: 'GET' });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch maintenance history (${response.status})`);
  }
  return (await response.json()) as BackendMaintenanceHistoryResponse[];
}

/**
 * Create a new maintenance history record in Neo4j
 * Endpoint: POST /api/v1/maintenance?vehicleId={vehicleId}
 */
export async function createMaintenanceHistoryApi(
  vehicleId: string,
  payload: CreateMaintenanceHistoryPayload
): Promise<BackendMaintenanceHistoryResponse> {
  const url = `${API_BASE_URL}/api/v1/maintenance?vehicleId=${encodeURIComponent(vehicleId)}`;
  const response = await requestWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to create maintenance history (${response.status})`);
  }
  return (await response.json()) as BackendMaintenanceHistoryResponse;
}

/**
 * Update an existing maintenance history record in Neo4j
 * Endpoint: PUT /api/v1/maintenance
 */
export async function updateMaintenanceHistoryApi(
  payload: UpdateMaintenanceHistoryPayload
): Promise<BackendMaintenanceHistoryResponse> {
  const url = `${API_BASE_URL}/api/v1/maintenance`;
  const response = await requestWithTimeout(url, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to update maintenance history (${response.status})`);
  }
  return (await response.json()) as BackendMaintenanceHistoryResponse;
}

/**
 * Delete a maintenance history record from Neo4j
 * Endpoint: DELETE /api/v1/maintenance/{maintenanceHistoryId}
 */
export async function deleteMaintenanceHistoryApi(maintenanceHistoryId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/v1/maintenance/${encodeURIComponent(maintenanceHistoryId)}`;
  const response = await requestWithTimeout(url, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to delete maintenance history (${response.status})`);
  }
}

/**
 * Maps Backend Vehicle and Maintenance History to the Client's Vehicle UI model
 */
export function mapBackendToClientVehicle(
  bVeh: BackendVehicleResponse,
  maintenances: BackendMaintenanceHistoryResponse[] = []
): Vehicle {
  const serviceHistory: ServiceRecord[] = maintenances.map((m) => {
    const dateFormatted = m.createdAt
      ? m.createdAt.split('T')[0]
      : new Date().toISOString().split('T')[0];

    const detailsStr =
      m.location ||
      (m.maintenances && m.maintenances.length > 0
        ? m.maintenances.map((item) => item.name).join(', ')
        : 'Maintenance service');

    return {
      id: m.id,
      serviceItem: m.name,
      date: dateFormatted,
      odoKm: bVeh.odo || 0,
      costVnd: `${Number(m.total || 0).toLocaleString('en-US')} VND`,
      notes: detailsStr,
    };
  });

  // Calculate oil change telemetry based on service history
  const lastOilRecord =
    serviceHistory.find(
      (s) =>
        s.serviceItem.toLowerCase().includes('oil') ||
        s.serviceItem.toLowerCase().includes('nhớt')
    ) || serviceHistory[0];

  const currentOdo = bVeh.odo || 0;
  const lastOilOdo = lastOilRecord ? lastOilRecord.odoKm : currentOdo;
  const lastOilDate = lastOilRecord ? lastOilRecord.date : new Date().toISOString().split('T')[0];

  const isCar =
    (bVeh.capacity && bVeh.capacity > 800) ||
    ['car', 'ford', 'toyota', 'bmw auto', 'kia', 'mazda', 'hyundai'].some(
      (kw) =>
        (bVeh.brand || '').toLowerCase().includes(kw) ||
        (bVeh.name || '').toLowerCase().includes(kw)
    );
  const type: 'bike' | 'car' = isCar ? 'car' : 'bike';

  return {
    id: bVeh.id,
    name: bVeh.name,
    brand: bVeh.brand || 'Motorcycle',
    type,
    plateNumber: bVeh.plateNumber || 'N/A',
    currentOdoKm: currentOdo,
    year: bVeh.date || new Date().getFullYear(),
    lastOilDate,
    lastOilOdoKm: lastOilOdo,
    oilIntervalKm: type === 'bike' ? 3000 : 5000,
    serviceHistory,
  };
}

/**
 * Complete workflow: Fetches all vehicles for a user from Neo4j,
 * then fetches each vehicle's maintenance histories in parallel,
 * and maps everything into the client's Vehicle state.
 */
export async function fetchVehiclesWithMaintenance(userId: string): Promise<Vehicle[]> {
  try {
    const backendVehicles = await getVehiclesByUserId(userId);
    if (!backendVehicles || backendVehicles.length === 0) {
      return [];
    }

    // Fetch maintenance records in parallel for each vehicle
    const vehiclePromises = backendVehicles.map(async (bVeh) => {
      try {
        const histories = await getMaintenancesByVehicleId(bVeh.id);
        return mapBackendToClientVehicle(bVeh, histories);
      } catch (err: any) {
        console.warn(`[vehicleApi] Could not load maintenance for vehicle ${bVeh.id}:`, err.message);
        return mapBackendToClientVehicle(bVeh, []);
      }
    });

    return await Promise.all(vehiclePromises);
  } catch (error: any) {
    console.warn('[vehicleApi] fetchVehiclesWithMaintenance error:', error.message);
    return [];
  }
}
