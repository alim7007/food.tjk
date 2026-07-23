import type {
  APIResponse,
  Category,
  Food,
  Restaurant,
  Courier,
  Order,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  CreateOrderRequest,
  CreateOrderResponse,
} from "./types";

const BASE_URL = "/api/v1";

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const rt = localStorage.getItem("nexara_refresh_token");
      if (!rt) return false;
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) {
        localStorage.removeItem("nexara_refresh_token");
        localStorage.removeItem("nexara_user");
        return false;
      }
      const body: APIResponse<RefreshResponse> = await res.json();
      localStorage.setItem("nexara_refresh_token", body.data.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 401 && endpoint !== "/auth/login" && endpoint !== "/auth/register" && endpoint !== "/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const retryRes = await fetch(url, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...options,
      });
      const retryBody: APIResponse<T> = await retryRes.json();
      if (!retryRes.ok) throw new Error(retryBody.error?.message || `Request failed: ${retryRes.status}`);
      return retryBody.data;
    }
  }

  const body: APIResponse<T> = await res.json();
  if (!res.ok) throw new Error(body.error?.message || `Request failed: ${res.status}`);
  return body.data;
}

export async function fetchRestaurants(search?: string, page = 1, limit = 10): Promise<{ restaurants: Restaurant[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("limit", String(limit));
  return request(`/restaurants?${params}`);
}

export async function fetchRestaurantById(id: string): Promise<Restaurant> {
  return request(`/restaurants/${id}`);
}

export async function fetchFoodsByRestaurant(restaurantId: string): Promise<Food[]> {
  return request(`/restaurants/${restaurantId}/foods`);
}

export async function fetchCategories(): Promise<Category[]> {
  return request("/categories");
}

export async function registerUser(data: RegisterRequest): Promise<RegisterResponse> {
  return request("/auth/register", { method: "POST", body: JSON.stringify(data) });
}

export async function loginUser(data: LoginRequest): Promise<LoginResponse> {
  return request("/auth/login", { method: "POST", body: JSON.stringify(data) });
}

export async function refreshToken(rt: string): Promise<RefreshResponse> {
  return request("/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token: rt }) });
}

export async function logoutUser(rt: string): Promise<void> {
  await request("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: rt }) });
}

export async function createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
  return request("/orders", { method: "POST", body: JSON.stringify(data) });
}

export async function fetchMyOrders(status?: string, page = 1, limit = 10): Promise<{ orders: Order[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(page));
  params.set("limit", String(limit));
  return request(`/orders?${params}`);
}

export async function fetchOrderById(id: string): Promise<Order> {
  return request(`/orders/${id}`);
}

export async function fetchAllOrders(status?: string, page = 1, limit = 20): Promise<{ orders: Order[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(page));
  params.set("limit", String(limit));
  return request(`/admin/orders?${params}`);
}

export async function updateOrderStatus(orderId: string, status: string): Promise<{ status: string }> {
  return request(`/admin/orders/${orderId}/status`, { method: "PUT", body: JSON.stringify({ status }) });
}

export async function assignCourier(orderId: string, courierId: string): Promise<{ message: string }> {
  return request(`/admin/orders/${orderId}/assign`, { method: "PUT", body: JSON.stringify({ courier_id: courierId }) });
}

export async function createRestaurant(name: string, description: string, imageUrl?: string): Promise<Restaurant> {
  return request("/admin/restaurants", { method: "POST", body: JSON.stringify({ name, description, image_url: imageUrl || "" }) });
}

export async function updateRestaurant(id: string, data: { name?: string; description?: string; is_active?: boolean; image_url?: string }): Promise<Restaurant> {
  return request(`/admin/restaurants/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteRestaurant(id: string): Promise<void> {
  await request(`/admin/restaurants/${id}`, { method: "DELETE" });
}

export async function createFood(restaurantId: string, data: { category_id: string; name: string; description: string; price: number; image_url?: string }): Promise<Food> {
  return request(`/admin/restaurants/${restaurantId}/foods`, { method: "POST", body: JSON.stringify(data) });
}

export async function updateFood(foodId: string, data: { category_id?: string; name?: string; description?: string; price?: number; is_available?: boolean; image_url?: string }): Promise<Food> {
  return request(`/admin/foods/${foodId}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteFood(foodId: string): Promise<void> {
  await request(`/admin/foods/${foodId}`, { method: "DELETE" });
}

export async function fetchCouriers(): Promise<Courier[]> {
  return request("/admin/couriers");
}

export async function createCourier(data: { user_id: string; name: string; phone: string }): Promise<Courier> {
  return request("/admin/couriers", { method: "POST", body: JSON.stringify(data) });
}

export async function fetchCourierOrders(status?: string, page = 1, limit = 10): Promise<{ orders: Order[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(page));
  params.set("limit", String(limit));
  return request(`/courier/orders?${params}`);
}
