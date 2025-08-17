import { expect, test } from "vitest";
import axios from "axios";
import {OnDataFunction,SdkCreateNotification,createNotificationSdk,NotificationEvent} from "../src/modules/notifications/sdk.js";
import {createUserSdk} from "../src/modules/users/sdk.js";
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
  const usersClient = createUserSdk(BASE_URL)
  const response = await usersClient.getUsers();

  expect(response.status).toBe(200);
  expect(response.data).toEqual({users: []});
});

test.only('POST /notifications is working', async () => {
  const notificationClient = createNotificationSdk(BASE_URL)
  const { promise, resolve } = promiseWithResolvers<NotificationEvent>();
  const userId = `USR-${crypto.randomUUID()}`
  const userId2 = `USR-${crypto.randomUUID()}`
  const myCallback: OnDataFunction = (data) => {
    console.log("Received data:", data);
    resolve(data)
  }
  const {close} = await notificationClient.createNotificationsEventStream(myCallback,userId)

  const key = `NOT-${crypto.randomUUID()}`
  const message = "Welcome to our platform! Your account has been successfully created."
  const notifyEvent:SdkCreateNotification = {
    "userId": userId2,
    "channel": "APP",
    "body": message
  }
  const responsePromise = notificationClient.sendNotification(notifyEvent)
  const receivedEventPromise = promise
  const [response,receivedEvent] = await Promise.all([responsePromise,receivedEventPromise])

  expect(response.status).toBe(201);
  expect(receivedEvent.value).toBe(message)
});
