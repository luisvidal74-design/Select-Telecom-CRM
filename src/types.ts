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
}

export interface Brand {
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
  purchasePlace: string;
  orderNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  customerPrice: number;
  sellerId?: number;
  userId?: number;
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

export interface SelectCare {
  id: number;
  customerId: number;
  brand: string;
  model: string;
  color: string;
  memory: string;
  imei: string;
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
  topModel: { brand: string; model: string; count: number } | null;
  equipmentRevenue: number;
  selectCareRevenue: number;
  drivingLogsCount: number;
  expiringSelectCare: (SelectCare & { customerName: string })[];
  expiringContracts: (Contract & { customerName: string })[];
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
  customFields?: string;
  createdAt: string;
  files?: ContractFile[];
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
  assignedTo?: number;
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
