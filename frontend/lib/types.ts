export interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Food {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface BasketItem {
  food: Food;
  quantity: number;
}

export interface Courier {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  food_id: string;
  food_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  restaurant_id: string;
  restaurant_name: string;
  courier_id: string | null;
  courier_name: string;
  courier_phone: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  delivery_address: string;
  delivery_phone: string;
  note: string | null;
  items: OrderItem[];
  customer_name: string;
  customer_phone: string;
  created_at: string;
  updated_at: string;
}

export interface APIResponse<T> {
  data: T;
  error?: { code: string; message: string };
}

export type UserRole = "customer" | "courier" | "admin";

export interface AuthUser {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: string;
  role: UserRole;
}

export interface RegisterResponse {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  access_token: string;
  refresh_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  access_token: string;
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

export interface CreateOrderRequest {
  restaurant_id: string;
  items: { food_id: string; quantity: number }[];
  delivery_address: string;
  delivery_phone: string;
  note?: string;
}

export interface CreateOrderResponse {
  order_id: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
}
