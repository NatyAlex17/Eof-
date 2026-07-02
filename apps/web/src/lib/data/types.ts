// Domain row types derived from the generated Database types.
// Import from here in pages/hooks — never redeclare table shapes by hand.
import type { Database } from '../database.types';

type Tables = Database['public']['Tables'];
type Views = Database['public']['Views'];

export type Profile = Tables['profiles']['Row'];
export type Vendor = Tables['vendors']['Row'];
export type Customer = Tables['customers']['Row'];
export type PriceOverride = Tables['price_overrides']['Row'];
export type Sku = Tables['skus']['Row'];
export type PricingTier = Tables['pricing_tiers']['Row'];
export type Lot = Tables['lots']['Row'];
export type Box = Tables['boxes']['Row'];
export type BoxContent = Tables['box_contents']['Row'];
export type Order = Tables['orders']['Row'];
export type OrderLine = Tables['order_lines']['Row'];
export type PickSlip = Tables['pick_slips']['Row'];
export type Invoice = Tables['invoices']['Row'];
export type CreditClaim = Tables['credit_claims']['Row'];
export type Downgrade = Tables['downgrades']['Row'];
export type VendorStatement = Tables['vendor_statements']['Row'];
export type VendorMapping = Tables['vendor_mappings']['Row'];
export type VendorSpeciesCode = Tables['vendor_species_codes']['Row'];
export type StandingOrder = Tables['standing_orders']['Row'];
export type Notification = Tables['notifications']['Row'];

export type OrderLineFulfillment = Views['order_lines_with_fulfillment']['Row'];
export type OrderFulfillment = Views['orders_with_fulfillment']['Row'];
export type SpeciesAvailability = Views['availability_by_species']['Row'];

/** Lot with its boxes and each box's species contents — the board/inventory shape. */
export type LotTree = Lot & {
  boxes: Array<Box & { box_contents: BoxContent[] }>;
};
