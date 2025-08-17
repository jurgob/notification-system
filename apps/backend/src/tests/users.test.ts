import { expect, test } from "vitest";
// import { promiseWithResolvers } from "../utils/promise_with_resolvers.js";
import {createUserSdk} from "../modules/users/sdk.js";
const API_BASE_URL = process.env.API_BASE_URL as string;


test('GET /users should return status OK, empty list', async () => {
  const usersClient = createUserSdk(API_BASE_URL)
  const response = await usersClient.getUsers();

  expect(response.status).toBe(200);
  expect(response.data).toEqual({users: []});
});

