'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, clientApp, configured } from './firebase-client';
import { paymentQuote, type PaymentMethod } from './card-domain';
import { seedMenus } from './seed';
import { normalizeMenu, paymentDeadline } from './sales';
import { cartKey, menuQuantities } from './customization';
import type { Selection } from './types';
import { assertCollectable, priceCart } from './domain';
import type { CartItem, Menu, Notice, Order, Session } from './types';
const KEY = 'inter-na-mesa-demo-v1';
export function useApp() {
 const demo = !configured;
 const [menus, setMenus] = useState<Menu[]>([]); const [orders, setOrders] = useState<Order[]>([]); const [notices, setNotices] = useState<Notice[]>([]);
 const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
 const [paymentOptions,setPaymentOptions]=useState({credit:demo,debit:false,creditRateBps:349,sandbox:true});
 const inFlight = useRef<{uid:string; promise:Promise<void>} | null>(null);
 const profileUid = useRef<string | null>(null);
 const lastRefresh = useRef(0);
 const retryAfter = useRef(0);
 const [cart, setCart] = useState<CartItem[]>([]);
 const request = useCallback(async (path: string, body?: unknown) => {
  const user = configured ? auth().currentUser : null;
  const token = user ? await user.getIdToken() : '';
  const res = await fetch(`/api/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), cache: 'no-store' });
  const data = await res.json(); if (!res.ok) { if (res.status === 503 || res.status === 429) retryAfter.current = Date.now() + 300_000; throw new Error(data.error || 'Não foi possível carregar os dados.'); } return data;
 }, []);
 const refresh = useCallback((): Promise<void> => {
  if (demo) return Promise.resolve();
  const uid = auth().currentUser?.uid || '';
  if (inFlight.current?.uid === uid) return inFlight.current.promise;
  if (Date.now() < retryAfter.current) return Promise.reject(new Error('Aguarde alguns minutos antes de tentar atualizar novamente.'));
  const current = () => (auth().currentUser?.uid || '') === uid;
  const promise = (async () => {
   const [m, options] = await Promise.all([request('menus'), request('payments/config')]);
   if (!current()) return;
   setMenus(m); setPaymentOptions(options);
   if (uid) {
    if (profileUid.current !== uid) { const me = await request('me'); if (!current()) return; setSession(me); profileUid.current = uid; }
    const [o, n] = await Promise.all([request('orders'), request('notices')]);
    if (!current()) return;
    setOrders(o); setNotices(n);
   }
   lastRefresh.current = Date.now();
  })().finally(() => { if (inFlight.current?.promise === promise) inFlight.current = null; });
  inFlight.current = {uid, promise};
  return promise;
 }, [demo, request]);
 useEffect(() => {
  if (demo) {
   try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); setMenus((saved?.menus || seedMenus).map(normalizeMenu)); setOrders(saved?.orders || []); setNotices(saved?.notices || []); } catch { setMenus(seedMenus); }
   setSession({ uid: 'demo', name: 'Atleta', email: 'atleta@demonstracao.local', admin: true }); setLoading(false); return;
  }
  return onAuthStateChanged(auth(), () => { (async()=>{if(auth().currentUser)await request('profile',{});await refresh();})().catch(e => setError(e.message)).finally(() => setLoading(false)); });
 }, [demo, refresh]);
 useEffect(() => { if (demo && !loading) localStorage.setItem(KEY, JSON.stringify({ menus, orders, notices })); }, [demo, loading, menus, orders, notices]);
 useEffect(() => {
  if (demo || !session) return;
  const sync = () => { if (document.visibilityState === 'visible' && navigator.onLine && Date.now() - lastRefresh.current >= 120_000) refresh().catch(() => {}); };
  const poll = setInterval(sync, 120_000);
  document.addEventListener('visibilitychange', sync);
  return () => { clearInterval(poll); document.removeEventListener('visibilitychange', sync); };
 }, [demo, session?.uid, refresh]); // eslint-disable-line
 const login = async () => { await signInWithPopup(auth(), new GoogleAuthProvider()); };
 const logout = async () => { profileUid.current = null; if (!demo) await signOut(auth()); setSession(null); setOrders([]); setNotices([]); setCart([]); };
 const add = (menuId: string, delta = 1, selections: Selection[] = [], note = '') => setCart(old => {
  const item = {menuId,selections,note}; const key = cartKey(item);
  const previous = old.find(i=>cartKey(i)===key)?.quantity || 0;
  const others = old.filter(i=>cartKey(i)!==key);
  const otherCount = others.filter(i=>i.menuId===menuId).reduce((sum,i)=>sum+i.quantity,0);
  const quantity = Math.max(0,Math.min(previous+delta,10-otherCount));
  return [...others,...(quantity>0?[{...item,quantity}]:[])];
 });
 const place = async (cpf: string, note: string, requestId: string, paymentMethod: PaymentMethod = 'pix', card?: {paymentToken:string;tdsIdentifier:string;name:string;phone:string}) => {
  if (!session) throw new Error('Entre com sua conta Google para fazer o pedido.');
  let order: Order;
  if (demo) {
   const priced = priceCart(menus, cart);
   order = { ...priced, ...paymentQuote(priced.total,paymentMethod), paymentMethod, id: crypto.randomUUID(), uid: 'demo', customer: 'Atleta de demonstração', email: session.email, createdAt: new Date().toISOString(), expiresAt: paymentDeadline(priced.items), status: 'pending', token: Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x => x.toString(16).padStart(2, '0')).join(''), note };
   setOrders(old => [order, ...old]); setMenus(old => old.map(m => ({ ...m, reserved: m.reserved + (menuQuantities(cart).get(m.id) || 0) })));
  } else { try { order = await request('orders', { items: cart, cpf: cpf.replace(/\D/g, ''), note, requestId, paymentMethod, card, expectedTotal:paymentQuote(priceCart(menus,cart).total,paymentMethod).total }); } catch (e) { await refresh().catch(() => {}); throw e; } await refresh(); }
  setCart([]); return order;
 };
 const confirmDemo = (id: string) => setOrders(old => old.map(o => o.id === id ? { ...o, status: 'paid', paidAt: new Date().toISOString() } : o));
 const refreshPayment = async (id: string) => { await request('orders/refresh', { id }); await refresh(); };
 const retryPayment = async (id: string, cpf: string) => { await request('orders/retry', { id, cpf }); await refresh(); };
 const saveMenu = async (menu: Menu) => {
  if (demo) setMenus(old => old.some(m => m.id === menu.id) ? old.map(m => m.id === menu.id ? { ...menu, reserved: m.reserved, ready: m.ready } : m) : [...old, menu]);
  else { const { reserved: _r, ready: _ready, ...data } = menu; await request('admin/menus', data); await refresh(); }
 };
 const announce = async (menuId: string) => {
  if (!demo) { const result = await request('admin/announce', { menuId }); await refresh(); return result; }
  setMenus(old => old.map(m => m.id === menuId ? { ...m, ready: true } : m));
  const menu = menus.find(m => m.id === menuId)!;
  setNotices(old => [{ id: crypto.randomUUID(), title: 'Sua refeição chegou! 🍽️', body: `${menu.name} já está no alojamento. Apresente seu QR Code para retirar.`, createdAt: new Date().toISOString() }, ...old]);
  return { recipients: 1, pushSent: 0, pushFailed: 0 };
 };
 const ticket = async (code: string, collect = false) => {
  if (!demo) { const result = await request('admin/ticket', { code, collect }); await refresh(); return result; }
  const [, id, idx, token] = code.trim().split(':'); const index = Number(idx); const o = orders.find(o => o.id === id && o.token === token);
  if (!o || !o.items[index]) throw new Error('Código não encontrado.');
  assertCollectable(o, index, menus.find(m => m.id === o.items[index].menuId)?.ready === true);
  if (collect) setOrders(old => old.map(o => o.id === id ? { ...o, items: o.items.map((i, n) => n === index ? { ...i, collectedAt: new Date().toISOString(), collectedBy: 'demo' } : i) } : o));
  return { customer: o.customer, item: o.items[index], note: o.note, collected: collect };
 };
 const setReminders = async(enabled:boolean)=>{if(!demo)await request('preferences/reminders',{enabled});setSession(old=>old?{...old,remindersEnabled:enabled}:old);};
 const enablePush = async () => {
  if (demo) throw new Error('As notificações push ficam disponíveis após configurar o Firebase. Os avisos de demonstração aparecem aqui no app.');
  if (!session) throw new Error('Entre na sua conta antes de ativar as notificações.');
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!await isSupported()) throw new Error('Este navegador não oferece push. No iPhone, instale o app na tela de início e abra por lá.');
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) throw new Error('A atlética ainda precisa configurar as notificações.');
  if (await Notification.requestPermission() !== 'granted') throw new Error('Permita as notificações nas configurações do navegador.');
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(clientApp()), { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration });
  await request('push', { token });
 };
 return { paymentOptions, demo, menus, orders, notices, session, loading, error, setError, cart, add, place, confirmDemo, refreshPayment, retryPayment, saveMenu, announce, ticket, setReminders, enablePush, login, logout, refresh, request };
}
export type AppStore = ReturnType<typeof useApp>;
