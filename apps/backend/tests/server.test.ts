import { expect, test, beforeAll, afterAll } from "vitest";
import axios from "axios";
import {notificationAppClient,OnDataFunction} from "../src/notificationClient"
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

// type AnyFn = (...args: any[]) => any;

// /**
//  * Returns a wrapped version of `fn`.
//  * The returned promise resolves with the arguments from the first invocation.
//  */
// export function waiFirstInvocation<T extends AnyFn>(
//   fn: T
// ): Promise<Parameters<T>> {
//   return new Promise((resolve) => {
//     const wrapped = (...args: Parameters<T>) => {
//       resolve(args); // resolve on first call
//       return fn(...args); // still call the original function
//     };

//     // Replace fn with wrapped
//     Object.assign(fn, wrapped);
//   });
// }
function promiseWithResolvers<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

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
   let { promise, resolve, reject } = promiseWithResolvers();

  const myCallback: OnDataFunction = (data) => {
    resolve(data)
  }

  const client = await notificationAppClient(
    `${BASE_URL}/notifications/sessions`,
   myCallback
  )

  const key = `NOT-${crypto.randomUUID()}`
  const message = "Welcome to our platform! Your account has been successfully created."
  const notifyEvent = {
    "id": key,
    "userId": `USR-${crypto.randomUUID()}`,
    "channel": "APP",
    "body": message
}


  const responsePromise = axios.post(`${BASE_URL}/notifications`, notifyEvent)
  const receivedEventPromise = promise

  const [response,receivedEvent] = await Promise.all([responsePromise,receivedEventPromise])
  // client.close()
  expect(response.status).toBe(201);
  expect(receivedEvent).toEqual({key, value: message})
});
