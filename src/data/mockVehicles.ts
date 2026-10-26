export interface ServiceRecord {
  id: string;
  serviceItem: string;
  date: string;
  odoKm: number;
  costVnd: string;
  notes: string;
}

export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  type: 'bike' | 'car';
  plateNumber: string;
  currentOdoKm: number;
  year: number;
  capacity?: number;
  lastOilDate: string;
  lastOilOdoKm: number;
  oilIntervalKm: number;
  serviceHistory: ServiceRecord[];
}

// User vehicles are fetched from Neo4j database via fetchVehiclesWithMaintenance()
export const initialVehicles: Vehicle[] = [];
