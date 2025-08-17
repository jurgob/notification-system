import { expect, test } from "vitest";
import axios from "axios";
const API_BASE_URL = process.env.API_BASE_URL as string;


test('GET /health should return status OK', async () => {
  const response = await axios.get(`${API_BASE_URL}/health`);

  expect(response.status).toBe(200);
  expect(response.data.kafka).toHaveProperty('status', 'ok');
});

