/**
 * Pick Slip Generator
 * Generates pick slips from allocation data, handles split boxes and multi-customer allocations
 */

import { OrderAllocation, PickSlip, PickSlipLine, AllocationBox } from '@/types/allocation';

interface GeneratePickSlipsInput {
  allocations: OrderAllocation[];
  warehouse: 'SFO' | 'LAX';
  userId: string;
  userEmail: string;
  timestamp: string;
}

interface OrderMetadata {
  id: string;
  customer: string;
  code: string;
  address: string;
  contact: string;
  carrier: string;
  pickupTime: string;
  packingMethod: string;
  shipDate: string;
  packingInstructions: string;
}

// Sample metadata - in production this would come from a database
const orderMetadata: Record<string, OrderMetadata> = {
  o1: {
    id: 'o1',
    customer: 'Nobu',
    code: 'NOBU',
    address: '375 University Ave, Palo Alto CA',
    contact: 'Chef de cuisine · (650) 555-0142',
    carrier: 'Aloha Air Cargo',
    pickupTime: 'Jun 23 · 09:30',
    packingMethod: 'Dry ice',
    shipDate: 'Jun 23',
    packingInstructions:
      'Pack ahi in dry ice — long-haul air. Double-line cooler, 8 lb dry ice per box. Tape lid, mark THIS SIDE UP.',
  },
  o2: {
    id: 'o2',
    customer: 'Morimoto',
    code: 'MORI',
    address: '88 Mission St, San Francisco CA',
    contact: 'Receiving · (415) 555-0178',
    carrier: 'Aloha Air Cargo',
    pickupTime: 'Jun 23 · 09:30',
    packingMethod: 'Dry ice',
    shipDate: 'Jun 23',
    packingInstructions:
      'Salmon for air freight. Dry ice, 6 lb per box. Keep upright, gel pack on top layer.',
  },
  o3: {
    id: 'o3',
    customer: "Roy's",
    code: 'ROY',
    address: '226 Hamilton Ave, Palo Alto CA',
    contact: 'Kitchen mgr · (650) 555-0190',
    carrier: 'HNL Ground',
    pickupTime: 'Jun 23 · 11:00',
    packingMethod: 'Gel ice',
    shipDate: 'Jun 23',
    packingInstructions:
      'Local ground delivery. Gel ice only — no dry ice for short haul. 4 packs per box, line bottom.',
  },
  o4: {
    id: 'o4',
    customer: "Alan Wong's",
    code: 'WONG',
    address: '2048 Young St, Honolulu HI',
    contact: 'Executive Chef · (808) 555-0167',
    carrier: 'HNL Ground',
    pickupTime: 'Jun 23 · 10:00',
    packingMethod: 'Gel ice',
    shipDate: 'Jun 23',
    packingInstructions: 'Short local route. Standard gel packs. Include temp log.',
  },
};

/**
 * Generate pick slips from allocation data
 * Groups allocations by customer and creates individual pick slips
 */
export function generatePickSlips(input: GeneratePickSlipsInput): PickSlip[] {
  const { allocations, warehouse, userId, userEmail, timestamp } = input;

  if (allocations.length === 0) {
    throw new Error('No allocations to generate pick slips from');
  }

  const pickSlips: PickSlip[] = [];
  let slipNumber = 1;
  const now = new Date();
  const lockedDate = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  });

  // Generate a slip for each customer's allocation
  allocations.forEach((allocation) => {
    const metadata = orderMetadata[allocation.orderId];

    if (!metadata) {
      console.warn(`No metadata found for order ${allocation.orderId}, skipping`);
      return;
    }

    // Build pick slip lines
    const lines = buildPickSlipLines(allocation.boxes);
    const totalWeight = lines.reduce((sum, line) => sum + line.weight, 0);

    const pickSlip: PickSlip = {
      id: `ps_${allocation.orderId}_${timestamp}`,
      number: `PS-${String(slipNumber).padStart(4, '0')}`,
      allocationId: `alloc_${timestamp}`,
      warehouse,
      orderId: allocation.orderId,
      customer: allocation.customer,
      customerCode: allocation.code,
      address: metadata.address,
      contact: metadata.contact,
      carrier: metadata.carrier,
      pickupTime: metadata.pickupTime,
      packingMethod: metadata.packingMethod,
      shipDate: metadata.shipDate,
      lines,
      totalBoxes: lines.length,
      totalWeight,
      packingInstructions: metadata.packingInstructions,
      status: 'locked',
      createdAt: timestamp,
      lockedAt: lockedDate,
      lockedBy: userEmail,
    };

    pickSlips.push(pickSlip);
    slipNumber++;
  });

  return pickSlips;
}

/**
 * Build pick slip lines from allocation boxes
 * Handles split boxes and groups by lot/species
 */
function buildPickSlipLines(boxes: AllocationBox[]): PickSlipLine[] {
  const lines: PickSlipLine[] = [];

  boxes.forEach((box) => {
    if (!box.customerId) {
      // Skip unallocated boxes
      return;
    }

    const isSplit = !!(box.split && box.split.length > 1);
    const splitCustomers = isSplit && box.split ? box.split.map((s) => s.customerId) : undefined;

    const line: PickSlipLine = {
      boxId: box.id,
      boxNumber: box.boxNumber,
      species: box.species,
      grade: box.grade,
      weight: box.weight,
      lot: 'LOT-2207', // This would come from the box data in a real implementation
      vendor: 'Kona Fresh Catch', // This would come from the box data
      isSplit,
      splitCustomers,
    };

    lines.push(line);
  });

  // Sort by lot for logical grouping
  lines.sort((a, b) => a.lot.localeCompare(b.lot));

  return lines;
}

/**
 * Generate summary stats from generated pick slips
 */
export function generatePickSlipStats(slips: PickSlip[]) {
  return {
    totalSlips: slips.length,
    totalBoxes: slips.reduce((sum, slip) => sum + slip.totalBoxes, 0),
    totalWeight: slips.reduce((sum, slip) => sum + slip.totalWeight, 0),
    customers: slips.map((slip) => ({
      id: slip.orderId,
      name: slip.customer,
      slipNumber: slip.number,
      boxes: slip.totalBoxes,
      weight: slip.totalWeight,
    })),
  };
}

/**
 * Calculate packing instructions based on carrier and product type
 */
export function calculatePackingInstructions(
  carrier: string,
  species: string,
  isLongHaul: boolean
): string {
  const baseMap: Record<string, string> = {
    'Air Cargo': isLongHaul
      ? `Pack ${species} in dry ice — long-haul air. Double-line cooler, 8 lb dry ice per box. Tape lid, mark THIS SIDE UP.`
      : `Pack ${species} in gel ice for short-haul air. Standard gel packs, no dry ice needed.`,
    Ground: `Local delivery. Gel ice only — no dry ice for ground. 4 packs per box, line bottom.`,
    'HNL Ground': `Short local route. Standard gel packs. Include temperature log.`,
  };

  return baseMap[carrier] || `Pack ${species} for ${carrier} carrier.`;
}
