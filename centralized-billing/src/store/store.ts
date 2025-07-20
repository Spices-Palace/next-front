import { configureStore } from '@reduxjs/toolkit';
import productsReducer from './productsSlice';
import salesmenReducer from './salesmenSlice';
import reportReducer from './reportSlice';
import { api, publicApi } from './api';

export const store = configureStore({
  reducer: {
    products: productsReducer,
    salesmen: salesmenReducer,
    report: reportReducer,
    [api.reducerPath]: api.reducer,
    [publicApi.reducerPath]: publicApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware, publicApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 