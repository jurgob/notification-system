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

test('POST /notifications is working', async () => {
  const notifyEvent = {
    "id": "NOT-123e4567-e89b-12d3-a456-426614174000",
    "userId": "USR-123e4567-e89b-12d3-a456-426614174000",
    "channel": "EMAIL",
    "body": "Welcome to our platform! Your account has been successfully created."
}

  const response = await axios.post(`${BASE_URL}/notifications`, notifyEvent);



  expect(response.status).toBe(201);
});
