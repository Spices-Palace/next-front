import { createSlice } from '@reduxjs/toolkit';

export interface Product {
  id: number;
  name: string;
  type: string;
  unit: string;
  cost: number;
  price: number;
  quantity: number;
  barcode: string;
  buyerId: number;
  companyId: string;
  buyer?: { name: string };
}

interface ProductsState {
  items: Product[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  items: [],
  loading: false,
  error: null,
};

// Remove fetchProducts thunk and related extraReducers
// Only keep the slice if you need it for local state, otherwise you can remove the whole file if not used elsewhere

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
});

export default productsSlice.reducer; 