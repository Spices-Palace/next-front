// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// export const fetchReportByDate = createAsyncThunk(
//   'report/fetchByDate',
//   async ({ date }: { date: string }, { rejectWithValue }) => {
//     const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
//     try {
//       const res = await fetch(`${API_URL}/v1/reports/date/${date}`, {
//         headers: {
//           'Authorization': `Bearer ${localStorage.getItem('token')}`
//         }
//       });
//       if (!res.ok) throw new Error('Failed to fetch report');
//       return await res.json();
//     } catch (err) {
//       if (err instanceof Error) {
//       return rejectWithValue(err.message || 'Unknown error');
//     }
//       return rejectWithValue('Unknown error');
//     }
//   }
// );

// interface ReportState {
//   report: any;
//   loading: boolean;
//   error: string | null;
// }

// const initialState: ReportState = {
//   report: null,
//   loading: false,
//   error: null,
// };

// const reportSlice = createSlice({
//   name: 'report',
//   initialState,
//   reducers: {},
//   extraReducers: builder => {
//     builder
//       .addCase(fetchReportByDate.pending, state => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(fetchReportByDate.fulfilled, (state, action) => {
//         state.loading = false;
//         state.report = action.payload;
//       })
//       .addCase(fetchReportByDate.rejected, (state, action) => {
//         state.loading = false;
//         state.error = (action.payload as string) || 'Failed to fetch report';
//       });
//   },
// });

// export const selectReport = (state: any) => state.report.report;
// export const selectReportLoading = (state: any) => state.report.loading;
// export const selectReportError = (state: any) => state.report.error;

// export default reportSlice.reducer; 