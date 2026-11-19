export type PaymentMethod = 'pix' | 'credit';
export const CREDIT_RATE_BPS = 349;
export function paymentQuote(subtotal: number, method: PaymentMethod) {
 if (!Number.isSafeInteger(subtotal) || subtotal < 1) throw new Error('Subtotal inválido.');
 const fee = method === 'credit' ? Math.round(subtotal * CREDIT_RATE_BPS / 10000) : 0;
 return { subtotal, fee, feeRateBps: method === 'credit' ? CREDIT_RATE_BPS : 0, total: subtotal + fee };
}
export type CardCharge = { charge_id: number; total: number; status: string; custom_id?: string; payment?: { method?: string; credit_card?: { installments?: number } }; installments?: number; tds_challenge?: { form_data: { method: string; action_url: string; creq: string; threeDSSessionData: string } } };
export function assessCardCharge(charge: CardCharge, order: { id: string; total: number; paymentId?: string }) {
 if (String(charge.charge_id) !== order.paymentId || charge.custom_id !== order.id || charge.total !== order.total) throw new Error('Referência ou valor do cartão divergente. Procure a atlética.');
 if (charge.status === 'approved' || charge.status === 'paid') {
  if (charge.payment?.method !== 'credit_card' || charge.payment.credit_card?.installments !== 1) throw new Error('O pagamento precisa ser no crédito à vista.');
  return 'paid';
 }
 if (charge.status === 'refunded') return 'refunded';
 if (['unpaid','canceled','expired'].includes(charge.status)) return 'cancelled';
 return 'pending';
}
