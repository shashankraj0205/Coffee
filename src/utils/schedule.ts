import { AvailabilitySettings } from '../types/store';

export function formatTime12h(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24 || '';
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function toMinutes(time24: string): number {
  const [h, m] = time24.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export interface ComputedShopStatus {
  isOpen: boolean;
  isBusy: boolean;
  canOrder: boolean;
  badgeText: string;
  detailText: string;
  closingTimeFormatted: string;
  openingTimeFormatted: string;
  todayScheduleText: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getTodayShortName(now: Date = new Date()): string {
  return DAY_NAMES[now.getDay()];
}

export function computeShopStatus(
  availability: AvailabilitySettings,
  now: Date = new Date()
): ComputedShopStatus {
  const todayName = DAY_NAMES[now.getDay()];
  const todayEntry = availability.weeklySchedule.find(
    (d) => d.day.toLowerCase().startsWith(todayName.toLowerCase())
  );

  const openTime = todayEntry && !todayEntry.isClosed ? todayEntry.open : availability.openingTime;
  const closeTime = todayEntry && !todayEntry.isClosed ? todayEntry.close : availability.closingTime;

  const openingTimeFormatted = formatTime12h(openTime);
  const closingTimeFormatted = formatTime12h(closeTime);
  const todayScheduleText =
    todayEntry?.isClosed
      ? 'Closed Today'
      : `${openingTimeFormatted} – ${closingTimeFormatted}`;

  if (availability.mode === 'closed') {
    return {
      isOpen: false,
      isBusy: false,
      canOrder: false,
      badgeText: 'Closed Now',
      detailText: availability.closedNotice || `Reopens at ${openingTimeFormatted}`,
      closingTimeFormatted,
      openingTimeFormatted,
      todayScheduleText,
    };
  }

  if (availability.mode === 'busy') {
    return {
      isOpen: true,
      isBusy: true,
      canOrder: availability.acceptingOrders,
      badgeText: `High Demand · Closes ${closingTimeFormatted}`,
      detailText: availability.busyNotice,
      closingTimeFormatted,
      openingTimeFormatted,
      todayScheduleText,
    };
  }

  if (availability.mode === 'open') {
    return {
      isOpen: true,
      isBusy: false,
      canOrder: availability.acceptingOrders,
      badgeText: `Open Now · Closes ${closingTimeFormatted}`,
      detailText: availability.acceptingOrders
        ? `Express Bar Pickup ready in ~${availability.prepTimeMinutes} mins`
        : 'In-bar café open · Mobile pre-order paused',
      closingTimeFormatted,
      openingTimeFormatted,
      todayScheduleText,
    };
  }

  // 'auto' mode follows weekly schedule + current local time
  if (todayEntry?.isClosed) {
    return {
      isOpen: false,
      isBusy: false,
      canOrder: false,
      badgeText: 'Closed Today',
      detailText: availability.closedNotice,
      closingTimeFormatted,
      openingTimeFormatted,
      todayScheduleText,
    };
  }

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = toMinutes(openTime);
  const closeMins = toMinutes(closeTime);
  const isWithinHours = nowMins >= openMins && nowMins < closeMins;
  const minsRemaining = closeMins - nowMins;

  if (!isWithinHours) {
    return {
      isOpen: false,
      isBusy: false,
      canOrder: false,
      badgeText: `Closed · Opens ${openingTimeFormatted}`,
      detailText: availability.closedNotice,
      closingTimeFormatted,
      openingTimeFormatted,
      todayScheduleText,
    };
  }

  const closingSoon = minsRemaining <= 45;
  return {
    isOpen: true,
    isBusy: closingSoon,
    canOrder: availability.acceptingOrders,
    badgeText: closingSoon
      ? `Closing in ${minsRemaining}m (${closingTimeFormatted})`
      : `Open Now · Closes ${closingTimeFormatted}`,
    detailText: availability.acceptingOrders
      ? `Express Bar Pickup ready in ~${availability.prepTimeMinutes} mins`
      : 'Open in-bar · Mobile ordering paused',
    closingTimeFormatted,
    openingTimeFormatted,
    todayScheduleText,
  };
}

export const GALLERY_IMAGES = [
  { label: 'Kulhad Chai & Filter Kaapi Hero', url: '/images/indian-hero-chai-kaapi.jpg' },
  { label: 'Indian Café Interior', url: '/images/indian-cafe-interior.jpg' },
  {
    label: 'Masala Chai Brass Kettle',
    url: 'https://images.pexels.com/photos/12865880/pexels-photo-12865880.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
  },
  {
    label: 'Kulhad Clay Cup Chai',
    url: 'https://images.pexels.com/photos/33104714/pexels-photo-33104714.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
  },
  {
    label: 'Adrak Ginger Chai',
    url: 'https://images.pexels.com/photos/29650995/pexels-photo-29650995.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
  },
  { label: 'Elaichi Cardamom Chai', url: '/images/chai-cardamom.jpg' },
  {
    label: 'Tandoori Kulhad Chai',
    url: 'https://images.pexels.com/photos/36662612/pexels-photo-36662612.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
  },
  {
    label: 'Cutting Chai Pour',
    url: 'https://images.pexels.com/photos/18413480/pexels-photo-18413480.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
  },
  {
    label: 'Cappuccino Cup',
    url: 'https://images.pexels.com/photos/11160127/pexels-photo-11160127.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
  },
  {
    label: 'Cold Coffee Glass',
    url: 'https://images.pexels.com/photos/38275924/pexels-photo-38275924.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
  },
  {
    label: 'Espresso Crema Shot',
    url: 'https://images.pexels.com/photos/28935722/pexels-photo-28935722.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
  },
  { label: 'Kashmiri Kahwa Pour', url: '/images/oolong-tea.jpg' },
];
