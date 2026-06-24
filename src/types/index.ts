export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl: string;
  createdAt: string; // ISO date string after JSON serialization
}

export interface ProductsResponse {
  products: Product[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginationParams {
  limit?: number;
  category?: string;
  cursor?: string;
}
