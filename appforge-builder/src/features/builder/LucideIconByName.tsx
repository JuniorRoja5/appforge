import React from 'react';
import {
  Home, Search, BookOpen, Camera, Calendar, Phone, Tag, Mail,
  MapPin, Clock, Settings, Bell, Heart, Star, User, MessageCircle,
  ShoppingBag, Music, Utensils, Scissors, Dumbbell, Stethoscope,
  GraduationCap, PawPrint, Car, Briefcase, Image, FileText, Link2,
  Circle, type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  search: Search,
  'book-open': BookOpen,
  camera: Camera,
  calendar: Calendar,
  phone: Phone,
  tag: Tag,
  mail: Mail,
  'map-pin': MapPin,
  clock: Clock,
  settings: Settings,
  bell: Bell,
  heart: Heart,
  star: Star,
  user: User,
  'message-circle': MessageCircle,
  'shopping-bag': ShoppingBag,
  music: Music,
  utensils: Utensils,
  scissors: Scissors,
  dumbbell: Dumbbell,
  stethoscope: Stethoscope,
  'graduation-cap': GraduationCap,
  'paw-print': PawPrint,
  car: Car,
  briefcase: Briefcase,
  image: Image,
  'file-text': FileText,
  link: Link2,
  circle: Circle,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

interface LucideIconByNameProps {
  name: string;
  size?: number;
  className?: string;
}

export const LucideIconByName: React.FC<LucideIconByNameProps> = ({ name, size = 20, className }) => {
  const Icon = ICON_MAP[name] ?? Circle;
  return <Icon size={size} className={className} />;
};
