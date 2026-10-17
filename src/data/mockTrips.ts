export interface PitStop {
  name: string;
  type: string;
  rating: string;
  cost: string;
}

export interface Landmark {
  name: string;
  stopTime: string;
  fee: string;
}

export interface Lodging {
  name: string;
  price: string;
  status: string;
}

export interface TripData {
  id: string;
  title: string;
  titleVie: string;
  riderName: string;
  riderAvatar: string;
  riderBadge: string;
  riderBadgeVie: string;
  bikeModel: string;
  distanceKm: number;
  avgVelocityKmh: number;
  maxVelocityKmh: number;
  groupSize: string;
  duration: string;
  durationVie: string;
  dates: string;
  category: 'all' | 'popular' | 'nearby' | 'international';
  coverImage: string;
  likesCount: number;
  commentsCount: number;
  totalCostVnd: string;
  totalCostUsd: string;
  description: string;
  descriptionVie: string;
  eatDrink: PitStop[];
  landmarks: Landmark[];
  lodging: Lodging[];
}

export const mockTripsData: TripData[] = [
  {
    id: 'trip-1',
    title: 'Ha Giang Extreme Northern Loop',
    titleVie: 'Cung đường phượt đỉnh cao Vòng cung Hà Giang',
    riderName: 'Minh "Apex" Nguyen',
    riderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    riderBadge: 'Ha Giang Master',
    riderBadgeVie: 'Bậc thầy Hà Giang',
    bikeModel: 'BMW R1250 GS Adventure',
    distanceKm: 350,
    avgVelocityKmh: 48,
    maxVelocityKmh: 82,
    groupSize: '4 / 6 Riders',
    duration: '3 Days, 2 Nights',
    durationVie: '3 Ngày, 2 Đêm',
    dates: 'Nov 12 - Nov 14, 2026',
    category: 'nearby',
    coverImage: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80',
    likesCount: 142,
    commentsCount: 28,
    totalCostVnd: '4,200,000 VND',
    totalCostUsd: '$170 USD',
    description: 'Epic mountain pass ride conquering Ma Pi Leng Pass, Tu San Canyon, and the dramatic winding limestone passes of Northern Vietnam.',
    descriptionVie: 'Hành trình chinh phục Đèo Mã Pí Lèng hùng vĩ, hẻm Tu Sản và những cung đèo ngoạn mục tại địa đầu Tổ quốc.',
    eatDrink: [
      { name: 'Pho Cu Thanh - Dong Van', type: 'Local Breakfast', rating: '4.9 ⭐', cost: '50,000 VND ($2)' },
      { name: 'Ma Pi Leng Sunset Coffee', type: 'Viewpoint Rest', rating: '4.8 ⭐', cost: '40,000 VND ($1.5)' },
    ],
    landmarks: [
      { name: 'Ma Pi Leng Pass Skywalk', stopTime: '1.5 hrs', fee: 'Free' },
      { name: 'Lung Cu Flag Tower Landmark', stopTime: '2 hrs', fee: '20,000 VND' },
    ],
    lodging: [
      { name: 'Dong Van Cliffside Homestay', price: '450,000 VND/night', status: 'Booked' },
      { name: 'Du Gia Waterfall Ecolodge', price: '380,000 VND/night', status: 'Reserved' },
    ],
  },
  {
    id: 'trip-2',
    title: 'Pacific Coast Highway 1 Cruising',
    titleVie: 'Lướt gió ven biển Cao tốc Thái Bình Dương Highway 1',
    riderName: 'Sarah Jenkins',
    riderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    riderBadge: 'Coast Rider',
    riderBadgeVie: 'Tay lái Ven Biển',
    bikeModel: 'Triumph Tiger 900 GT',
    distanceKm: 720,
    avgVelocityKmh: 75,
    maxVelocityKmh: 110,
    groupSize: '2 / 4 Riders',
    duration: '4 Days',
    durationVie: '4 Ngày',
    dates: 'Dec 01 - Dec 04, 2026',
    category: 'international',
    coverImage: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
    likesCount: 289,
    commentsCount: 41,
    totalCostVnd: '14,500,000 VND',
    totalCostUsd: '$580 USD',
    description: 'Ocean breeze and cliffs along Bixby Creek Bridge, Big Sur, and coastal highway sunset runs.',
    descriptionVie: 'Gió biển lộng và vách đá hùng vĩ qua Cầu Bixby Creek, Big Sur và hoàng hôn rực rỡ bên bờ đại dương.',
    eatDrink: [
      { name: 'Nepenthe Coastal Grill', type: 'Seafood Lunch', rating: '4.7 ⭐', cost: '$45 USD' },
      { name: 'Big Sur Bakery', type: 'Coffee & Pastry', rating: '4.9 ⭐', cost: '$12 USD' },
    ],
    landmarks: [
      { name: 'Bixby Creek Bridge Overlook', stopTime: '45 mins', fee: 'Free' },
      { name: 'McWay Falls Cove', stopTime: '1 hr', fee: '$10 Parking' },
    ],
    lodging: [
      { name: 'Glen Oaks Big Sur Cabins', price: '$180 USD/night', status: 'Available' },
    ],
  },
];
