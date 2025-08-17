import { expect, test } from "vitest";
// Utility to create a promise with exposed resolve/reject
function promiseWithResolvers<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
import axios from "axios";
import {OnDataFunction,SdkCreateNotification,createNotificationSdk,NotificationEvent} from "../modules/notifications/sdk.js";
import {createUserSdk} from "../modules/users/sdk.js";
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api`;


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

test('POST /notifications APP is working', async () => {
  const notificationClient = createNotificationSdk(BASE_URL)
  const { promise, resolve } = promiseWithResolvers<NotificationEvent>();
  const userId = `USR-${crypto.randomUUID()}`
  const myCallback: OnDataFunction = (data) => {
    console.log("Received data:", data);
    resolve(data)
  }
  const {close} = await notificationClient.createNotificationsEventStream(myCallback,userId)

  const key = `NOT-${crypto.randomUUID()}`
  const message = "Welcome to our platform! Your account has been successfully created."
  const notifyEvent:SdkCreateNotification = {
    "userId": userId,
    "channel": "APP",
    "body": message
  }
  const responsePromise = notificationClient.sendNotification(notifyEvent)
  const receivedEventPromise = promise
  const [response,receivedEvent] = await Promise.all([responsePromise,receivedEventPromise])

  expect(response.status).toBe(201);
  expect(receivedEvent.value).toBe(message)
});


test('POST /notifications APP is working, and is filtered correctly', async () => {
  const notificationClient1 = createNotificationSdk(BASE_URL)
  const notificationClient2 = createNotificationSdk(BASE_URL)
  
  const userId1 = `USR-${crypto.randomUUID()}`
  const userId2 = `USR-${crypto.randomUUID()}`
  const promiseUser1Event = promiseWithResolvers<NotificationEvent>();
  const promiseUser2Event = promiseWithResolvers<NotificationEvent>();

  const user1Callback: OnDataFunction = (data) => {
    promiseUser1Event.resolve(data)
  }
  
  const user2Callback: OnDataFunction = (data) => {
    promiseUser2Event.resolve(data)
  }
  
  await notificationClient1.createNotificationsEventStream(user1Callback,userId1)
  await notificationClient2.createNotificationsEventStream(user2Callback,userId2)
  
  // Send event to user1
  const message1 = "Welcome to our platform! Your account has been successfully created. user 1"
  const notifyEvent1:SdkCreateNotification = {
    "userId": userId1,
    "channel": "APP",
    "body": message1
  }
  const responsePromise1 = notificationClient1.sendNotification(notifyEvent1)

  // Send event to user2
  const message2 = "Welcome to our platform! Your account has been successfully created. user 2"
  const notifyEvent2:SdkCreateNotification = {
    "userId": userId2,
    "channel": "APP",
    "body": message2
  }
  const responsePromise2 = notificationClient2.sendNotification(notifyEvent2)
  const [response1,receivedEvent1, response2, receivedEvent2] = await Promise.all([
    responsePromise1,
    promiseUser1Event.promise, 
    responsePromise2, 
    promiseUser2Event.promise 
  ])
  console.log("promise all after")
  expect(response1.status).toBe(201);
  expect(receivedEvent1.value).toBe(message1)
  expect(response2.status).toBe(201);
  expect(receivedEvent2.value).toBe(message2);
});
