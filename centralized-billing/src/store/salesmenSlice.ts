import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import Cookies from 'js-cookie';

export interface Salesman {
  id: number;
  name: string;
  phone: string;
  address: string;
  commissionRate: number;
  companyId: string;
  company?: { companyName: string };
}

interface SalesmenState {
  items: Salesman[];
  loading: boolean;
  error: string | null;
}

const initialState: SalesmenState = {
  items: [],
  loading: false,
  error: null,
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SALESMEN_API_URL = BASE_URL + '/v1/salesmen';

export const fetchSalesmen = createAsyncThunk<Salesman[], void, { rejectValue: string }>(
  'salesmen/fetchSalesmen',
  async (_, { rejectWithValue }) => {
    const companyId = Cookies.get('companyId') || '';
    try {
      const res = await fetch(`${SALESMEN_API_URL}?companyId=${companyId}`);
      if (!res.ok) throw new Error('Failed to fetch salesmen');
      return await res.json();
    } catch (err: unknown) {
      if (err instanceof Error) {
        return rejectWithValue(err.message || 'Unknown error');
      }
      return rejectWithValue('Unknown error');
    }
  }
);

const salesmenSlice = createSlice({
  name: 'salesmen',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchSalesmen.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSalesmen.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchSalesmen.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch salesmen';
      });
  },
});

export default salesmenSlice.reducer; 