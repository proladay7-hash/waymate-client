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

export const initialVehicles: Vehicle[] = [
  {
    id: 'veh-1',
    name: 'Superbike 1000 RR',
    brand: 'Sport Performance',
    type: 'bike',
    plateNumber: '59-A1 999.54',
    currentOdoKm: 8420,
    year: 2024,
    lastOilDate: '2026-09-15',
    lastOilOdoKm: 6500,
    oilIntervalKm: 3000,
    serviceHistory: [
      {
        id: 'srv-1',
        serviceItem: 'Motul 300V Factory Line 10W-40 & Racing Filter',
        date: '2026-09-15',
        odoKm: 6500,
        costVnd: '1,650,000 VND',
        notes: 'Full synthetic ester core race oil & performance racing filter',
      },
      {
        id: 'srv-2',
        serviceItem: 'Front & Rear Brembo Brake Pads',
        date: '2026-05-15',
        odoKm: 10500,
        costVnd: '2,800,000 VND',
        notes: 'Replaced with sintered pads for mountain pass braking performance',
      },
      {
        id: 'srv-3',
        serviceItem: '10,000 KM Major Valve Check & Fluid Flush',
        date: '2026-04-20',
        odoKm: 10000,
        costVnd: '4,500,000 VND',
        notes: 'Authorized Service Center, brake fluid & final drive oil flushed',
      },
    ],
  },
  {
    id: 'veh-2',
    name: 'Honda CB500X',
    brand: 'Honda',
    type: 'bike',
    plateNumber: '29-A1 369.58',
    currentOdoKm: 28900,
    year: 2022,
    lastOilDate: '2026-07-02',
    lastOilOdoKm: 26000,
    oilIntervalKm: 3000,
    serviceHistory: [
      {
        id: 'srv-4',
        serviceItem: 'Castrol Power1 Racing Oil & Chain Maintenance',
        date: '2026-07-02',
        odoKm: 26000,
        costVnd: '650,000 VND',
        notes: 'DID 520 chain cleaned and lubricated with Motorex spray',
      },
      {
        id: 'srv-5',
        serviceItem: 'Pirelli Scorpion Trail II Tire Set',
        date: '2026-02-18',
        odoKm: 22000,
        costVnd: '6,200,000 VND',
        notes: 'Dual sport touring tires mounted & balanced',
      },
    ],
  },
  {
    id: 'veh-3',
    name: 'Ford Ranger Raptor 4x4',
    brand: 'Ford',
    type: 'car',
    plateNumber: '51D-924.12',
    currentOdoKm: 41200,
    year: 2024,
    lastOilDate: '2026-06-25',
    lastOilOdoKm: 38000,
    oilIntervalKm: 5000,
    serviceHistory: [
      {
        id: 'srv-6',
        serviceItem: 'Synthetic Diesel Oil & Fuel Filter',
        date: '2026-06-25',
        odoKm: 38000,
        costVnd: '2,600,000 VND',
        notes: 'Full service inspection prior to road trip support vehicle duties',
      },
    ],
  },
];
