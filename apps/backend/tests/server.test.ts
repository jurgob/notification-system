import { expect, test } from "vitest";
import axios from "axios";
import {OnDataFunction,SdkCreateNotification,createNotificationSdk} from "../src/modules/notifications/sdk.js";
import { NotificationData } from "../src/modules/notifications/notificationSSEClient.js";
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

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
  const notificationClient = createNotificationSdk(BASE_URL)
  const { promise, resolve } = promiseWithResolvers<NotificationData>();
  const myCallback: OnDataFunction = (data) => {
    console.log("Received data:", data);
    resolve(data)
  }
  const {close} = await notificationClient.createNotificationsEventStream(myCallback)

  const key = `NOT-${crypto.randomUUID()}`
  const message = "Welcome to our platform! Your account has been successfully created."
  const notifyEvent:SdkCreateNotification = {
    "userId": `USR-${crypto.randomUUID()}`,
    "channel": "APP",
    "body": message
  }
  const responsePromise = notificationClient.sendNotification(notifyEvent)
  const receivedEventPromise = promise
  const [response,receivedEvent] = await Promise.all([responsePromise,receivedEventPromise])

  expect(response.status).toBe(201);
  expect(receivedEvent.value).toBe(message)
});
