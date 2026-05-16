import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const USE_MOCKS = true; // Toggle this to false when backend is ready

export const apiClient = axios.create({
  baseURL: 'https://api.rydo.com/v1',
  timeout: 10000,
});

export const mock = USE_MOCKS ? new MockAdapter(apiClient, { delayResponse: 800 }) : null;
