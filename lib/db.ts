// Server-side queries against Supabase, mapped to the app's types.
import { supabaseAdmin } from "@/lib/supabase";
import type {
  Country,
  DeliveryOption,
  Order,
  OrderStatus,
  PaymentStatus,
  StatusEvent,
  WeightBand,
} from "@/lib/data";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ORDER_SELECT = "*, status_log(status, by_who, note, at)";

function toEvent(r: any): StatusEvent {
  return { status: r.status, at: r.at, by: r.by_who, note: r.note ?? undefined };
}

function toOrder(r: any): Order {
  const log: StatusEvent[] = (r.status_log ?? [])
    .map(toEvent)
    .sort((a: StatusEvent, b: StatusEvent) => a.at.localeCompare(b.at));
  return {
    id: r.id,
    orderNumber: r.order_number,
    trackingNumber: r.tracking_number,
    customer: r.customer_name,
    customerEmail: r.customer_email,
    origin: r.origin as Country,
    destination: r.destination as Country,
    band: r.band as WeightBand,
    delivery: r.delivery as DeliveryOption,
    insurance: r.insurance,
    recipient: {
      name: r.recipient_name,
      phone: r.recipient_phone,
      address: r.recipient_address,
    },
    parcel: {
      weightKg: Number(r.parcel_weight ?? 0),
      description: r.parcel_description ?? "",
      declaredValue: Number(r.parcel_declared_value ?? 0),
      dimensions: r.parcel_dimensions ?? "",
    },
    dropoffPoint: r.dropoff_point ?? null,
    total: Number(r.total),
    status: r.status as OrderStatus,
    payment: r.payment as PaymentStatus,
    incident: r.incident,
    partner: r.partner,
    date: r.created_at,
    log,
  };
}

export async function getOrders(): Promise<Order[]> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toOrder);
}

export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("customer_email", email)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toOrder);
}

export async function getOrdersByPartner(partner: string): Promise<Order[]> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("partner", partner)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toOrder);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getOrderById(id: string): Promise<Order | null> {
  if (!UUID_RE.test(id)) return null;
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toOrder(data) : null;
}

export async function getOrderByCode(code: string): Promise<Order | null> {
  const c = code.trim().toUpperCase();
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(ORDER_SELECT)
    .or(`tracking_number.eq.${c},order_number.eq.${c}`)
    .maybeSingle();
  if (error) throw error;
  return data ? toOrder(data) : null;
}

export interface DbClaim {
  id: number;
  orderNumber: string;
  customer: string;
  type: string;
  status: string;
  opened: string;
  detail: string;
}

export async function getClaims(): Promise<DbClaim[]> {
  const { data, error } = await supabaseAdmin()
    .from("claims")
    .select("*")
    .order("opened", { ascending: false });
  if (error) throw error;
  return data.map((r: any) => ({
    id: r.id,
    orderNumber: r.order_number,
    customer: r.customer,
    type: r.type,
    status: r.status,
    opened: r.opened,
    detail: r.detail ?? "",
  }));
}

export interface CustomerSummary {
  name: string;
  email: string;
  orders: number;
  spend: number;
  firstOrder: string;
}

/** Customer list derived from orders (until real accounts exist). */
export async function getCustomers(): Promise<CustomerSummary[]> {
  const orders = await getOrders();
  const map = new Map<string, CustomerSummary>();
  for (const o of orders) {
    const c = map.get(o.customerEmail) ?? {
      name: o.customer,
      email: o.customerEmail,
      orders: 0,
      spend: 0,
      firstOrder: o.date,
    };
    c.orders += 1;
    if (o.payment === "Paid") c.spend += o.total;
    if (o.date < c.firstOrder) c.firstOrder = o.date;
    map.set(o.customerEmail, c);
  }
  return [...map.values()].sort((a, b) => b.orders - a.orders);
}
