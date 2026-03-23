export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  profilePic?: string;
  status: 'pending' | 'approved' | 'rejected';
  isAdmin: number;
  isSupport: number;
  customerId?: number;
  lastReadNewsTimestamp?: string;
}

export interface Customer {
  id: number;
  name: string;
  orgNumber: string;
  address: string;
  city: string;
  zipCode: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  responsibleSeller?: string;
  website?: string;
  services?: string; // Stored as JSON string or comma separated
  users?: CustomerUser[];
  equipment?: Equipment[];
  itEquipment?: ITEquipment[];
  o365Licenses?: O365License[];
  selectCare?: SelectCare[];
  selectCareHistory?: SelectCareHistory[];
  drivingLogs?: DrivingLog[];
}

export interface CustomerUser {
  id: number;
  customerId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  office: string;
  isAuthorizedBuyer?: number; // 0 or 1
  isDrivingLogAdmin?: number; // 0 or 1
}

export interface Brand {
  id: number;
  name: string;
}

export interface Model {
  id: number;
  name: string;
}

export interface Color {
  id: number;
  name: string;
}

export interface Memory {
  id: number;
  name: string;
}

export interface Equipment {
  id: number;
  customerId: number;
  brand: string;
  model: string;
  color: string;
  memory: string;
  imei: string;
  selectNr?: string;
  purchasePlace: string;
  orderNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  customerPrice: number;
  sellerId?: number;
  userId?: number;
  trackingNumber?: string;
  notes?: string;
}

export interface SelectCareLog {
  id: number;
  selectCareId: number;
  userId?: number;
  userName?: string;
  fromStatus: string;
  toStatus: string;
  timestamp: string;
  notes?: string;
}

export interface ITEquipment {
  id: number;
  customerId: number;
  userId?: number;
  sellerId?: number;
  deviceName: string;
  brand: string;
  model: string;
  memory?: string;
  serialNumber: string;
  selectNr?: string;
  trackingNumber?: string;
  purchasePlace: string;
  orderNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  customerPrice: number;
  comment?: string;
  userName?: string;
  sellerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SelectCare {
  id: number;
  customerId: number;
  brand: string;
  model: string;
  color: string;
  memory: string;
  imei: string;
  selectNr?: string;
  purchasePlace: string;
  orderNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  monthlyFee: number;
  userId: number;
  contractPeriod?: number;
  endDate?: string;
  siemensContractNumber?: string;
  sellerId?: number;
  trackingNumber?: string;
  status?: 'Aktiv' | 'Under reparation';
  logs?: SelectCareLog[];
}

export interface SelectCareHistory extends SelectCare {
  deletedAt: string;
}

export interface DrivingLog {
  id: number;
  customerId: number;
  regNo: string;
  driverName: string;
  email: string;
  deviceType?: string;
  schema?: string;
  monthlyFee?: number;
  createdAt: string;
  sellerId?: number;
}

export interface News {
  id: number;
  title: string;
  content: string;
  imageUrl?: string;
  imageSize?: 'small' | 'medium' | 'large';
  authorId: number;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  customerCount: number;
  equipmentSales: { month: string; count: number; revenue: number }[];
  selectCareSales: { month: string; count: number; revenue: number }[];
  drivingLogSales: { month: string; count: number; revenue: number }[];
  itEquipmentSales: { month: string; count: number; revenue: number }[];
  topModel: { brand: string; model: string; count: number } | null;
  equipmentRevenue: number;
  selectCareRevenue: number;
  drivingLogRevenue: number;
  drivingLogsCount: number;
  expiringSelectCare: (SelectCare & { customerName: string })[];
  expiringContracts: (Contract & { customerName: string })[];
  topSellers?: { firstName: string; lastName: string; totalRevenue: number }[];
  topMobiles?: { brand: string; model: string; count: number }[];
}

export interface ContractFile {
  id: number;
  contractId: number;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Contract {
  id: number;
  customerId: number;
  customerName?: string;
  type: string;
  startDate: string;
  contractPeriod: number;
  endDate: string;
  sellerId: number;
  contractCategory?: 'Kund' | 'Leverantör';
  customFields?: string;
  company?: string;
  createdAt: string;
  files?: ContractFile[];
}

export interface ContractCompany {
  id: number;
  userId: number;
  name: string;
}

export interface SupportTicketLog {
  id: number;
  ticketId: number;
  userId: number;
  userName?: string;
  action: string;
  note: string;
  timestamp: string;
}

export interface SupportTicket {
  id: number;
  ticketNumber: string;
  customerId: number;
  customerName?: string;
  selectCareId?: number;
  deviceName?: string;
  title: string;
  description: string;
  status: 'Registrerad' | 'Väntar' | 'Skickat för reparation' | 'Under reparation' | 'Avslutad';
  priority: 'Låg' | 'Normal' | 'Hög' | 'Kritisk';
  createdBy: number;
  creatorName?: string;
  responsibleSeller?: string;
  isRead?: number;
  isReadByAdmin?: number;
  isReadByCreator?: number;
  isTagged?: number;
  taggedUserId?: number;
  assignedTo?: number;
  assignedName?: string;
  createdAt: string;
  updatedAt: string;
  logs?: SupportTicketLog[];
}

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  sellerId: number;
  type: 'event' | 'contract_expiry' | 'select_care_expiry';
  relatedId?: number;
  createdAt: string;
}

export interface O365License {
  id: number;
  customerId: number;
  licenseType: string;
  email: string;
  password?: string;
  price?: number;
  startDate: string;
  bindingPeriod: number;
  endDate: string;
  userId?: number;
  userName?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}
