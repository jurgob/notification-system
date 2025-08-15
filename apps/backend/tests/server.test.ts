import { expect, test, beforeAll, afterAll } from "vitest";
import axios from "axios";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

test('GET /health should return status OK', async () => {
  const response = await axios.get(`${BASE_URL}/health`);

  expect(response.status).toBe(200);
  expect(response.data.kafka).toHaveProperty('status', 'ok');
});

test('GET /users should return status OK, empty list', async () => {
  const response = await axios.get(`${BASE_URL}/users`);

  expect(response.status).toBe(200);
  expect(response.data).toEqual({users: []});
});
