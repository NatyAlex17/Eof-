/**
 * Allocation type definitions
 * Defines structure for locked allocations and pick slip generation
 */

export type AllocationStatus = 'draft' | 'locked' | 'fulfilled';

export interface AllocationSplit {
  customerId: string;
  weight: number;
  percentage: number;
}

export interface AllocationBox {
  id: string;
  boxNumber: string;
  weight: number;
  species: string;
  grade: string;
  customerId: string | null;
  split: AllocationSplit[] | null;
  locked: boolean;
}

export interface OrderAllocation {
  orderId: string;
  customer: string;
  code: string;
  boxes: AllocationBox[];
  totalWeight: number;
}

export interface Allocation {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  warehouse: 'SFO' | 'LAX';
  status: AllocationStatus;
  orderBoxMappings: OrderAllocation[];
  totalBoxes: number;
  totalWeight: number;
  lockedAt?: string;
  lockedBy?: string;
  snapshot?: AllocationSnapshot;
}

export interface AllocationSnapshot {
  allocations: OrderAllocation[];
  timestamp: string;
  totalWeight: number;
  boxCount: number;
}

export interface PickSlipLine {
  boxId: string;
  boxNumber: string;
  species: string;
  grade: string;
  weight: number;
  lot: string;
  vendor: string;
  isSplit: boolean;
  splitCustomers?: string[];
}

export interface PickSlip {
  id: string;
  number: string;
  allocationId: string;
  warehouse: string;
  orderId: string;
  customer: string;
  customerCode: string;
  address: string;
  contact: string;
  carrier: string;
  pickupTime: string;
  packingMethod: string;
  shipDate: string;
  lines: PickSlipLine[];
  totalBoxes: number;
  totalWeight: number;
  packingInstructions: string;
  status: 'locked' | 'ready' | 'pulled' | 'packed' | 'shipped';
  createdAt: string;
  lockedAt: string;
  lockedBy: string;
}
