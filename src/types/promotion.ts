export interface Promotion {
  id: number;
  description: string;
  query: string;
  created_at: string;
  updated_at: string;
}

export type PromotionFormData = {
  description: string;
}; 